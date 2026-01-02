/**
 * API pour déclencher manuellement le scraping SICEA
 * Protégée par TOTP et pare-feu
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";
import { decryptSiceaData } from "@/app/lib/encryption/sicea-encryption";
import { scrapeSiceaConsumption } from "@/app/lib/services/sicea-scraper";
import { verifyTotpToken } from "@/app/lib/auth/totp";
import { logSecurityEvent, generateDeviceId } from "@/app/lib/security/protection-layer";
import { firewallMiddleware } from "@/app/lib/security/firewall";
import { logger } from "@/app/lib/logger";
import { subDays, format } from "date-fns";
import { toJsonInput } from "@/app/lib/prisma/json";

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
    const credentials = await prisma.siceaCredentials.findUnique({
      where: { userId: user.id },
    });

    if (!credentials || !credentials.isActive) {
      return NextResponse.json(
        { error: "Identifiants SICEA non configurés ou inactifs" },
        { status: 400 }
      );
    }

    // Déchiffrer les identifiants
    const decrypted = decryptSiceaData({
      username: credentials.username,
      password: credentials.password,
      contractNumber: credentials.contractNumber,
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
    const job = await prisma.siceaScrapingJob.create({
      data: {
        credentialsId: credentials.id,
        status: "running",
      },
    });

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
          for (const consumption of result.data) {
            await prisma.energyConsumption.upsert({
              where: {
                userId_date: {
                  userId: user.id,
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
                userId: user.id,
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
              dataRetrieved: toJsonInput(result.data),
              metadata: toJsonInput(result.metadata),
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

          logger.info("Scraping SICEA réussi", {
            userId: user.id,
            recordsCount: result.data.length,
          });
        } else {
          // Échec du scraping
          await prisma.siceaScrapingJob.update({
            where: { id: job.id },
            data: {
              status: "failed",
              completedAt: new Date(),
              error: result.error,
            },
          });

          await prisma.siceaCredentials.update({
            where: { id: credentials.id },
            data: {
              lastError: result.error || "Erreur inconnue",
            },
          });

          logger.error("Scraping SICEA échoué", {
            userId: user.id,
            error: result.error,
          });
        }
      })
      .catch(async (error) => {
        await prisma.siceaScrapingJob.update({
          where: { id: job.id },
          data: {
            status: "failed",
            completedAt: new Date(),
            error: error instanceof Error ? error.message : "Erreur inconnue",
          },
        });

        logger.error("Erreur scraping SICEA", error);
      });

    await logSecurityEvent(
      user.id,
      "sicea_scrape_triggered",
      "info",
      { jobId: job.id, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined,
      generateDeviceId(request)
    );

    return NextResponse.json({
      success: true,
      message: "Scraping SICEA démarré en arrière-plan",
      jobId: job.id,
    });
  } catch (error) {
    logger.error("Erreur déclenchement scraping SICEA", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

