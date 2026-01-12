/**
 * API pour la gestion de la double authentification TOTP
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";
import { generateTotpSecret, verifyTotpToken, generateTotpQRCode } from "@/app/lib/auth/totp";
import { encrypt } from "@/app/lib/encryption";
import { logSecurityEvent, generateDeviceId } from "@/app/lib/security/protection-layer";
import { logger } from "@/app/lib/logger";

/**
 * GET - Récupère l'état TOTP de l'utilisateur et génère le QR code si nécessaire
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    type TotpSecretData = { isEnabled: boolean; lastUsedAt: string | null; secret: string; [key: string]: unknown };
    const { data: totpSecret, error: totpError } = await supabase
      .from('TotpSecret')
      .select('*')
      .eq('userId', user.id)
      .single();

    if (totpError && totpError.code !== 'PGRST116') {
      logger.error("Erreur récupération secret TOTP", totpError);
    }

    const typedTotpSecret = totpSecret as TotpSecretData | null;

    if (!typedTotpSecret) {
      return NextResponse.json({
        isEnabled: false,
        hasSecret: false,
      });
    }

    // Si TOTP est activé, ne pas renvoyer le QR code (sécurité)
    if (typedTotpSecret.isEnabled) {
      return NextResponse.json({
        isEnabled: true,
        hasSecret: true,
        lastUsedAt: typedTotpSecret.lastUsedAt,
      });
    }

    // Si le secret existe mais n'est pas activé, générer un nouveau QR code
    // (l'utilisateur n'a pas terminé la configuration)
    const { qrCodeUrl } = generateTotpSecret(user.id, user.email || "user");
    const qrCodeDataUrl = await generateTotpQRCode(qrCodeUrl);

    return NextResponse.json({
      isEnabled: false,
      hasSecret: true,
      qrCodeUrl: qrCodeDataUrl,
    });
  } catch (error) {
    logger.error("Erreur récupération TOTP", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * POST - Active ou configure TOTP
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const action = body.action; // "generate" ou "enable"

    if (action === "generate") {
      // Générer un nouveau secret TOTP
      const { secret, encryptedSecret, qrCodeUrl } = generateTotpSecret(
        user.id,
        user.email || "user"
      );

      const now = new Date().toISOString();
      
      // Sauvegarder le secret chiffré (mais pas encore activé)
      await supabase
        .from('TotpSecret')
        .upsert({
          userId: user.id,
          secret: encryptedSecret,
          isEnabled: false,
          updatedAt: now,
        } as any, {
          onConflict: 'userId',
        });

      // Générer le QR code
      const qrCodeDataUrl = await generateTotpQRCode(qrCodeUrl);

      await logSecurityEvent(
        user.id,
        "totp_secret_generated",
        "info",
        {},
        request.headers.get("x-forwarded-for") || undefined,
        request.headers.get("user-agent") || undefined,
        generateDeviceId(request)
      );

      return NextResponse.json({
        success: true,
        qrCodeUrl: qrCodeDataUrl,
        secret: secret, // Renvoyer le secret en clair UNIQUEMENT pour l'affichage manuel si nécessaire
      });
    }

    if (action === "enable") {
      // Activer TOTP après vérification du code
      if (!body.totpCode) {
        return NextResponse.json(
          { error: "Code TOTP requis pour activer la double authentification" },
          { status: 400 }
        );
      }

      type TotpSecretData = { isEnabled: boolean; secret: string; [key: string]: unknown };
      const { data: totpSecret, error: totpFetchError } = await supabase
        .from('TotpSecret')
        .select('*')
        .eq('userId', user.id)
        .single();

      if (totpFetchError && totpFetchError.code !== 'PGRST116') {
        logger.error("Erreur récupération secret TOTP", totpFetchError);
      }

      const typedTotpSecret = totpSecret as TotpSecretData | null;

      if (!typedTotpSecret || !typedTotpSecret.secret) {
        return NextResponse.json(
          { error: "Aucun secret TOTP trouvé. Générez d'abord un secret." },
          { status: 400 }
        );
      }

      // Vérifier le code TOTP
      const isValid = verifyTotpToken(typedTotpSecret.secret, body.totpCode);
      if (!isValid) {
        await logSecurityEvent(
          user.id,
          "totp_verification_failed",
          "warning",
          { action: "enable_totp" },
          request.headers.get("x-forwarded-for") || undefined,
          request.headers.get("user-agent") || undefined,
          generateDeviceId(request)
        );

        return NextResponse.json(
          { error: "Code TOTP invalide" },
          { status: 401 }
        );
      }

      // Activer TOTP
      const now = new Date().toISOString();
      // @ts-ignore - Supabase infère 'never' mais les données sont valides
      await supabase
        .from('TotpSecret')
        // @ts-ignore
        .update({
          isEnabled: true,
          lastUsedAt: now,
          updatedAt: now,
        } as any)
        .eq('userId', user.id);

      await logSecurityEvent(
        user.id,
        "totp_enabled",
        "info",
        {},
        request.headers.get("x-forwarded-for") || undefined,
        request.headers.get("user-agent") || undefined,
        generateDeviceId(request)
      );

      logger.info("TOTP activé", { userId: user.id });

      return NextResponse.json({
        success: true,
        message: "Double authentification activée avec succès",
      });
    }

    return NextResponse.json(
      { error: "Action invalide" },
      { status: 400 }
    );
  } catch (error) {
    logger.error("Erreur configuration TOTP", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Désactive TOTP (nécessite une vérification)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    if (!body.totpCode) {
      return NextResponse.json(
        { error: "Code TOTP requis pour désactiver la double authentification" },
        { status: 400 }
      );
    }

    type TotpSecretData = { isEnabled: boolean; secret: string; [key: string]: unknown };
    const { data: totpSecret, error: totpFetchError } = await supabase
      .from('TotpSecret')
      .select('*')
      .eq('userId', user.id)
      .single();

    if (totpFetchError && totpFetchError.code !== 'PGRST116') {
      logger.error("Erreur récupération secret TOTP", totpFetchError);
    }

    const typedTotpSecret = totpSecret as TotpSecretData | null;

    if (!typedTotpSecret || !typedTotpSecret.isEnabled) {
      return NextResponse.json(
        { error: "TOTP n'est pas activé" },
        { status: 400 }
      );
    }

    // Vérifier le code TOTP
    const isValid = verifyTotpToken(typedTotpSecret.secret, body.totpCode);
    if (!isValid) {
      return NextResponse.json(
        { error: "Code TOTP invalide" },
        { status: 401 }
      );
    }

    // Désactiver TOTP
    // @ts-ignore - Supabase infère 'never' mais les données sont valides
    await supabase
      .from('TotpSecret')
      // @ts-ignore
      .update({
        isEnabled: false,
        updatedAt: new Date().toISOString(),
      } as any)
      .eq('userId', user.id);

    await logSecurityEvent(
      user.id,
      "totp_disabled",
      "warning",
      {},
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined,
      generateDeviceId(request)
    );

    return NextResponse.json({
      success: true,
      message: "Double authentification désactivée",
    });
  } catch (error) {
    logger.error("Erreur désactivation TOTP", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

