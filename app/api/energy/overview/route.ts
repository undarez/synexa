import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";
import { calculateConsumptionStats } from "@/app/lib/services/enedis-api";
import { logger } from "@/app/lib/logger";

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
    const { data: currentMonthData, error: currentMonthError } = await supabase
      .from('EnergyConsumption')
      .select('*')
      .eq('userId', user.id)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString())
      .order('date', { ascending: true });

    if (currentMonthError) {
      logger.error("Erreur récupération données mois actuel", currentMonthError);
    }

    // Récupérer les données du mois précédent pour la comparaison
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const { data: previousMonthData, error: previousMonthError } = await supabase
      .from('EnergyConsumption')
      .select('*')
      .eq('userId', user.id)
      .gte('date', previousMonthStart.toISOString())
      .lte('date', previousMonthEnd.toISOString());

    if (previousMonthError) {
      logger.error("Erreur récupération données mois précédent", previousMonthError);
    }

    // Calculer les totaux
    type ConsumptionData = { value: number; cost: number; date: string; [key: string]: unknown };
    const currentMonthTotal = (currentMonthData || []).reduce((sum: number, d: unknown) => {
      const typedD = d as ConsumptionData;
      return sum + (typedD.value || 0);
    }, 0);
    const currentMonthCost = (currentMonthData || []).reduce((sum: number, d: unknown) => {
      const typedD = d as ConsumptionData;
      return sum + (typedD.cost || 0);
    }, 0);
    
    const previousMonthTotal = (previousMonthData || []).reduce((sum: number, d: unknown) => {
      const typedD = d as ConsumptionData;
      return sum + (typedD.value || 0);
    }, 0);
    
    // Calculer la tendance
    const trend = previousMonthTotal > 0
      ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
      : 0;

    // Formater l'historique (30 derniers jours)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { data: historyData, error: historyError } = await supabase
      .from('EnergyConsumption')
      .select('*')
      .eq('userId', user.id)
      .gte('date', thirtyDaysAgo.toISOString())
      .lte('date', now.toISOString())
      .order('date', { ascending: true });

    if (historyError) {
      logger.error("Erreur récupération historique", historyError);
    }

    const history = (historyData || []).map((d: unknown) => {
      const typedD = d as ConsumptionData;
      return {
        date: new Date(typedD.date).toISOString().split("T")[0],
        value: typedD.value || 0,
      };
    });

    // Générer les alertes
    const alerts: string[] = [];
    
    // Alerte si consommation supérieure à la moyenne
    if (currentMonthData && currentMonthData.length > 0) {
      const average = currentMonthTotal / currentMonthData.length;
      const todayData = currentMonthData[currentMonthData.length - 1] as ConsumptionData | undefined;
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

