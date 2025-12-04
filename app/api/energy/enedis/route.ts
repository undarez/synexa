import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";
import { encryptEnedisData, decryptEnedisData } from "@/app/lib/encryption/enedis-encryption";
import { logger } from "@/app/lib/logger";

/**
 * POST - Configure les credentials Enedis avec consentement RGPD
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    // Vérifier le consentement
    if (!body.consentGiven) {
      return NextResponse.json(
        { 
          error: "Le consentement est requis pour utiliser vos données Enedis conformément au RGPD",
          requiresConsent: true 
        },
        { status: 400 }
      );
    }

    // Vérifier que les données requises sont présentes
    if (!body.meterSerialNumber) {
      return NextResponse.json(
        { error: "Le numéro de série du compteur est requis" },
        { status: 400 }
      );
    }

    // Chiffrer les données sensibles
    const encryptedData = encryptEnedisData({
      meterSerialNumber: body.meterSerialNumber,
      rpm: body.rpm || null,
      linkyToken: body.linkyToken || null,
      accessToken: body.accessToken || null,
      refreshToken: body.refreshToken || null,
    });

    // Créer ou mettre à jour les credentials
    const credentials = await prisma.enedisCredentials.upsert({
      where: { userId: user.id },
      update: {
        meterSerialNumber: encryptedData.meterSerialNumber || undefined,
        rpm: encryptedData.rpm || null,
        linkyToken: encryptedData.linkyToken || null,
        accessToken: encryptedData.accessToken || null,
        refreshToken: encryptedData.refreshToken || null,
        pdl: body.pdl || null,
        consentGiven: true,
        consentDate: new Date(),
      },
      create: {
        userId: user.id,
        meterSerialNumber: encryptedData.meterSerialNumber!,
        rpm: encryptedData.rpm || null,
        linkyToken: encryptedData.linkyToken || null,
        accessToken: encryptedData.accessToken || null,
        refreshToken: encryptedData.refreshToken || null,
        pdl: body.pdl || null,
        consentGiven: true,
        consentDate: new Date(),
      },
    });

    // Mettre à jour aussi dans le profil utilisateur (chiffré)
    await prisma.user.update({
      where: { id: user.id },
      data: { meterSerialNumber: encryptedData.meterSerialNumber || null },
    });

    logger.info("Credentials Enedis configurés avec consentement", {
      userId: user.id,
      hasRPM: !!body.rpm,
      consentDate: new Date().toISOString(),
    });

    // Retourner les données sans les valeurs sensibles (pour la sécurité)
    return NextResponse.json({
      success: true,
      credentials: {
        id: credentials.id,
        pdl: credentials.pdl,
        consentGiven: credentials.consentGiven,
        consentDate: credentials.consentDate,
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Erreur configuration Enedis", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * GET - Récupère les credentials Enedis (déchiffrés)
 */
export async function GET() {
  try {
    const user = await requireUser();

    const credentials = await prisma.enedisCredentials.findUnique({
      where: { userId: user.id },
    });

    if (!credentials) {
      return NextResponse.json({
        success: true,
        credentials: null,
      });
    }

    // Déchiffrer les données sensibles
    const decryptedData = decryptEnedisData({
      meterSerialNumber: credentials.meterSerialNumber,
      rpm: credentials.rpm,
      linkyToken: credentials.linkyToken,
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
    });

    // Retourner les données déchiffrées (uniquement pour l'utilisateur authentifié)
    return NextResponse.json({
      success: true,
      credentials: {
        id: credentials.id,
        meterSerialNumber: decryptedData.meterSerialNumber,
        rpm: decryptedData.rpm,
        linkyToken: decryptedData.linkyToken ? "***" : null, // Ne pas exposer le token complet
        hasLinkyToken: !!decryptedData.linkyToken,
        pdl: credentials.pdl,
        consentGiven: credentials.consentGiven,
        consentDate: credentials.consentDate,
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Erreur récupération credentials Enedis", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

