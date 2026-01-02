/**
 * API pour la configuration et la gestion des identifiants SICEA
 * Protégée par TOTP pour les actions sensibles
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";
import { encryptSiceaData, decryptSiceaData } from "@/app/lib/encryption/sicea-encryption";
import { verifyTotpToken } from "@/app/lib/auth/totp";
import { testSiceaConnection } from "@/app/lib/services/sicea-scraper";
import { logSecurityEvent, generateDeviceId } from "@/app/lib/security/protection-layer";
import { logger } from "@/app/lib/logger";

/**
 * GET - Récupère les identifiants SICEA de l'utilisateur (sans les mots de passe)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    const credentials = await prisma.siceaCredentials.findUnique({
      where: { userId: user.id },
    });

    if (!credentials) {
      return NextResponse.json({ credentials: null });
    }

    // Ne jamais renvoyer les mots de passe en clair
    return NextResponse.json({
      credentials: {
        id: credentials.id,
        contractNumber: credentials.contractNumber ? "***" : null, // Masquer
        lastScrapedAt: credentials.lastScrapedAt,
        lastError: credentials.lastError,
        isActive: credentials.isActive,
        consentGiven: credentials.consentGiven,
        consentDate: credentials.consentDate,
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt,
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
    const totpSecret = await prisma.totpSecret.findUnique({
      where: { userId: user.id },
    });

    if (!totpSecret || !totpSecret.isEnabled) {
      return NextResponse.json(
        {
          error: "La double authentification TOTP doit être activée pour configurer SICEA",
          requiresTotpSetup: true,
        },
        { status: 400 }
      );
    }

    // Vérifier le code TOTP
    const isValidTotp = verifyTotpToken(totpSecret.secret, body.totpCode);
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

    // Sauvegarder ou mettre à jour les credentials
    const credentials = await prisma.siceaCredentials.upsert({
      where: { userId: user.id },
      update: {
        username: encryptedData.username || undefined,
        password: encryptedData.password || undefined,
        contractNumber: encryptedData.contractNumber || null,
        consentGiven: true,
        consentDate: new Date(),
        isActive: true,
        lastError: null,
      },
      create: {
        userId: user.id,
        username: encryptedData.username!,
        password: encryptedData.password!,
        contractNumber: encryptedData.contractNumber || null,
        consentGiven: true,
        consentDate: new Date(),
        isActive: true,
      },
    });

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
        id: credentials.id,
        contractNumber: credentials.contractNumber ? "***" : null,
        consentGiven: credentials.consentGiven,
        consentDate: credentials.consentDate,
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt,
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

    const totpSecret = await prisma.totpSecret.findUnique({
      where: { userId: user.id },
    });

    if (!totpSecret || !totpSecret.isEnabled) {
      return NextResponse.json(
        { error: "La double authentification TOTP doit être activée" },
        { status: 400 }
      );
    }

    const isValidTotp = verifyTotpToken(totpSecret.secret, body.totpCode);
    if (!isValidTotp) {
      return NextResponse.json(
        { error: "Code TOTP invalide" },
        { status: 401 }
      );
    }

    // Supprimer les credentials
    await prisma.siceaCredentials.delete({
      where: { userId: user.id },
    });

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

