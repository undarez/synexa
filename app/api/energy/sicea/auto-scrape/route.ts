/**
 * API pour le scraping automatique quotidien SICEA
 * Appelée par un cron job (Vercel Cron ou autre)
 * Protégée par CRON_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase/client";
import { decryptSiceaData } from "@/app/lib/encryption/sicea-encryption";
import { scrapeSiceaConsumption } from "@/app/lib/services/sicea-scraper";
import { logger } from "@/app/lib/logger";
import { subDays } from "date-fns";

/**
 * POST - Scraping automatique pour tous les utilisateurs actifs
 * Headers: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier le secret de cron
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupérer tous les utilisateurs avec des credentials SICEA actifs
    const { data: activeCredentials, error: credentialsError } = await supabase
      .from('SiceaCredentials')
      .select('*')
      .eq('isActive', true)
      .eq('consentGiven', true);

    if (credentialsError) {
      logger.error("Erreur récupération credentials SICEA", credentialsError);
    }

    type SiceaCredentialsData = { username: string; password: string; contractNumber: string | null; userId: string; id: string; [key: string]: unknown };
    const results: Record<string, any> = {};

    for (const credentials of (activeCredentials || [])) {
      const typedCredentials = credentials as SiceaCredentialsData;
      try {
        // Déchiffrer les identifiants
        const decrypted = decryptSiceaData({
          username: typedCredentials.username,
          password: typedCredentials.password,
          contractNumber: typedCredentials.contractNumber,
        });

        if (!decrypted.username || !decrypted.password) {
          results[typedCredentials.userId] = {
            success: false,
            error: "Impossible de déchiffrer les identifiants",
          };
          continue;
        }

        // Scraper les 7 derniers jours (pour s'assurer d'avoir les données à jour)
        const endDate = new Date();
        const startDate = subDays(endDate, 7);

        const now = new Date().toISOString();
        
        // Créer un job
        // @ts-ignore - Supabase infère 'never' mais les données sont valides
        const { data: job, error: jobError } = await supabase
          .from('SiceaScrapingJob')
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
          results[typedCredentials.userId] = {
            success: false,
            error: "Erreur lors de la création du job",
          };
          continue;
        }

        // Lancer le scraping
        const scrapeResult = await scrapeSiceaConsumption(
          decrypted.username,
          decrypted.password,
          decrypted.contractNumber || undefined,
          startDate,
          endDate
        );

        type JobData = { id: string };
        const typedJob = job as JobData;
        type CredentialsData = { id: string; userId: string; [key: string]: unknown };
        const typedCredentialsForUpdate = typedCredentials as CredentialsData;

        if (scrapeResult.success && scrapeResult.data) {
          const now = new Date().toISOString();
          
          // Sauvegarder les données
          const consumptionsToUpsert = scrapeResult.data.map((consumption) => ({
            userId: typedCredentials.userId,
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

          // @ts-ignore - Supabase infère 'never' mais les données sont valides
          await supabase
            .from('EnergyConsumption')
            .upsert(consumptionsToUpsert as any, {
              onConflict: 'userId,date',
            });

          // Mettre à jour le job
          await supabase
            .from('SiceaScrapingJob')
            // @ts-ignore - Supabase infère 'never' mais les données sont valides
            .update({
              status: "success",
              completedAt: now,
              dataRetrieved: scrapeResult.data,
              metadata: scrapeResult.metadata || null,
              updatedAt: now,
            } as any)
            .eq('id', typedJob.id);

          // Mettre à jour les credentials
          await supabase
            .from('SiceaCredentials')
            // @ts-ignore - Supabase infère 'never' mais les données sont valides
            .update({
              lastScrapedAt: now,
              lastError: null,
              updatedAt: now,
            } as any)
            .eq('id', typedCredentialsForUpdate.id);

          results[typedCredentialsForUpdate.userId] = {
            success: true,
            recordsCount: scrapeResult.data.length,
          };
        } else {
          // Échec
          const now = new Date().toISOString();
          await supabase
            .from('SiceaScrapingJob')
            // @ts-ignore - Supabase infère 'never' mais les données sont valides
            .update({
              status: "failed",
              completedAt: now,
              error: scrapeResult.error || "Erreur inconnue",
              updatedAt: now,
            } as any)
            .eq('id', typedJob.id);

          const updateData: Record<string, unknown> = {
            lastError: scrapeResult.error || "Erreur inconnue",
            updatedAt: now,
          };
          // @ts-ignore - Supabase infère 'never' mais les données sont valides
          await supabase
            .from('SiceaCredentials')
            // @ts-ignore
            .update(updateData as any)
            .eq('id', typedCredentialsForUpdate.id);

          results[typedCredentialsForUpdate.userId] = {
            success: false,
            error: scrapeResult.error,
          };
        }
      } catch (error) {
        results[typedCredentials.userId] = {
          success: false,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        };
      }
    }

    return NextResponse.json({
      success: true,
      usersProcessed: (activeCredentials || []).length,
      results,
    });
  } catch (error) {
    logger.error("Erreur scraping automatique SICEA", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}

