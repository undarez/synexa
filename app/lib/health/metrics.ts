/**
 * Service de gestion des métriques de santé
 */

import { supabase } from "@/app/lib/supabase/client";
import { HealthMetricType } from "@/app/lib/supabase/types";

export interface HealthMetric {
  id: string;
  userId: string;
  type: HealthMetricType;
  value: number;
  unit?: string | null;
  source?: string | null;
  recordedAt: Date;
  metadata?: any;
}

export interface HealthMetricInput {
  type: HealthMetricType;
  value: number;
  unit?: string;
  source?: string;
  recordedAt?: Date;
  metadata?: Record<string, any>;
}

export interface HealthMetricsSummary {
  type: HealthMetricType;
  latest?: {
    value: number;
    unit?: string;
    recordedAt: Date;
  };
  average?: {
    value: number;
    unit?: string;
    period: string;
  };
  trend?: "up" | "down" | "stable";
  count: number;
}

/**
 * Crée une nouvelle métrique de santé
 */
export async function createHealthMetric(
  userId: string,
  input: HealthMetricInput
) {
  const now = new Date().toISOString();
  const recordedAt = input.recordedAt || new Date();
  
  const { data: metric, error } = await supabase
    .from('HealthMetric')
    .insert({
      userId,
      type: input.type,
      value: input.value,
      unit: input.unit || null,
      source: input.source || "manual",
      recordedAt: recordedAt.toISOString(),
      metadata: input.metadata || null,
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single();

  if (error || !metric) {
    throw new Error(`Erreur lors de la création de la métrique: ${error?.message}`);
  }

  return metric as HealthMetric;
}

/**
 * Récupère les métriques de santé d'un utilisateur
 */
export async function getHealthMetrics(
  userId: string,
  options?: {
    type?: HealthMetricType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
) {
  let query = supabase
    .from('HealthMetric')
    .select('*')
    .eq('userId', userId);

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  if (options?.startDate) {
    query = query.gte('recordedAt', options.startDate.toISOString());
  }
  if (options?.endDate) {
    query = query.lte('recordedAt', options.endDate.toISOString());
  }

  query = query.order('recordedAt', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  } else {
    query = query.limit(100);
  }

  const { data: metrics, error } = await query;

  if (error) {
    console.error("[Health Metrics] Erreur récupération métriques:", error);
    // Retourner un tableau vide plutôt que de lancer une erreur
    return [];
  }

  return (metrics || []) as HealthMetric[];
}

/**
 * Récupère un résumé des métriques de santé
 */
export async function getHealthMetricsSummary(
  userId: string,
  days: number = 30
): Promise<HealthMetricsSummary[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: metrics, error } = await supabase
    .from('HealthMetric')
    .select('*')
    .eq('userId', userId)
    .gte('recordedAt', startDate.toISOString())
    .order('recordedAt', { ascending: false });

  if (error) {
    console.error("[Health Metrics] Erreur récupération métriques:", error);
    // Retourner un résumé vide plutôt que de lancer une erreur
    return [];
  }

  // Grouper par type
  const grouped = (metrics || []).reduce((acc: Record<string, HealthMetric[]>, metric: any) => {
    if (!acc[metric.type]) {
      acc[metric.type] = [];
    }
    acc[metric.type].push(metric as HealthMetric);
    return acc;
  }, {} as Record<HealthMetricType, HealthMetric[]>);

  const summaries: HealthMetricsSummary[] = [];

  for (const [type, typeMetrics] of Object.entries(grouped)) {
    const typedMetrics = typeMetrics as HealthMetric[];
    if (typedMetrics.length === 0) continue;

    const latest = typedMetrics[0];
    const values = typedMetrics.map((m) => m.value);
    const average = values.reduce((a, b) => a + b, 0) / values.length;

    // Calculer la tendance (comparer les 7 derniers jours avec les 7 précédents)
    const recent = typedMetrics.slice(0, 7);
    const previous = typedMetrics.slice(7, 14);
    let trend: "up" | "down" | "stable" = "stable";

    if (recent.length > 0 && previous.length > 0) {
      const recentAvg =
        recent.reduce((a, b) => a + b.value, 0) / recent.length;
      const previousAvg =
        previous.reduce((a, b) => a + b.value, 0) / previous.length;
      const diff = ((recentAvg - previousAvg) / previousAvg) * 100;

      if (diff > 5) trend = "up";
      else if (diff < -5) trend = "down";
    }

    summaries.push({
      type: type as HealthMetricType,
      latest: {
        value: latest.value,
        unit: latest.unit || undefined,
        recordedAt: new Date(latest.recordedAt),
      },
      average: {
        value: average,
        unit: latest.unit || undefined,
        period: `${days} jours`,
      },
      trend,
      count: typedMetrics.length,
    });
  }

  return summaries;
}

/**
 * Récupère les métriques d'un type spécifique sur une période
 */
export async function getHealthMetricsByType(
  userId: string,
  type: HealthMetricType,
  days: number = 7
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: metrics, error } = await supabase
    .from('HealthMetric')
    .select('*')
    .eq('userId', userId)
    .eq('type', type)
    .gte('recordedAt', startDate.toISOString())
    .order('recordedAt', { ascending: true });

  if (error) {
    console.error("[Health Metrics] Erreur récupération métriques par type:", error);
    return [];
  }

  return (metrics || []) as HealthMetric[];
}

/**
 * Supprime une métrique de santé
 */
export async function deleteHealthMetric(metricId: string, userId: string) {
  const { error } = await supabase
    .from('HealthMetric')
    .delete()
    .eq('id', metricId)
    .eq('userId', userId);

  if (error) {
    console.error("[Health Metrics] Erreur suppression métrique:", error);
    throw new Error(`Erreur lors de la suppression de la métrique: ${error.message}`);
  }

  return { success: true };
}






