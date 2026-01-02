/**
 * API pour la gestion de la double authentification TOTP
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";
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

    const totpSecret = await prisma.totpSecret.findUnique({
      where: { userId: user.id },
    });

    if (!totpSecret) {
      return NextResponse.json({
        isEnabled: false,
        hasSecret: false,
      });
    }

    // Si TOTP est activé, ne pas renvoyer le QR code (sécurité)
    if (totpSecret.isEnabled) {
      return NextResponse.json({
        isEnabled: true,
        hasSecret: true,
        lastUsedAt: totpSecret.lastUsedAt,
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

      // Sauvegarder le secret chiffré (mais pas encore activé)
      await prisma.totpSecret.upsert({
        where: { userId: user.id },
        update: {
          secret: encryptedSecret,
          isEnabled: false,
        },
        create: {
          userId: user.id,
          secret: encryptedSecret,
          isEnabled: false,
        },
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

      const totpSecret = await prisma.totpSecret.findUnique({
        where: { userId: user.id },
      });

      if (!totpSecret || !totpSecret.secret) {
        return NextResponse.json(
          { error: "Aucun secret TOTP trouvé. Générez d'abord un secret." },
          { status: 400 }
        );
      }

      // Vérifier le code TOTP
      const isValid = verifyTotpToken(totpSecret.secret, body.totpCode);
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
      await prisma.totpSecret.update({
        where: { userId: user.id },
        data: {
          isEnabled: true,
          lastUsedAt: new Date(),
        },
      });

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

    const totpSecret = await prisma.totpSecret.findUnique({
      where: { userId: user.id },
    });

    if (!totpSecret || !totpSecret.isEnabled) {
      return NextResponse.json(
        { error: "TOTP n'est pas activé" },
        { status: 400 }
      );
    }

    // Vérifier le code TOTP
    const isValid = verifyTotpToken(totpSecret.secret, body.totpCode);
    if (!isValid) {
      return NextResponse.json(
        { error: "Code TOTP invalide" },
        { status: 401 }
      );
    }

    // Désactiver TOTP
    await prisma.totpSecret.update({
      where: { userId: user.id },
      data: {
        isEnabled: false,
      },
    });

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

