import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";
import { encryptSiceaData } from "@/app/lib/encryption/sicea-encryption";
import { testSiceaConnection } from "@/app/lib/services/sicea-scraper";
import { logSecurityEvent, generateDeviceId } from "@/app/lib/security/protection-layer";
import { logger } from "@/app/lib/logger";
import { generateId } from "@/app/lib/supabase/helpers";

/**
 * POST /api/energy/sicea/connect
 * Endpoint pour connecter SICEA (selon recommandations GPT)
 * 
 * Body: { login: string, password: string, prm?: string, consentGiven: boolean }
 * Response: { success: boolean, credentials: {...} }
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
    if (!body.login || !body.password) {
      return NextResponse.json(
        { error: "Le login et le mot de passe sont requis" },
        { status: 400 }
      );
    }

    const login = body.login.trim();
    const password = body.password.trim();
    const prm = body.prm ? body.prm.trim() : null;

    // Tester la connexion au portail SICEA avec PRM si fourni (optionnel)
    // NOTE: Le test est optionnel - les identifiants seront validés lors du premier scraping
    logger.info("Enregistrement identifiants SICEA", {
      userId: user.id,
      hasPRM: !!prm,
    });

    // Test de connexion optionnel (non bloquant)
    // Si le test échoue, on enregistre quand même les identifiants
    // Ils seront validés lors du premier scraping automatique
    let connectionTestResult: { success: boolean; error?: string; skipTest?: boolean } | null = null;
    
    try {
      connectionTestResult = await testSiceaConnection(login, password, prm || undefined);
      
      if (connectionTestResult.skipTest) {
        logger.info("Playwright non disponible, connexion SICEA enregistrée sans test", {
          userId: user.id,
        });
      } else if (connectionTestResult.success) {
        logger.info("Test connexion SICEA réussi", {
          userId: user.id,
        });
      } else {
        // Test échoué mais on continue quand même (validation lors du scraping)
        logger.warn("Test connexion SICEA échoué, mais on enregistre quand même", {
          userId: user.id,
          error: connectionTestResult.error,
        });
      }
    } catch (error) {
      // Si le test échoue pour une raison technique, on continue quand même
      logger.warn("Test connexion SICEA échoué (erreur technique), mais on continue", {
        userId: user.id,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      });
      // On continue sans tester la connexion (le scraping sera fait plus tard par un worker)
    }

    // Chiffrer les identifiants immédiatement (AES-256)
    const encryptedData = encryptSiceaData({
      username: login,
      password: password,
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

    // Enregistrer l'événement de sécurité
    await logSecurityEvent(
      user.id,
      "sicea_connected",
      "info",
      { hasPRM: !!prm },
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined,
      generateDeviceId(request)
    );

    logger.info("SICEA connecté avec succès", {
      userId: user.id,
      hasPRM: !!prm,
      consentDate: new Date().toISOString(),
      testResult: connectionTestResult?.success ? "success" : connectionTestResult?.skipTest ? "skipped" : "failed",
    });

    type CredentialsResponse = {
      id: string;
      contractNumber: string | null;
      consentGiven: boolean;
      consentDate: string | null;
      isActive: boolean;
      createdAt: string | null;
      updatedAt: string | null;
    };
    const typedCredentials = credentials as CredentialsResponse;

    // Retourner les données sans les valeurs sensibles
    return NextResponse.json({
      success: true,
      credentials: {
        id: typedCredentials.id,
        contractNumber: typedCredentials.contractNumber ? "***" : null,
        hasPRM: !!typedCredentials.contractNumber,
        consentGiven: typedCredentials.consentGiven,
        consentDate: typedCredentials.consentDate,
        isActive: typedCredentials.isActive,
        createdAt: typedCredentials.createdAt,
        updatedAt: typedCredentials.updatedAt,
      },
      // Informer l'utilisateur sur le statut du test
      testStatus: connectionTestResult?.skipTest 
        ? "skipped" 
        : connectionTestResult?.success 
        ? "success" 
        : "pending", // Le test sera fait lors du premier scraping
      message: connectionTestResult?.skipTest
        ? "Identifiants enregistrés. Le scraping sera effectué automatiquement par un worker dédié."
        : connectionTestResult?.success
        ? "Connexion testée avec succès. Les données seront récupérées automatiquement."
        : "Identifiants enregistrés. La validation se fera lors du premier scraping automatique.",
    });
  } catch (error) {
    logger.error("Erreur connexion SICEA", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

