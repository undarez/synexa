import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";
import { calculateConsumptionStats } from "@/app/lib/services/enedis-api";
import { logger } from "@/app/lib/logger";
import type { EnergyConsumption } from "@prisma/client";

/**
 * GET /api/energy/overview
 * Endpoint pour récupérer les données normalisées (Enedis + SICEA)
 * Selon recommandations GPT - format unifié pour l'app
 * 
 * Response: {
 *   currentMonth: { kwh: number, cost: number, trend: string },
 *   history: Array<{ date: string, value: number }>,
 *   alerts: Array<string>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    // Calculer les dates (mois actuel)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Récupérer les données du mois actuel
    const currentMonthData = await prisma.energyConsumption.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { date: "asc" },
    });

    // Récupérer les données du mois précédent pour la comparaison
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const previousMonthData = await prisma.energyConsumption.findMany({
      where: {
        userId: user.id,
        date: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
      },
    });

    // Calculer les totaux
    const currentMonthTotal = currentMonthData.reduce((sum: number, d: EnergyConsumption) => sum + d.value, 0);
    const currentMonthCost = currentMonthData.reduce((sum: number, d: EnergyConsumption) => sum + (d.cost || 0), 0);
    
    const previousMonthTotal = previousMonthData.reduce((sum: number, d: EnergyConsumption) => sum + d.value, 0);
    
    // Calculer la tendance
    const trend = previousMonthTotal > 0
      ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
      : 0;

    // Formater l'historique (30 derniers jours)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const historyData = await prisma.energyConsumption.findMany({
      where: {
        userId: user.id,
        date: {
          gte: thirtyDaysAgo,
          lte: now,
        },
      },
      orderBy: { date: "asc" },
    });

    const history = historyData.map((d: EnergyConsumption) => ({
      date: d.date.toISOString().split("T")[0],
      value: d.value,
    }));

    // Générer les alertes
    const alerts: string[] = [];
    
    // Alerte si consommation supérieure à la moyenne
    if (currentMonthData.length > 0) {
      const average = currentMonthTotal / currentMonthData.length;
      const todayData = currentMonthData[currentMonthData.length - 1];
      if (todayData && todayData.value > average * 1.2) {
        alerts.push("Consommation supérieure à la moyenne");
      }
    }

    // Alerte si tendance très positive
    if (trend > 15) {
      alerts.push(`Consommation en hausse de ${trend.toFixed(1)}% par rapport au mois dernier`);
    }

    return NextResponse.json({
      currentMonth: {
        kwh: Math.round(currentMonthTotal * 100) / 100,
        cost: Math.round(currentMonthCost * 100) / 100,
        trend: trend >= 0 ? `+${trend.toFixed(1)}%` : `${trend.toFixed(1)}%`,
      },
      history,
      alerts,
    });
  } catch (error) {
    logger.error("Erreur récupération overview énergie", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

