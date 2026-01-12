import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";
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

    const now = new Date().toISOString();
    
    // Créer ou mettre à jour les credentials
    const { data: credentials, error: upsertError } = await supabase
      .from('EnedisCredentials')
      // @ts-expect-error - Le type Database.Update est any, mais TypeScript ne l'infère pas correctement
      .upsert({
        userId: user.id,
        meterSerialNumber: encryptedData.meterSerialNumber || null,
        rpm: encryptedData.rpm || null,
        linkyToken: encryptedData.linkyToken || null,
        accessToken: encryptedData.accessToken || null,
        refreshToken: encryptedData.refreshToken || null,
        pdl: body.pdl || null,
        consentGiven: true,
        consentDate: now,
        updatedAt: now,
      }, {
        onConflict: 'userId',
      })
      .select()
      .single();

    if (upsertError || !credentials) {
      logger.error("Erreur upsert credentials Enedis", upsertError);
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde des credentials', details: upsertError?.message },
        { status: 500 }
      );
    }

    // Mettre à jour aussi dans le profil utilisateur (chiffré)
    await supabase
      .from('User')
      // @ts-ignore - Supabase infère 'never' mais les données sont valides
      .update({
        meterSerialNumber: encryptedData.meterSerialNumber || null,
        updatedAt: now,
      } as any)
      .eq('id', user.id);

    logger.info("Credentials Enedis configurés avec consentement", {
      userId: user.id,
      hasRPM: !!body.rpm,
      consentDate: new Date().toISOString(),
    });

    type CredentialsData = { id: string; pdl: string | null; consentGiven: boolean; consentDate: string | null; createdAt: string | null; updatedAt: string | null; [key: string]: unknown };
    const typedCredentials = credentials as CredentialsData;

    // Retourner les données sans les valeurs sensibles (pour la sécurité)
    return NextResponse.json({
      success: true,
      credentials: {
        id: typedCredentials.id,
        pdl: typedCredentials.pdl,
        consentGiven: typedCredentials.consentGiven,
        consentDate: typedCredentials.consentDate,
        createdAt: typedCredentials.createdAt,
        updatedAt: typedCredentials.updatedAt,
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

    type EnedisCredentialsData = { 
      meterSerialNumber: string | null; 
      rpm: string | null; 
      linkyToken: string | null; 
      accessToken: string | null; 
      refreshToken: string | null; 
      [key: string]: unknown 
    };

    const { data: credentials, error: fetchError } = await supabase
      .from('EnedisCredentials')
      .select('*')
      .eq('userId', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.error("Erreur récupération credentials Enedis", fetchError);
    }

    const typedCredentials = credentials as EnedisCredentialsData | null;

    if (!typedCredentials) {
      return NextResponse.json({
        success: true,
        credentials: null,
      });
    }

    // Déchiffrer les données sensibles
    const decryptedData = decryptEnedisData({
      meterSerialNumber: typedCredentials.meterSerialNumber,
      rpm: typedCredentials.rpm,
      linkyToken: typedCredentials.linkyToken,
      accessToken: typedCredentials.accessToken,
      refreshToken: typedCredentials.refreshToken,
    });

    type CredentialsResponseData = { id: string; pdl: string | null; consentGiven: boolean; consentDate: string | null; createdAt: string | null; updatedAt: string | null; [key: string]: unknown };
    const typedCredentialsResponse = typedCredentials as unknown as CredentialsResponseData;

    // Retourner les données déchiffrées (uniquement pour l'utilisateur authentifié)
    return NextResponse.json({
      success: true,
      credentials: {
        id: typedCredentialsResponse.id,
        meterSerialNumber: decryptedData.meterSerialNumber,
        rpm: decryptedData.rpm,
        linkyToken: decryptedData.linkyToken ? "***" : null, // Ne pas exposer le token complet
        hasLinkyToken: !!decryptedData.linkyToken,
        pdl: typedCredentialsResponse.pdl,
        consentGiven: typedCredentialsResponse.consentGiven,
        consentDate: typedCredentialsResponse.consentDate,
        createdAt: typedCredentialsResponse.createdAt,
        updatedAt: typedCredentialsResponse.updatedAt,
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

