/**
 * Service d'estimation automatique de durée pour les tâches
 * Utilise l'historique des tâches similaires pour suggérer une durée
 */

import prisma from "@/app/lib/prisma";
import type { TaskPriority, TaskContext } from "@prisma/client";

interface DurationEstimate {
  estimatedMinutes: number;
  confidence: number; // 0-1
  basedOn: string; // Description de la base de l'estimation
}

/**
 * Durées par défaut par contexte (en minutes)
 */
const DEFAULT_DURATIONS: Record<TaskContext, { min: number; max: number; avg: number }> = {
  WORK: { min: 15, max: 120, avg: 45 },
  PERSONAL: { min: 10, max: 60, avg: 30 },
  SHOPPING: { min: 30, max: 120, avg: 60 },
  HEALTH: { min: 15, max: 90, avg: 45 },
  FINANCE: { min: 10, max: 60, avg: 30 },
  HOME: { min: 15, max: 180, avg: 60 },
  SOCIAL: { min: 30, max: 240, avg: 90 },
  LEARNING: { min: 20, max: 120, avg: 60 },
  OTHER: { min: 15, max: 90, avg: 45 },
};

/**
 * Multiplicateurs par priorité
 */
const PRIORITY_MULTIPLIERS: Record<TaskPriority, number> = {
  HIGH: 1.2, // Tâches prioritaires prennent souvent plus de temps
  MEDIUM: 1.0,
  LOW: 0.8, // Tâches non prioritaires peuvent être plus rapides
};

/**
 * Estime la durée d'une tâche basée sur l'historique et le contexte
 */
export async function estimateTaskDuration(
  userId: string,
  title: string,
  context: TaskContext,
  priority: TaskPriority,
  description?: string | null
): Promise<DurationEstimate> {
  // 1. Chercher des tâches similaires dans l'historique
  const similarTasks = await findSimilarTasks(userId, title, context);
  
  if (similarTasks.length > 0) {
    // Calculer la moyenne des durées réelles
    const completedTasks = similarTasks.filter((t: SimilarTask) => t.completed && t.completedAt && t.createdAt);
    const actualDurations: number[] = [];
    
    completedTasks.forEach((task: SimilarTask) => {
      if (task.completedAt && task.createdAt) {
        const duration = Math.round(
          (task.completedAt.getTime() - task.createdAt.getTime()) / (1000 * 60)
        );
        if (duration > 0 && duration < 480) { // Entre 1 minute et 8 heures
          actualDurations.push(duration);
        }
      }
    });
    
    if (actualDurations.length > 0) {
      const avgDuration = actualDurations.reduce((sum, d) => sum + d, 0) / actualDurations.length;
      const estimated = Math.round(avgDuration * PRIORITY_MULTIPLIERS[priority]);
      
      return {
        estimatedMinutes: Math.max(5, Math.min(480, estimated)), // Entre 5 min et 8h
        confidence: Math.min(0.9, 0.5 + (actualDurations.length * 0.1)),
        basedOn: `Basé sur ${actualDurations.length} tâche${actualDurations.length > 1 ? "s" : ""} similaire${actualDurations.length > 1 ? "s" : ""} complétée${actualDurations.length > 1 ? "s" : ""}`,
      };
    }
    
    // Utiliser les durées estimées des tâches similaires
    const estimatedDurations = similarTasks
      .filter((t: SimilarTask) => t.estimatedDuration && t.estimatedDuration > 0)
      .map((t: SimilarTask) => t.estimatedDuration!);
    
    if (estimatedDurations.length > 0) {
      const avgEstimated = estimatedDurations.reduce((sum, d) => sum + d, 0) / estimatedDurations.length;
      const estimated = Math.round(avgEstimated * PRIORITY_MULTIPLIERS[priority]);
      
      return {
        estimatedMinutes: Math.max(5, Math.min(480, estimated)),
        confidence: Math.min(0.8, 0.4 + (estimatedDurations.length * 0.1)),
        basedOn: `Basé sur ${estimatedDurations.length} tâche${estimatedDurations.length > 1 ? "s" : ""} similaire${estimatedDurations.length > 1 ? "s" : ""}`,
      };
    }
  }
  
  // 2. Utiliser les durées par défaut selon le contexte
  const defaultDuration = DEFAULT_DURATIONS[context];
  let estimated = defaultDuration.avg;
  
  // Ajuster selon la priorité
  estimated = Math.round(estimated * PRIORITY_MULTIPLIERS[priority]);
  
  // Ajuster selon la longueur du titre/description (tâches plus détaillées = plus longues)
  const textLength = (title.length + (description?.length || 0));
  if (textLength > 100) {
    estimated = Math.round(estimated * 1.2);
  } else if (textLength < 20) {
    estimated = Math.round(estimated * 0.9);
  }
  
  // Mots-clés dans le titre qui indiquent une durée
  const titleLower = title.toLowerCase();
  if (titleLower.includes("rapide") || titleLower.includes("quick") || titleLower.includes("court")) {
    estimated = Math.round(estimated * 0.7);
  } else if (titleLower.includes("long") || titleLower.includes("complet") || titleLower.includes("détaillé")) {
    estimated = Math.round(estimated * 1.5);
  }
  
  return {
    estimatedMinutes: Math.max(5, Math.min(480, estimated)),
    confidence: 0.5,
    basedOn: `Basé sur le contexte "${context}" et la priorité "${priority}"`,
  };
}

type SimilarTask = {
  id: string;
  title: string;
  estimatedDuration: number | null;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
};

/**
 * Trouve des tâches similaires dans l'historique
 */
async function findSimilarTasks(
  userId: string,
  title: string,
  context: TaskContext
): Promise<SimilarTask[]> {
  const titleWords = title
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3); // Mots significatifs
  
  if (titleWords.length === 0) {
    return [];
  }
  
  // Chercher des tâches avec des mots similaires dans le même contexte
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      context,
      createdAt: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 derniers jours
      },
    },
    select: {
      id: true,
      title: true,
      estimatedDuration: true,
      completed: true,
      completedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  
  // Filtrer par similarité (au moins 1 mot en commun)
  const similarTasks = tasks.filter((task: SimilarTask) => {
    const taskWords = task.title
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const commonWords = titleWords.filter(word => taskWords.includes(word));
    return commonWords.length > 0;
  });
  
  // Trier par similarité (plus de mots en commun = plus similaire)
  similarTasks.sort((a: SimilarTask, b: SimilarTask) => {
    const aWords = a.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const bWords = b.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const aCommon = titleWords.filter(w => aWords.includes(w)).length;
    const bCommon = titleWords.filter(w => bWords.includes(w)).length;
    return bCommon - aCommon;
  });
  
  return similarTasks.slice(0, 10); // Top 10 plus similaires
}

/**
 * Met à jour l'estimation de durée d'une tâche après sa complétion
 * pour améliorer les futures estimations
 */
export async function updateDurationEstimate(
  userId: string,
  taskId: string
): Promise<void> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });
  
  if (!task || !task.completed || !task.completedAt || !task.createdAt) {
    return;
  }
  
  const actualDuration = Math.round(
    (task.completedAt.getTime() - task.createdAt.getTime()) / (1000 * 60)
  );
  
  // Si la durée réelle est très différente de l'estimation, on peut suggérer une mise à jour
  // Mais on ne modifie pas automatiquement pour éviter les erreurs
  if (task.estimatedDuration && actualDuration > 0 && actualDuration < 480) {
    const difference = Math.abs(actualDuration - task.estimatedDuration);
    const percentDifference = (difference / task.estimatedDuration) * 100;
    
    // Si la différence est > 50%, on pourrait suggérer une mise à jour
    // Pour l'instant, on log juste pour l'apprentissage futur
    if (percentDifference > 50) {
      console.log(`[Duration Estimator] Tâche "${task.title}" : estimé ${task.estimatedDuration}min, réel ${actualDuration}min (différence ${percentDifference.toFixed(0)}%)`);
    }
  }
}



