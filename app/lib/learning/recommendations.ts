/**
 * Service de recommandations personnalisées
 * Utilise les patterns appris pour suggérer des actions adaptées
 */

import prisma from "@/app/lib/prisma";
import { UserLearning } from "@prisma/client";
import { detectPatterns } from "./patterns";
import { analyzeRecentPatterns } from "./tracker";

export interface PersonalizedRecommendation {
  type: "task" | "event" | "routine" | "reminder" | "optimization";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  confidence: number;
  action?: {
    type: string;
    data: any;
  };
  reason: string; // Pourquoi cette recommandation est faite
}

/**
 * Génère des recommandations personnalisées pour l'utilisateur
 */
export async function getPersonalizedRecommendations(
  userId: string
): Promise<PersonalizedRecommendation[]> {
  const recommendations: PersonalizedRecommendation[] = [];

  // Récupérer les patterns appris
  const learnedPatterns = await prisma.userLearning.findMany({
    where: { userId },
    orderBy: [{ confidence: "desc" }, { frequency: "desc" }],
  });

  // Analyser les patterns récents
  const recentPatterns = await analyzeRecentPatterns(userId, 7);

  // Recommandation 1: Tâches récurrentes suggérées
  const recurringTaskPatterns = learnedPatterns.filter(
    (p: UserLearning) => p.category === "task" && p.pattern.startsWith("recurring_task:")
  );

  recurringTaskPatterns.forEach((pattern: UserLearning) => {
    const metadata = pattern.metadata as any;
    if (metadata && metadata.count >= 3) {
      recommendations.push({
        type: "task",
        title: `Créer la tâche "${metadata.title}"`,
        description: `Vous créez régulièrement cette tâche. Souhaitez-vous la créer maintenant ?`,
        priority: "high",
        confidence: pattern.confidence,
        action: {
          type: "create_task",
          data: {
            title: metadata.title,
            context: metadata.preferredContext || "PERSONAL",
            priority: metadata.preferredPriority || "MEDIUM",
            estimatedDuration: metadata.averageDuration || null,
          },
        },
        reason: `Créée ${metadata.count} fois récemment`,
      });
    }
  });

  // Recommandation 2: Optimisation des heures de travail
  const preferredHoursPattern = learnedPatterns.find(
    (p: UserLearning) => p.category === "task" && p.pattern === "preferred_hours"
  );

  if (preferredHoursPattern) {
    const metadata = preferredHoursPattern.metadata as any;
    const currentHour = new Date().getHours();
    const isPreferredHour = metadata.hours?.includes(currentHour);

    if (!isPreferredHour && metadata.hours && metadata.hours.length > 0) {
      const nextPreferredHour = metadata.hours.find((h: number) => h > currentHour) || metadata.hours[0];
      recommendations.push({
        type: "optimization",
        title: "Heure optimale pour vos tâches",
        description: `Vous êtes généralement plus productif entre ${metadata.hours.join("h et ")}h. La prochaine fenêtre optimale est à ${nextPreferredHour}h.`,
        priority: "medium",
        confidence: preferredHoursPattern.confidence,
        reason: "Basé sur vos patterns d'activité",
      });
    }
  }

  // Recommandation 3: Routines suggérées
  const frequentRoutinePatterns = learnedPatterns.filter(
    (p: UserLearning) => p.category === "routine" && p.pattern.startsWith("frequent_routine:")
  );

  frequentRoutinePatterns.forEach((pattern: UserLearning) => {
    const metadata = pattern.metadata as any;
    if (metadata && metadata.executionCount >= 5) {
      const routineHour = metadata.preferredHour;
      const currentHour = new Date().getHours();

      if (routineHour !== undefined && Math.abs(currentHour - routineHour) <= 1) {
        recommendations.push({
          type: "routine",
          title: `Exécuter "${metadata.routineName}"`,
          description: `C'est généralement l'heure où vous exécutez cette routine.`,
          priority: "high",
          confidence: pattern.confidence,
          action: {
            type: "execute_routine",
            data: {
              routineId: metadata.routineId,
            },
          },
          reason: `Exécutée ${metadata.executionCount} fois à cette heure`,
        });
      }
    }
  });

  // Recommandation 4: Amélioration du taux de complétion
  if (recentPatterns.completionRate < 0.7 && recentPatterns.completionRate > 0) {
    recommendations.push({
      type: "optimization",
      title: "Améliorer votre taux de complétion",
      description: `Vous complétez ${Math.round(recentPatterns.completionRate * 100)}% de vos tâches. Essayez de réduire le nombre de tâches ou d'augmenter leur priorité.`,
      priority: "medium",
      confidence: 0.8,
      reason: `Taux de complétion actuel: ${Math.round(recentPatterns.completionRate * 100)}%`,
    });
  }

  // Recommandation 5: Contextes préférés
  if (recentPatterns.preferredContexts.length > 0) {
    const topContext = recentPatterns.preferredContexts[0];
    recommendations.push({
      type: "optimization",
      title: `Focus sur ${topContext}`,
      description: `La plupart de vos tâches sont dans le contexte "${topContext}". Créez-vous régulièrement des tâches dans ce contexte ?`,
      priority: "low",
      confidence: 0.7,
      reason: `Contexte le plus utilisé: ${topContext}`,
    });
  }

  // Trier par priorité et confiance
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.confidence - a.confidence;
  });
}

/**
 * Adapte les suggestions en fonction des patterns appris
 */
export async function adaptSuggestions(
  userId: string,
  suggestionType: "task" | "event" | "reminder"
): Promise<any> {
  const learnedPatterns = await prisma.userLearning.findMany({
    where: {
      userId,
      category: suggestionType,
    },
    orderBy: [{ confidence: "desc" }, { frequency: "desc" }],
  });

  const adaptations: Record<string, any> = {};

  // Adapter les suggestions de tâches
  if (suggestionType === "task") {
    const preferredContexts = learnedPatterns
      .filter((p: UserLearning) => p.pattern === "preferred_contexts")
      .map((p: UserLearning) => (p.metadata as any)?.contexts || [])
      .flat();

    if (preferredContexts.length > 0) {
      adaptations.suggestedContexts = preferredContexts.slice(0, 3);
    }

    const preferredHours = learnedPatterns
      .find((p: UserLearning) => p.pattern === "preferred_hours")
      ?.metadata as any;

    if (preferredHours?.hours) {
      adaptations.suggestedHours = preferredHours.hours;
    }
  }

  return adaptations;
}







