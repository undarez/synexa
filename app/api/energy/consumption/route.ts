import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";
import {
  fetchEnedisDailyConsumption,
  calculateConsumptionStats,
  detectConsumptionPeaks,
  generateEnergyOptimizations,
} from "@/app/lib/services/enedis-api";

/**
 * GET - Récupère les données de consommation
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "7d"; // 7d, 30d, 1m, 1y

    // Récupérer les credentials Enedis
    const credentials = await prisma.enedisCredentials.findUnique({
      where: { userId: user.id },
    });

    if (!credentials) {
      return NextResponse.json(
        { error: "Compteur non configuré. Veuillez ajouter votre numéro de série dans votre profil." },
        { status: 400 }
      );
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

    // Récupérer depuis la base de données ou depuis l'API Enedis
    const existingData = await prisma.energyConsumption.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    // Si pas assez de données, récupérer depuis Enedis via @bokub/linky
    let consumptionData;
    if (existingData.length < 3) {
      // Déchiffrer les données pour l'API Linky
      const { decryptEnedisData } = await import("@/app/lib/encryption/enedis-encryption");
      const decrypted = decryptEnedisData({
        meterSerialNumber: credentials.meterSerialNumber,
        rpm: credentials.rpm,
        linkyToken: credentials.linkyToken,
      });

      // Vérifier qu'on a un token Linky
      if (!decrypted.linkyToken) {
        return NextResponse.json(
          { 
            error: "Token Linky non configuré. Veuillez configurer votre token dans les paramètres.",
            requiresLinkyToken: true 
          },
          { status: 400 }
        );
      }

      const enedisData = await fetchEnedisDailyConsumption(
        decrypted.linkyToken,
        startDate,
        endDate,
        credentials.pdl || undefined
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

      consumptionData = enedisData;
    } else {
      consumptionData = existingData.map((d) => ({
        date: d.date.toISOString().split("T")[0],
        consumption: d.value,
        cost: d.cost || 0,
        peakHours: d.peakHours || undefined,
        offPeakHours: d.offPeakHours || undefined,
      }));
    }

    // Calculer les statistiques
    const stats = calculateConsumptionStats(consumptionData);
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
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

