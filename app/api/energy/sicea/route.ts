/**
 * API pour la configuration et la gestion des identifiants SICEA
 * Protégée par TOTP pour les actions sensibles
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";
import { encryptSiceaData } from "@/app/lib/encryption/sicea-encryption";
import { verifyTotpToken } from "@/app/lib/auth/totp";
import { testSiceaConnection } from "@/app/lib/services/sicea-scraper";
import { logSecurityEvent, generateDeviceId } from "@/app/lib/security/protection-layer";
import { logger } from "@/app/lib/logger";
import { generateId } from "@/app/lib/supabase/helpers";

type TotpSecretData = {
  id: string;
  userId: string;
  secret: string;
  isEnabled: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * GET - Récupère les identifiants SICEA de l'utilisateur (sans les mots de passe)
 */
export async function GET() {
  try {
    const user = await requireUser();

    const { data: credentials, error: fetchError } = await supabase
      .from('SiceaCredentials')
      .select('*')
      .eq('userId', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.error("Erreur récupération credentials SICEA", fetchError);
    }

    type CredentialsResponse = {
      id: string;
      contractNumber: string | null;
      lastScrapedAt: string | null;
      lastError: string | null;
      isActive: boolean;
      consentGiven: boolean;
      consentDate: string | null;
      createdAt: string | null;
      updatedAt: string | null;
    };

    if (!credentials) {
      return NextResponse.json({ credentials: null });
    }

    const typedCredentials = credentials as CredentialsResponse;

    // Ne jamais renvoyer les mots de passe en clair
    return NextResponse.json({
      credentials: {
        id: typedCredentials.id,
        contractNumber: typedCredentials.contractNumber ? "***" : null, // Masquer
        lastScrapedAt: typedCredentials.lastScrapedAt,
        lastError: typedCredentials.lastError,
        isActive: typedCredentials.isActive,
        consentGiven: typedCredentials.consentGiven,
        consentDate: typedCredentials.consentDate,
        createdAt: typedCredentials.createdAt,
        updatedAt: typedCredentials.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Erreur récupération credentials SICEA", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * POST - Configure ou met à jour les identifiants SICEA
 * Nécessite une vérification TOTP
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    // Vérifier le consentement RGPD
    if (!body.consentGiven) {
      return NextResponse.json(
        {
          error: "Le consentement est requis pour utiliser vos données SICEA conformément au RGPD",
          requiresConsent: true,
        },
        { status: 400 }
      );
    }

    // Vérifier les champs requis
    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: "Le nom d'utilisateur et le mot de passe sont requis" },
        { status: 400 }
      );
    }

    // PRM (Point de Référence de Mesure) - optionnel mais recommandé
    const prm = body.prm || body.contractNumber || null;

    // Vérifier le code TOTP (obligatoire pour cette action sensible)
    if (!body.totpCode) {
      return NextResponse.json(
        {
          error: "Code TOTP requis pour configurer les identifiants SICEA",
          requiresTotp: true,
        },
        { status: 400 }
      );
    }

    // Récupérer le secret TOTP de l'utilisateur
    const { data: totpSecret, error: totpError } = await supabase
      .from('TotpSecret')
      .select('*')
      .eq('userId', user.id)
      .single();

    if (totpError && totpError.code !== 'PGRST116') {
      logger.error("Erreur récupération secret TOTP", totpError);
    }

    const typedTotpSecret = totpSecret as TotpSecretData | null;

    if (!typedTotpSecret || !typedTotpSecret.isEnabled) {
      return NextResponse.json(
        {
          error: "La double authentification TOTP doit être activée pour configurer SICEA",
          requiresTotpSetup: true,
        },
        { status: 400 }
      );
    }

    // Vérifier le code TOTP
    const isValidTotp = verifyTotpToken(typedTotpSecret.secret, body.totpCode);
    if (!isValidTotp) {
      await logSecurityEvent(
        user.id,
        "totp_verification_failed",
        "warning",
        { action: "add_sicea_credentials" },
        request.headers.get("x-forwarded-for") || undefined,
        request.headers.get("user-agent") || undefined,
        generateDeviceId(request)
      );

      return NextResponse.json(
        { error: "Code TOTP invalide" },
        { status: 401 }
      );
    }

    // Tester la connexion au portail SICEA avec PRM si fourni
    const connectionTest = await testSiceaConnection(body.username, body.password, prm || undefined);
    if (!connectionTest.success) {
      return NextResponse.json(
        {
          error: "Échec de la connexion au portail SICEA. Vérifiez vos identifiants.",
          details: connectionTest.error,
        },
        { status: 400 }
      );
    }

    // Chiffrer les identifiants (PRM stocké comme contractNumber)
    const encryptedData = encryptSiceaData({
      username: body.username,
      password: body.password,
      contractNumber: prm, // PRM stocké dans contractNumber
    });

    const now = new Date().toISOString();
    
    // Vérifier si des credentials existent déjà pour cet utilisateur
    type ExistingCredentials = { id: string };
    const { data: existingCredentials } = await supabase
      .from('SiceaCredentials')
      .select('id')
      .eq('userId', user.id)
      .single();
    
    // Générer un ID si nécessaire
    const typedExistingCredentials = existingCredentials as ExistingCredentials | null;
    const credentialsId = typedExistingCredentials?.id || generateId();
    
    // Sauvegarder ou mettre à jour les credentials
    // @ts-ignore - Supabase infère 'never' mais les données sont valides
    const { data: credentials, error: upsertError } = await supabase
      .from('SiceaCredentials')
      .upsert({
        id: credentialsId,
        userId: user.id,
        username: encryptedData.username || null,
        password: encryptedData.password || null,
        contractNumber: encryptedData.contractNumber || null,
        consentGiven: true,
        consentDate: now,
        isActive: true,
        lastError: null,
        updatedAt: now,
      } as any, {
        onConflict: 'userId',
      })
      .select()
      .single();

    if (upsertError || !credentials) {
      logger.error("Erreur upsert credentials SICEA", upsertError);
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde des credentials', details: upsertError?.message },
        { status: 500 }
      );
    }

    type CredentialsResponse = {
      id: string;
      contractNumber: string | null;
      consentGiven: boolean;
      consentDate: string | null;
      createdAt: string | null;
      updatedAt: string | null;
    };
    const typedCredentials = credentials as CredentialsResponse;

    // Enregistrer l'événement de sécurité
    await logSecurityEvent(
      user.id,
      "sicea_credentials_added",
      "info",
      { hasContractNumber: !!body.contractNumber },
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined,
      generateDeviceId(request)
    );

    logger.info("Credentials SICEA configurés", {
      userId: user.id,
      consentDate: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      credentials: {
        id: typedCredentials.id,
        contractNumber: typedCredentials.contractNumber ? "***" : null,
        consentGiven: typedCredentials.consentGiven,
        consentDate: typedCredentials.consentDate,
        createdAt: typedCredentials.createdAt,
        updatedAt: typedCredentials.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Erreur configuration SICEA", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Supprime les identifiants SICEA
 * Nécessite une vérification TOTP
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    // Vérifier le code TOTP
    if (!body.totpCode) {
      return NextResponse.json(
        {
          error: "Code TOTP requis pour supprimer les identifiants SICEA",
          requiresTotp: true,
        },
        { status: 400 }
      );
    }

    const { data: totpSecret, error: totpError } = await supabase
      .from('TotpSecret')
      .select('*')
      .eq('userId', user.id)
      .single();

    if (totpError && totpError.code !== 'PGRST116') {
      logger.error("Erreur récupération secret TOTP", totpError);
    }

    const typedTotpSecretDelete = totpSecret as TotpSecretData | null;

    if (!typedTotpSecretDelete || !typedTotpSecretDelete.isEnabled) {
      return NextResponse.json(
        { error: "La double authentification TOTP doit être activée" },
        { status: 400 }
      );
    }

    const isValidTotp = verifyTotpToken(typedTotpSecretDelete.secret, body.totpCode);
    if (!isValidTotp) {
      return NextResponse.json(
        { error: "Code TOTP invalide" },
        { status: 401 }
      );
    }

    // Supprimer les credentials
    const { error: deleteError } = await supabase
      .from('SiceaCredentials')
      .delete()
      .eq('userId', user.id);

    if (deleteError) {
      logger.error("Erreur suppression credentials SICEA", deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression des credentials', details: deleteError.message },
        { status: 500 }
      );
    }

    await logSecurityEvent(
      user.id,
      "sicea_credentials_deleted",
      "info",
      {},
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined,
      generateDeviceId(request)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Erreur suppression credentials SICEA", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

