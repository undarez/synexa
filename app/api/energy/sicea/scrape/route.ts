/**
 * API pour déclencher manuellement le scraping SICEA
 * Protégée par TOTP et pare-feu
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";
import { decryptSiceaData } from "@/app/lib/encryption/sicea-encryption";
import { scrapeSiceaConsumption } from "@/app/lib/services/sicea-scraper";
import { verifyTotpToken } from "@/app/lib/auth/totp";
import { logSecurityEvent, generateDeviceId } from "@/app/lib/security/protection-layer";
import { firewallMiddleware } from "@/app/lib/security/firewall";
import { logger } from "@/app/lib/logger";
import { subDays, format } from "date-fns";

/**
 * POST - Déclenche le scraping SICEA
 * Nécessite une vérification TOTP
 */
export async function POST(request: NextRequest) {
  try {
    // Appliquer le pare-feu
    const firewallResult = await firewallMiddleware()(request);
    if (firewallResult) {
      return firewallResult;
    }

    const user = await requireUser();
    const body = await request.json();

    // Vérifier le code TOTP
    if (!body.totpCode) {
      return NextResponse.json(
        {
          error: "Code TOTP requis pour déclencher le scraping SICEA",
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

    type TotpSecretData = { isEnabled: boolean; secret: string; [key: string]: unknown };
    const typedTotpSecret = totpSecret as TotpSecretData | null;

    if (!typedTotpSecret || !typedTotpSecret.isEnabled) {
      return NextResponse.json(
        { error: "La double authentification TOTP doit être activée" },
        { status: 400 }
      );
    }

    const isValidTotp = verifyTotpToken(typedTotpSecret.secret, body.totpCode);
    if (!isValidTotp) {
      await logSecurityEvent(
        user.id,
        "totp_verification_failed",
        "warning",
        { action: "sicea_scrape" },
        request.headers.get("x-forwarded-for") || undefined,
        request.headers.get("user-agent") || undefined,
        generateDeviceId(request)
      );

      return NextResponse.json(
        { error: "Code TOTP invalide" },
        { status: 401 }
      );
    }

    // Récupérer les credentials SICEA
    const { data: credentials, error: credentialsError } = await supabase
      .from('SiceaCredentials')
      .select('*')
      .eq('userId', user.id)
      .single();

    if (credentialsError && credentialsError.code !== 'PGRST116') {
      logger.error("Erreur récupération credentials SICEA", credentialsError);
    }

    type SiceaCredentialsData = { isActive: boolean; username: string; password: string; contractNumber: string | null; id: string; userId: string; [key: string]: unknown };
    const typedCredentials = credentials as SiceaCredentialsData | null;

    if (!typedCredentials || !typedCredentials.isActive) {
      return NextResponse.json(
        { error: "Identifiants SICEA non configurés ou inactifs" },
        { status: 400 }
      );
    }

    // Déchiffrer les identifiants
    const decrypted = decryptSiceaData({
      username: typedCredentials.username,
      password: typedCredentials.password,
      contractNumber: typedCredentials.contractNumber || null,
    });

    if (!decrypted.username || !decrypted.password) {
      return NextResponse.json(
        { error: "Impossible de déchiffrer les identifiants SICEA" },
        { status: 500 }
      );
    }

    // Déterminer la période à scraper
    const endDate = new Date();
    const startDate = body.startDate
      ? new Date(body.startDate)
      : subDays(endDate, body.days || 7); // Par défaut, 7 derniers jours

    // Créer un job de scraping
    const now = new Date().toISOString();
    // @ts-ignore - Supabase infère 'never' mais les données sont valides
    const { data: job, error: jobError } = await supabase
      .from('SiceaScrapingJob')
      // @ts-ignore
      .insert({
        credentialsId: typedCredentials.id,
        status: "running",
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      } as any)
      .select()
      .single();

    if (jobError || !job) {
      logger.error("Erreur création job scraping", jobError);
      return NextResponse.json(
        { error: 'Erreur lors de la création du job', details: jobError?.message },
        { status: 500 }
      );
    }

    type JobData = { id: string };
    const typedJob = job as JobData;

    // Lancer le scraping en arrière-plan (non bloquant)
    scrapeSiceaConsumption(
      decrypted.username,
      decrypted.password,
      decrypted.contractNumber || undefined,
      startDate,
      endDate
    )
      .then(async (result) => {
        if (result.success && result.data) {
          // Sauvegarder les données dans EnergyConsumption
          const now = new Date().toISOString();
          const consumptionsToUpsert = result.data.map((consumption) => ({
            userId: user.id,
            date: new Date(consumption.date).toISOString(),
            value: consumption.consumption,
            cost: consumption.cost,
            peakHours: consumption.peakHours,
            offPeakHours: consumption.offPeakHours,
            source: "sicea",
            metadata: {
              maxPower: consumption.maxPower,
              halfHourlyData: consumption.halfHourlyData,
            },
            updatedAt: now,
          }));

          await supabase
            .from('EnergyConsumption')
            // @ts-expect-error - Le type Database.Update est any, mais TypeScript ne l'infère pas correctement
            .upsert(consumptionsToUpsert, {
              onConflict: 'userId,date',
            });

          // Mettre à jour le job
          // @ts-ignore - Supabase infère 'never' mais les données sont valides
          await supabase
            .from('SiceaScrapingJob')
            // @ts-ignore
            .update({
              status: "success",
              completedAt: now,
              dataRetrieved: result.data,
              metadata: result.metadata || null,
              updatedAt: now,
            } as any)
            .eq('id', typedJob.id);

          // Mettre à jour les credentials
          // @ts-ignore - Supabase infère 'never' mais les données sont valides
          await supabase
            .from('SiceaCredentials')
            // @ts-ignore
            .update({
              lastScrapedAt: now,
              lastError: null,
              updatedAt: now,
            } as any)
            .eq('id', typedCredentials.id);

          logger.info("Scraping SICEA réussi", {
            userId: user.id,
            recordsCount: result.data.length,
          });
        } else {
          // Échec du scraping
          const now = new Date().toISOString();
          type JobData = { id: string };
          const typedJob = job as JobData;
          type CredentialsData = { id: string };
          const typedCredentialsForUpdate = typedCredentials as CredentialsData;

          // @ts-ignore - Supabase infère 'never' mais les données sont valides
          await supabase
            .from('SiceaScrapingJob')
            // @ts-ignore
            .update({
              status: "failed",
              completedAt: now,
              error: result.error || "Erreur inconnue",
              updatedAt: now,
            } as any)
            .eq('id', typedJob.id);

          // @ts-ignore - Supabase infère 'never' mais les données sont valides
          await supabase
            .from('SiceaCredentials')
            // @ts-ignore
            .update({
              lastError: result.error || "Erreur inconnue",
              updatedAt: now,
            } as any)
            .eq('id', typedCredentialsForUpdate.id);

          logger.error("Scraping SICEA échoué", {
            userId: user.id,
            error: result.error,
          });
        }
      })
      .catch(async (error) => {
        const now = new Date().toISOString();
        type JobData = { id: string };
        const typedJob = job as JobData;
        // @ts-ignore - Supabase infère 'never' mais les données sont valides
        await supabase
          .from('SiceaScrapingJob')
          // @ts-ignore
          .update({
            status: "failed",
            completedAt: now,
            error: error instanceof Error ? error.message : "Erreur inconnue",
            updatedAt: now,
          } as any)
          .eq('id', typedJob.id);

        logger.error("Erreur scraping SICEA", error);
      });

    await logSecurityEvent(
      user.id,
      "sicea_scrape_triggered",
      "info",
      { jobId: typedJob.id, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined,
      generateDeviceId(request)
    );

    return NextResponse.json({
      success: true,
      message: "Scraping SICEA démarré en arrière-plan",
      jobId: typedJob.id,
    });
  } catch (error) {
    logger.error("Erreur déclenchement scraping SICEA", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

