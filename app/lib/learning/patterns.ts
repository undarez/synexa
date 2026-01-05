/**
 * Service d'analyse et de détection de patterns d'utilisation
 * Identifie les habitudes de l'utilisateur pour améliorer les suggestions
 */

import prisma from "@/app/lib/prisma";
import { Task, Routine, RoutineLog, UserActivity } from "@prisma/client";
import { analyzeRecentPatterns } from "./tracker";

export interface DetectedPattern {
  category: string;
  pattern: string;
  frequency: number;
  confidence: number;
  metadata: Record<string, any>;
}

/**
 * Détecte les patterns récurrents dans l'utilisation
 */
export async function detectPatterns(userId: string): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];

  // Analyser les patterns récents
  const recentPatterns = await analyzeRecentPatterns(userId, 30);

  // Pattern: Heures préférées pour les tâches
  if (recentPatterns.mostActiveHours.length > 0) {
    patterns.push({
      category: "task",
      pattern: "preferred_hours",
      frequency: recentPatterns.mostActiveHours.length,
      confidence: 0.7,
      metadata: {
        hours: recentPatterns.mostActiveHours,
        description: `Tâches généralement créées/complétées entre ${recentPatterns.mostActiveHours.join("h, ")}h`,
      },
    });
  }

  // Pattern: Jours préférés
  if (recentPatterns.mostActiveDays.length > 0) {
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    patterns.push({
      category: "task",
      pattern: "preferred_days",
      frequency: recentPatterns.mostActiveDays.length,
      confidence: 0.7,
      metadata: {
        days: recentPatterns.mostActiveDays.map((d) => dayNames[d]),
        dayNumbers: recentPatterns.mostActiveDays,
      },
    });
  }

  // Pattern: Contextes préférés
  if (recentPatterns.preferredContexts.length > 0) {
    patterns.push({
      category: "task",
      pattern: "preferred_contexts",
      frequency: recentPatterns.preferredContexts.length,
      confidence: 0.8,
      metadata: {
        contexts: recentPatterns.preferredContexts,
      },
    });
  }

  // Analyser les tâches récurrentes
  const recurringTasks = await detectRecurringTasks(userId);
  patterns.push(...recurringTasks);

  // Analyser les routines fréquentes
  const frequentRoutines = await detectFrequentRoutines(userId);
  patterns.push(...frequentRoutines);

  // Analyser les commandes vocales préférées
  const voicePatterns = await detectVoiceCommandPatterns(userId);
  patterns.push(...voicePatterns);

  return patterns;
}

/**
 * Détecte les tâches récurrentes
 */
async function detectRecurringTasks(userId: string): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];

  // Tâches créées régulièrement avec le même titre ou contexte
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Grouper par titre similaire
  const titleGroups: Record<string, typeof tasks> = {};
  tasks.forEach((task: Task) => {
    const normalizedTitle = task.title.toLowerCase().trim();
    if (!titleGroups[normalizedTitle]) {
      titleGroups[normalizedTitle] = [];
    }
    titleGroups[normalizedTitle].push(task);
  });

  // Identifier les tâches récurrentes (créées au moins 3 fois)
  Object.entries(titleGroups).forEach(([title, group]) => {
    if (group.length >= 3) {
      const avgDuration = group.reduce((sum: number, t: Task) => sum + (t.estimatedDuration || 0), 0) / group.length;
      patterns.push({
        category: "task",
        pattern: `recurring_task:${title}`,
        frequency: group.length,
        confidence: Math.min(0.9, 0.5 + group.length * 0.1),
        metadata: {
          title,
          count: group.length,
          averageDuration: avgDuration,
          preferredContext: group[0].context,
          preferredPriority: group[0].priority,
        },
      });
    }
  });

  return patterns;
}

/**
 * Détecte les routines fréquemment exécutées
 */
async function detectFrequentRoutines(userId: string): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];

  const routines = await prisma.routine.findMany({
    where: {
      userId,
      active: true,
    },
    include: {
      logs: {
        orderBy: { executedAt: "desc" },
        take: 10,
      },
    },
  });

  routines.forEach((routine: Routine & { logs: RoutineLog[] }) => {
    if (routine.logs.length >= 3) {
      // Analyser les heures d'exécution
      const executionHours = routine.logs.map((log: RoutineLog) => new Date(log.executedAt).getHours());
      const mostCommonHour = executionHours.reduce(
        (a: number, b: number, _: number, arr: number[]) => (arr.filter((v: number) => v === a).length >= arr.filter((v: number) => v === b).length ? a : b),
        executionHours[0]
      );

      patterns.push({
        category: "routine",
        pattern: `frequent_routine:${routine.id}`,
        frequency: routine.logs.length,
        confidence: Math.min(0.9, 0.6 + routine.logs.length * 0.05),
        metadata: {
          routineId: routine.id,
          routineName: routine.name,
          executionCount: routine.logs.length,
          preferredHour: mostCommonHour,
          triggerType: routine.triggerType,
        },
      });
    }
  });

  return patterns;
}

/**
 * Détecte les patterns de commandes vocales
 */
async function detectVoiceCommandPatterns(userId: string): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];

  const voiceActivities = await prisma.userActivity.findMany({
    where: {
      userId,
      activityType: "voice_command",
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (voiceActivities.length >= 5) {
    // Analyser les heures d'utilisation
    const hours = voiceActivities.map((a: UserActivity) => {
      const metadata = a.metadata as any;
      return metadata?.hour ?? new Date(a.createdAt).getHours();
    });

    const hourCounts: Record<number, number> = {};
    hours.forEach((h: number) => {
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });

    const mostCommonHour = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    if (mostCommonHour) {
      patterns.push({
        category: "voice_command",
        pattern: "preferred_voice_hours",
        frequency: voiceActivities.length,
        confidence: 0.7,
        metadata: {
          totalCommands: voiceActivities.length,
          preferredHour: parseInt(mostCommonHour),
        },
      });
    }
  }

  return patterns;
}

/**
 * Enregistre ou met à jour un pattern détecté
 */
export async function savePattern(
  userId: string,
  category: string,
  pattern: string,
  metadata: Record<string, any>,
  confidence: number = 0.5
): Promise<void> {
  try {
    await prisma.userLearning.upsert({
      where: {
        userId_category_pattern: {
          userId,
          category,
          pattern,
        },
      },
      update: {
        frequency: { increment: 1 },
        lastObserved: new Date(),
        confidence: Math.min(1, confidence + 0.05), // Augmenter la confiance à chaque observation
        metadata: metadata as any,
      },
      create: {
        userId,
        category,
        pattern,
        frequency: 1,
        confidence,
        metadata: metadata as any,
      },
    });
  } catch (error) {
    console.error("[Learning Patterns] Erreur lors de la sauvegarde du pattern:", error);
  }
}

/**
 * Synchronise les patterns détectés avec la base de données
 */
export async function syncPatterns(userId: string): Promise<void> {
  const detectedPatterns = await detectPatterns(userId);

  for (const pattern of detectedPatterns) {
    await savePattern(
      userId,
      pattern.category,
      pattern.pattern,
      pattern.metadata,
      pattern.confidence
    );
  }
}







