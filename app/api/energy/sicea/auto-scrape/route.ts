/**
 * API pour le scraping automatique quotidien SICEA
 * Appelée par un cron job (Vercel Cron ou autre)
 * Protégée par CRON_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { decryptSiceaData } from "@/app/lib/encryption/sicea-encryption";
import { scrapeSiceaConsumption } from "@/app/lib/services/sicea-scraper";
import { logger } from "@/app/lib/logger";
import { subDays } from "date-fns";
import { toJsonInput } from "@/app/lib/prisma/json";

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
    const activeCredentials = await prisma.siceaCredentials.findMany({
      where: {
        isActive: true,
        consentGiven: true,
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    const results: Record<string, any> = {};

    for (const credentials of activeCredentials) {
      try {
        // Déchiffrer les identifiants
        const decrypted = decryptSiceaData({
          username: credentials.username,
          password: credentials.password,
          contractNumber: credentials.contractNumber,
        });

        if (!decrypted.username || !decrypted.password) {
          results[credentials.userId] = {
            success: false,
            error: "Impossible de déchiffrer les identifiants",
          };
          continue;
        }

        // Scraper les 7 derniers jours (pour s'assurer d'avoir les données à jour)
        const endDate = new Date();
        const startDate = subDays(endDate, 7);

        // Créer un job
        const job = await prisma.siceaScrapingJob.create({
          data: {
            credentialsId: credentials.id,
            status: "running",
          },
        });

        // Lancer le scraping
            const scrapeResult = await scrapeSiceaConsumption(
              decrypted.username,
              decrypted.password,
              decrypted.contractNumber || undefined,
              startDate,
              endDate
            );

        if (scrapeResult.success && scrapeResult.data) {
          // Sauvegarder les données
          for (const consumption of scrapeResult.data) {
            await prisma.energyConsumption.upsert({
              where: {
                userId_date: {
                  userId: credentials.userId,
                  date: new Date(consumption.date),
                },
              },
              update: {
                value: consumption.consumption,
                cost: consumption.cost,
                peakHours: consumption.peakHours,
                offPeakHours: consumption.offPeakHours,
                source: "sicea",
                metadata: {
                  maxPower: consumption.maxPower,
                  halfHourlyData: consumption.halfHourlyData,
                },
              },
              create: {
                userId: credentials.userId,
                date: new Date(consumption.date),
                value: consumption.consumption,
                cost: consumption.cost,
                peakHours: consumption.peakHours,
                offPeakHours: consumption.offPeakHours,
                source: "sicea",
                metadata: {
                  maxPower: consumption.maxPower,
                  halfHourlyData: consumption.halfHourlyData,
                },
              },
            });
          }

          // Mettre à jour le job
          await prisma.siceaScrapingJob.update({
            where: { id: job.id },
            data: {
              status: "success",
              completedAt: new Date(),
              dataRetrieved: toJsonInput(scrapeResult.data),
              metadata: scrapeResult.metadata ? toJsonInput(scrapeResult.metadata) : undefined,
            },
          });

          // Mettre à jour les credentials
          await prisma.siceaCredentials.update({
            where: { id: credentials.id },
            data: {
              lastScrapedAt: new Date(),
              lastError: null,
            },
          });

          results[credentials.userId] = {
            success: true,
            recordsCount: scrapeResult.data.length,
          };
        } else {
          // Échec
          await prisma.siceaScrapingJob.update({
            where: { id: job.id },
            data: {
              status: "failed",
              completedAt: new Date(),
              error: scrapeResult.error,
            },
          });

          await prisma.siceaCredentials.update({
            where: { id: credentials.id },
            data: {
              lastError: scrapeResult.error || "Erreur inconnue",
            },
          });

          results[credentials.userId] = {
            success: false,
            error: scrapeResult.error,
          };
        }
      } catch (error) {
        results[credentials.userId] = {
          success: false,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        };
      }
    }

    return NextResponse.json({
      success: true,
      usersProcessed: activeCredentials.length,
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

