/**
 * Service de tracking des activités utilisateur
 * Collecte les données d'utilisation pour l'apprentissage automatique
 */

import prisma from "@/app/lib/prisma";

export type ActivityType =
  | "task_created"
  | "task_completed"
  | "task_updated"
  | "event_created"
  | "event_updated"
  | "event_deleted"
  | "routine_created"
  | "routine_executed"
  | "routine_updated"
  | "voice_command"
  | "reminder_created"
  | "preference_changed"
  | "device_used";

export interface ActivityMetadata {
  hour?: number; // Heure de la journée (0-23)
  dayOfWeek?: number; // Jour de la semaine (0-6)
  context?: string; // Contexte (WORK, PERSONAL, etc.)
  priority?: string; // Priorité (HIGH, MEDIUM, LOW)
  location?: string; // Localisation si disponible
  duration?: number; // Durée en minutes
  energyLevel?: string; // Niveau d'énergie
  [key: string]: any; // Autres métadonnées
}

/**
 * Enregistre une activité utilisateur
 */
export async function trackActivity(
  userId: string,
  activityType: ActivityType,
  metadata?: ActivityMetadata,
  entityType?: string,
  entityId?: string
): Promise<void> {
  try {
    // Enrichir les métadonnées avec le contexte temporel
    const now = new Date();
    const enrichedMetadata: ActivityMetadata = {
      ...metadata,
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
      timestamp: now.toISOString(),
    };

    await prisma.userActivity.create({
      data: {
        userId,
        activityType,
        entityType,
        entityId,
        metadata: enrichedMetadata as any,
      },
    });
  } catch (error) {
    // Ne pas bloquer l'application si le tracking échoue
    console.error("[Learning Tracker] Erreur lors du tracking:", error);
  }
}

/**
 * Analyse les patterns d'utilisation récents
 */
export async function analyzeRecentPatterns(
  userId: string,
  days: number = 30
): Promise<{
  mostActiveHours: number[];
  mostActiveDays: number[];
  preferredContexts: string[];
  averageTaskDuration: number;
  completionRate: number;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const activities = await prisma.userActivity.findMany({
    where: {
      userId,
      createdAt: { gte: since },
    },
    select: {
      activityType: true,
      metadata: true,
      createdAt: true,
    },
  });

  // Analyser les heures les plus actives
  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<number, number> = {};
  const contextCounts: Record<string, number> = {};
  let totalTaskDuration = 0;
  let taskCount = 0;
  let completedTasks = 0;
  let createdTasks = 0;

  activities.forEach((activity: { activityType: string; metadata: any; createdAt: Date }) => {
    const metadata = activity.metadata as ActivityMetadata;
    const hour = metadata.hour ?? new Date(activity.createdAt).getHours();
    const day = metadata.dayOfWeek ?? new Date(activity.createdAt).getDay();

    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    dayCounts[day] = (dayCounts[day] || 0) + 1;

    if (metadata.context) {
      contextCounts[metadata.context] = (contextCounts[metadata.context] || 0) + 1;
    }

    if (activity.activityType === "task_completed") {
      completedTasks++;
      if (metadata.duration) {
        totalTaskDuration += metadata.duration;
        taskCount++;
      }
    }

    if (activity.activityType === "task_created") {
      createdTasks++;
    }
  });

  // Trier et obtenir les top heures/jours
  const mostActiveHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  const mostActiveDays = Object.entries(dayCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([day]) => parseInt(day));

  const preferredContexts = Object.entries(contextCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([context]) => context);

  return {
    mostActiveHours,
    mostActiveDays,
    preferredContexts,
    averageTaskDuration: taskCount > 0 ? totalTaskDuration / taskCount : 0,
    completionRate: createdTasks > 0 ? completedTasks / createdTasks : 0,
  };
}

/**
 * Récupère les activités récentes de l'utilisateur
 */
export async function getRecentActivities(
  userId: string,
  days: number = 7
): Promise<Array<{
  activityType: ActivityType;
  createdAt: Date;
  metadata: ActivityMetadata;
}>> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const activities = await prisma.userActivity.findMany({
    where: {
      userId,
      createdAt: { gte: since },
    },
    select: {
      activityType: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return activities.map(a => ({
    activityType: a.activityType as ActivityType,
    createdAt: a.createdAt,
    metadata: a.metadata as ActivityMetadata,
  }));
}


