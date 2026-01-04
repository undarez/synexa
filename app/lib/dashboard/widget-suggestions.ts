/**
 * Logique de suggestions de widgets par Synexa
 * Analyse les préférences et activités de l'utilisateur pour suggérer des widgets pertinents
 */

import prisma from "@/app/lib/prisma";
import { WidgetType, AVAILABLE_WIDGETS } from "./widgets";

export interface WidgetSuggestion {
  widgetType: WidgetType;
  reason: string;
  priority: "high" | "medium" | "low";
}

/**
 * Analyse les activités et préférences de l'utilisateur pour suggérer des widgets
 */
export async function getWidgetSuggestions(userId: string): Promise<WidgetSuggestion[]> {
  const suggestions: WidgetSuggestion[] = [];

  try {
    // Récupérer les widgets actuellement visibles
    const currentWidgets = await prisma.dashboardWidget.findMany({
      where: { userId, visible: true },
      select: { widgetType: true },
    });

    const visibleWidgetTypes = new Set(currentWidgets.map((w: { widgetType: string }) => w.widgetType as WidgetType));

    // Analyser les activités récentes
    const recentActivities = await prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Analyser les métriques de santé
    const healthMetrics = await prisma.healthMetric.findMany({
      where: { userId },
      orderBy: { recordedAt: "desc" },
      take: 10,
    });

    // Analyser les tâches
    const tasks = await prisma.task.findMany({
      where: { userId },
      take: 20,
    });

    // Analyser les événements
    const events = await prisma.calendarEvent.findMany({
      where: { userId },
      take: 20,
    });

    // Analyser les routines
    const routines = await prisma.routine.findMany({
      where: { userId, active: true },
    });

    // Analyser les finances
    const expenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 10,
    });

    // Suggestions basées sur les activités

    // Si beaucoup d'événements mais widget non visible
    if (events.length > 5 && !visibleWidgetTypes.has("events")) {
      suggestions.push({
        widgetType: "events",
        reason: "Vous avez plusieurs événements programmés. Le widget Événements pourrait vous être utile.",
        priority: "high",
      });
    }

    // Si beaucoup de tâches mais widget non visible
    if (tasks.length > 3 && !visibleWidgetTypes.has("tasks")) {
      suggestions.push({
        widgetType: "tasks",
        reason: "Vous avez plusieurs tâches en cours. Le widget Tâches vous aiderait à les suivre.",
        priority: "high",
      });
    }

    // Si des métriques de santé mais widget non visible
    if (healthMetrics.length > 0 && !visibleWidgetTypes.has("health")) {
      suggestions.push({
        widgetType: "health",
        reason: "Vous suivez votre santé. Le widget Santé vous donnerait un aperçu rapide.",
        priority: "medium",
      });
    }

    // Si des dépenses mais widget finance non visible
    if (expenses.length > 0 && !visibleWidgetTypes.has("finance")) {
      suggestions.push({
        widgetType: "finance",
        reason: "Vous suivez vos finances. Le widget Finance vous aiderait à mieux gérer votre budget.",
        priority: "medium",
      });
    }

    // Si des routines actives mais widget non visible
    if (routines.length > 0 && !visibleWidgetTypes.has("routines")) {
      suggestions.push({
        widgetType: "routines",
        reason: "Vous avez des automatisations actives. Le widget Automatisations vous permettrait de les surveiller.",
        priority: "low",
      });
    }

    // Suggestion météo si pas déjà visible (toujours utile)
    if (!visibleWidgetTypes.has("weather")) {
      suggestions.push({
        widgetType: "weather",
        reason: "Le widget Météo vous donne les conditions en temps réel pour mieux planifier votre journée.",
        priority: "medium",
      });
    }

    // Suggestion trafic si pas déjà visible
    if (!visibleWidgetTypes.has("traffic")) {
      suggestions.push({
        widgetType: "traffic",
        reason: "Le widget Trafic vous informe des conditions de circulation pour vos déplacements.",
        priority: "low",
      });
    }

    // Suggestion bien-être si métriques de santé
    if (healthMetrics.length > 5 && !visibleWidgetTypes.has("wellness")) {
      suggestions.push({
        widgetType: "wellness",
        reason: "Vous suivez plusieurs métriques. Le widget Bien-être vous offre une vue d'ensemble.",
        priority: "medium",
      });
    }

    // Trier par priorité
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    suggestions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    return suggestions.slice(0, 5); // Limiter à 5 suggestions
  } catch (error) {
    console.error("[Widget Suggestions] Erreur:", error);
    return [];
  }
}





