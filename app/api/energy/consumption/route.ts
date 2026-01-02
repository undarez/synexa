import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";
import {
  fetchEnedisDailyConsumption,
  calculateConsumptionStats,
  detectConsumptionPeaks,
  generateEnergyOptimizations,
} from "@/app/lib/services/enedis-api";
import { logger } from "@/app/lib/logger";

/**
 * GET - Récupère les données de consommation (Enedis ou SICEA)
 * Supporte les deux fournisseurs et fusionne les données si nécessaire
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "7d"; // 7d, 30d, 1m, 1y
    const source = searchParams.get("source"); // "enedis", "sicea", ou null (les deux)

    // Récupérer les credentials Enedis et SICEA
    const [enedisCredentials, siceaCredentials] = await Promise.all([
      prisma.enedisCredentials.findUnique({ where: { userId: user.id } }),
      prisma.siceaCredentials.findUnique({ where: { userId: user.id } }),
    ]);

    // Déterminer quelle source utiliser
    // Si source n'est pas spécifié, utiliser celle qui est disponible
    let useEnedis = false;
    let useSicea = false;

    if (source) {
      // Source spécifiée explicitement
      useEnedis = source === "enedis";
      useSicea = source === "sicea";
      
      // Vérifier que la source demandée est configurée
      if (useEnedis && !enedisCredentials) {
        return NextResponse.json(
          { error: "Enedis non configuré. Veuillez configurer Enedis ou utiliser SICEA." },
          { status: 400 }
        );
      }
      
      if (useSicea && !siceaCredentials) {
        return NextResponse.json(
          { error: "SICEA non configuré. Veuillez configurer SICEA ou utiliser Enedis." },
          { status: 400 }
        );
      }
    } else {
      // Aucune source spécifiée : utiliser celle(s) disponible(s)
      if (!enedisCredentials && !siceaCredentials) {
        return NextResponse.json(
          { error: "Aucun fournisseur configuré. Veuillez configurer Enedis ou SICEA." },
          { status: 400 }
        );
      }
      
      // Utiliser la source disponible
      // Priorité à Enedis si les deux sont disponibles, sinon utiliser celle qui est disponible
      if (enedisCredentials) {
        useEnedis = true;
        useSicea = false;
      } else if (siceaCredentials) {
        useEnedis = false;
        useSicea = true;
      }
    }

    // Calculer les dates selon la période
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "24h":
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "1m":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Déterminer la source à utiliser pour le filtrage
    const sourceFilter = source 
      ? source 
      : (useEnedis ? "enedis" : useSicea ? "sicea" : undefined);

    // Récupérer depuis la base de données
    const existingData = await prisma.energyConsumption.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
        ...(sourceFilter ? { source: sourceFilter } : {}), // Filtrer par source si déterminée
      },
      orderBy: { date: "asc" },
    });

    let consumptionData: Array<{
      date: string;
      consumption: number;
      cost: number;
      peakHours?: number;
      offPeakHours?: number;
    }> = [];

    // Si pas assez de données, récupérer depuis les APIs
    if (existingData.length < 3) {
      // Récupérer depuis Enedis si configuré et demandé
      if (useEnedis && enedisCredentials) {
        try {
          const { decryptEnedisData } = await import("@/app/lib/encryption/enedis-encryption");
          const decrypted = decryptEnedisData({
            meterSerialNumber: enedisCredentials.meterSerialNumber,
            rpm: enedisCredentials.rpm,
            linkyToken: enedisCredentials.linkyToken,
          });

          if (decrypted.linkyToken) {
            const enedisData = await fetchEnedisDailyConsumption(
              decrypted.linkyToken,
              startDate,
              endDate,
              enedisCredentials.pdl || undefined
            );

            // Sauvegarder dans la base de données
            for (const data of enedisData) {
              await prisma.energyConsumption.upsert({
                where: {
                  userId_date: {
                    userId: user.id,
                    date: new Date(data.date),
                  },
                },
                update: {
                  value: data.consumption,
                  cost: data.cost,
                  peakHours: data.peakHours,
                  offPeakHours: data.offPeakHours,
                  source: "enedis",
                },
                create: {
                  userId: user.id,
                  date: new Date(data.date),
                  value: data.consumption,
                  cost: data.cost,
                  peakHours: data.peakHours,
                  offPeakHours: data.offPeakHours,
                  source: "enedis",
                },
              });
            }

            consumptionData.push(...enedisData);
          }
        } catch (error) {
          logger.error("Erreur récupération Enedis", error);
        }
      }

      // Récupérer depuis SICEA si configuré et demandé
      if (useSicea && siceaCredentials && siceaCredentials.isActive) {
        try {
          const { decryptSiceaData } = await import("@/app/lib/encryption/sicea-encryption");
          const { scrapeSiceaConsumption } = await import("@/app/lib/services/sicea-scraper");
          
          const decrypted = decryptSiceaData({
            username: siceaCredentials.username,
            password: siceaCredentials.password,
            contractNumber: siceaCredentials.contractNumber,
          });

          if (decrypted.username && decrypted.password) {
            try {
              const siceaResult = await scrapeSiceaConsumption(
                decrypted.username,
                decrypted.password,
                decrypted.contractNumber || undefined,
                startDate,
                endDate
              );

              if (siceaResult.success && siceaResult.data && siceaResult.data.length > 0) {
                // Sauvegarder dans la base de données
                for (const data of siceaResult.data) {
                  await prisma.energyConsumption.upsert({
                    where: {
                      userId_date: {
                        userId: user.id,
                        date: new Date(data.date),
                      },
                    },
                    update: {
                      value: data.consumption,
                      cost: data.cost,
                      peakHours: data.peakHours,
                      offPeakHours: data.offPeakHours,
                      source: "sicea",
                    },
                    create: {
                      userId: user.id,
                      date: new Date(data.date),
                      value: data.consumption,
                      cost: data.cost,
                      peakHours: data.peakHours,
                      offPeakHours: data.offPeakHours,
                      source: "sicea",
                    },
                  });
                }

                // Mapper les données SICEA pour s'assurer que cost est toujours défini
                consumptionData.push(
                  ...siceaResult.data.map((item) => ({
                    date: item.date,
                    consumption: item.consumption,
                    cost: item.cost ?? 0,
                    peakHours: item.peakHours,
                    offPeakHours: item.offPeakHours,
                  }))
                );
                
                // Mettre à jour lastScrapedAt
                await prisma.siceaCredentials.update({
                  where: { userId: user.id },
                  data: { lastScrapedAt: new Date(), lastError: null },
                });
                
                // Stocker meterInfo dans metadata pour le retour
                if (siceaResult.meterInfo) {
                  // Stocker dans metadata de la dernière consommation
                  if (siceaResult.data && siceaResult.data.length > 0) {
                    const lastData = siceaResult.data[siceaResult.data.length - 1];
                    await prisma.energyConsumption.updateMany({
                      where: {
                        userId: user.id,
                        date: new Date(lastData.date),
                        source: "sicea",
                      },
                      data: {
                        metadata: JSON.stringify(siceaResult.meterInfo),
                      },
                    });
                  }
                }
              } else if (siceaResult.error) {
                // Enregistrer l'erreur mais continuer avec les données existantes
                logger.warn("Scraping SICEA échoué, utilisation des données existantes", {
                  userId: user.id,
                  error: siceaResult.error,
                });
                
                await prisma.siceaCredentials.update({
                  where: { userId: user.id },
                  data: { lastError: siceaResult.error },
                });
              }
            } catch (scrapeError) {
              // Erreur lors du scraping, mais on continue avec les données existantes
              logger.error("Erreur scraping SICEA, utilisation des données existantes", {
                userId: user.id,
                error: scrapeError instanceof Error ? scrapeError.message : "Erreur inconnue",
              });
              
              await prisma.siceaCredentials.update({
                where: { userId: user.id },
                data: { 
                  lastError: scrapeError instanceof Error ? scrapeError.message : "Erreur scraping",
                },
              });
            }
          }
        } catch (error) {
          // Erreur lors de l'import ou de la décryption, continuer avec les données existantes
          console.error("Erreur récupération SICEA", error);
        }
      }
    } else {
      // Utiliser les données existantes
      consumptionData = existingData.map((d) => ({
        date: d.date.toISOString().split("T")[0],
        consumption: d.value,
        cost: d.cost || 0,
        peakHours: d.peakHours || undefined,
        offPeakHours: d.offPeakHours || undefined,
      }));
    }

    // Si aucune donnée, utiliser les données existantes même si < 3
    if (consumptionData.length === 0 && existingData.length > 0) {
      consumptionData = existingData.map((d) => ({
        date: d.date.toISOString().split("T")[0],
        consumption: d.value,
        cost: d.cost || 0,
        peakHours: d.peakHours || undefined,
        offPeakHours: d.offPeakHours || undefined,
      }));
    }

    // Récupérer meterInfo depuis les métadonnées si disponible (AVANT de calculer les stats)
    let meterInfo = null;
    if (consumptionData.length > 0 && useSicea) {
      const lastConsumption = await prisma.energyConsumption.findFirst({
        where: {
          userId: user.id,
          source: "sicea",
        },
        orderBy: { date: "desc" },
      });
      
      if (lastConsumption?.metadata) {
        try {
          // metadata est déjà un objet JSON, pas besoin de parser si c'est déjà un objet
          if (typeof lastConsumption.metadata === 'string') {
            meterInfo = JSON.parse(lastConsumption.metadata);
          } else {
            // Si c'est déjà un objet, l'utiliser directement
            meterInfo = lastConsumption.metadata as any;
          }
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      }
    }

    // Récupérer la puissance souscrite depuis meterInfo ou utiliser 9 kVA par défaut
    let subscribedPower = 9; // Par défaut
    if (meterInfo?.subscribedPower) {
      subscribedPower = meterInfo.subscribedPower;
    } else if (enedisCredentials) {
      // Essayer de récupérer depuis Enedis credentials
      // La puissance peut être dans les métadonnées ou estimée
      subscribedPower = 9; // Par défaut pour 9 kVA
    }

    // Calculer les statistiques avec les tarifs réglementés
    // Déterminer le fournisseur utilisé
    const provider = useSicea ? "sicea" : (useEnedis ? "enedis" : null);
    const stats = calculateConsumptionStats(consumptionData, subscribedPower, provider);
    const peaks = detectConsumptionPeaks(consumptionData);
    const optimizations = generateEnergyOptimizations(consumptionData);

    return NextResponse.json({
      success: true,
      data: consumptionData,
      stats,
      peaks: peaks.map((p) => ({
        date: p.date,
        consumption: p.consumption,
        cost: p.cost,
      })),
      optimizations,
      meterInfo,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

