/**
 * Service de tracking des activités utilisateur
 * Collecte les données d'utilisation pour l'apprentissage automatique
 */

import { supabase } from "@/app/lib/supabase/client";

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

    const nowISO = now.toISOString();
    await supabase
      .from('UserActivity')
      .insert({
        userId,
        activityType,
        entityType: entityType || null,
        entityId: entityId || null,
        metadata: enrichedMetadata || null,
        createdAt: nowISO,
        updatedAt: nowISO,
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

  const { data: activities, error } = await supabase
    .from('UserActivity')
    .select('activityType, metadata, createdAt')
    .eq('userId', userId)
    .gte('createdAt', since.toISOString());

  if (error) {
    console.error("[Learning Tracker] Erreur récupération activités:", error);
  }

  // Analyser les heures les plus actives
  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<number, number> = {};
  const contextCounts: Record<string, number> = {};

  let totalTaskDuration = 0;
  let taskCount = 0;
  let completedTasks = 0;
  let createdTasks = 0;

  (activities || []).forEach((activity: any) => {
    const metadata = (activity.metadata || {}) as ActivityMetadata;
    const createdAt = typeof activity.createdAt === 'string' ? new Date(activity.createdAt) : activity.createdAt;
    const hour = metadata.hour ?? createdAt.getHours();
    const day = metadata.dayOfWeek ?? createdAt.getDay();

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

  const { data: activities, error } = await supabase
    .from('UserActivity')
    .select('activityType, metadata, createdAt')
    .eq('userId', userId)
    .gte('createdAt', since.toISOString())
    .order('createdAt', { ascending: false });

  if (error) {
    console.error("[Learning Tracker] Erreur récupération activités récentes:", error);
  }

  return (activities || []).map((a: any) => ({
    activityType: a.activityType as ActivityType,
    createdAt: typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt,
    metadata: (a.metadata || {}) as ActivityMetadata,
  }));
}


