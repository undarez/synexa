/**
 * Service d'analyse et de détection de patterns d'utilisation
 * Identifie les habitudes de l'utilisateur pour améliorer les suggestions
 */

import { supabase } from "@/app/lib/supabase/client";
import type { Task, Routine, RoutineLog, UserActivity } from "@/app/lib/supabase/types";
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
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { data: tasks, error: tasksError } = await supabase
    .from('Task')
    .select('*')
    .eq('userId', userId)
    .gte('createdAt', thirtyDaysAgo.toISOString())
    .order('createdAt', { ascending: false });

  if (tasksError) {
    console.error("[Patterns] Erreur récupération tâches:", tasksError);
  }

  // Grouper par titre similaire
  const titleGroups: Record<string, Task[]> = {};
  (tasks || []).forEach((task: any) => {
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

  const { data: routines, error: routinesError } = await supabase
    .from('Routine')
    .select(`
      *,
      logs:RoutineLog(*)
    `)
    .eq('userId', userId)
    .eq('active', true)
    .order('executedAt', { foreignTable: 'logs', ascending: false });

  if (routinesError) {
    console.error("[Patterns] Erreur récupération routines:", routinesError);
  }

  (routines || []).forEach((routine: any) => {
    const logs = (routine.logs || []).slice(0, 10) as RoutineLog[];
    if (logs.length >= 3) {
      // Analyser les heures d'exécution
      const executionHours = logs.map((log: any) => {
        const executedAt = typeof log.executedAt === 'string' ? new Date(log.executedAt) : log.executedAt;
        return executedAt.getHours();
      });
      const mostCommonHour = executionHours.reduce(
        (a: number, b: number, _: number, arr: number[]) => (arr.filter((v: number) => v === a).length >= arr.filter((v: number) => v === b).length ? a : b),
        executionHours[0]
      );

      patterns.push({
        category: "routine",
        pattern: `frequent_routine:${routine.id}`,
        frequency: logs.length,
        confidence: Math.min(0.9, 0.6 + logs.length * 0.05),
        metadata: {
          routineId: routine.id,
          routineName: routine.name,
          executionCount: logs.length,
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

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { data: voiceActivities, error: voiceError } = await supabase
    .from('UserActivity')
    .select('*')
    .eq('userId', userId)
    .eq('activityType', 'voice_command')
    .gte('createdAt', thirtyDaysAgo.toISOString())
    .order('createdAt', { ascending: false });

  if (voiceError) {
    console.error("[Patterns] Erreur récupération commandes vocales:", voiceError);
    return patterns; // Retourner les patterns déjà détectés
  }

  if ((voiceActivities || []).length >= 5) {
    // Analyser les heures d'utilisation
    const hours = (voiceActivities || []).map((a: any) => {
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
    const now = new Date().toISOString();
    
    // Récupérer le pattern existant pour incrémenter la fréquence
    const { data: existingPattern } = await supabase
      .from('UserLearning')
      .select('frequency, confidence')
      .eq('userId', userId)
      .eq('category', category)
      .eq('pattern', pattern)
      .single();

    if (existingPattern) {
      // Mettre à jour le pattern existant
      await supabase
        .from('UserLearning')
        .update({
          frequency: (existingPattern.frequency || 0) + 1,
          lastObserved: now,
          confidence: Math.min(1, (existingPattern.confidence || 0.5) + 0.05),
          metadata: metadata || null,
          updatedAt: now,
        })
        .eq('userId', userId)
        .eq('category', category)
        .eq('pattern', pattern);
    } else {
      // Créer un nouveau pattern
      await supabase
        .from('UserLearning')
        .insert({
          userId,
          category,
          pattern,
          frequency: 1,
          confidence,
          metadata: metadata || null,
          lastObserved: now,
          createdAt: now,
          updatedAt: now,
        });
    }
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







