/**
 * Service de gestion des métriques de santé
 */

import prisma from "@/app/lib/prisma";
import { HealthMetricType } from "@prisma/client";

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
  return await prisma.healthMetric.create({
    data: {
      userId,
      type: input.type,
      value: input.value,
      unit: input.unit,
      source: input.source || "manual",
      recordedAt: input.recordedAt || new Date(),
      metadata: input.metadata || {},
    },
  });
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
  const where: any = { userId };

  if (options?.type) {
    where.type = options.type;
  }

  if (options?.startDate || options?.endDate) {
    where.recordedAt = {};
    if (options.startDate) {
      where.recordedAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.recordedAt.lte = options.endDate;
    }
  }

  return await prisma.healthMetric.findMany({
    where,
    orderBy: { recordedAt: "desc" },
    take: options?.limit || 100,
  });
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

  const metrics = await prisma.healthMetric.findMany({
    where: {
      userId,
      recordedAt: { gte: startDate },
    },
    orderBy: { recordedAt: "desc" },
  });

  // Grouper par type
  const grouped = metrics.reduce((acc, metric) => {
    if (!acc[metric.type]) {
      acc[metric.type] = [];
    }
    acc[metric.type].push(metric);
    return acc;
  }, {} as Record<HealthMetricType, typeof metrics>);

  const summaries: HealthMetricsSummary[] = [];

  for (const [type, typeMetrics] of Object.entries(grouped)) {
    if (typeMetrics.length === 0) continue;

    const latest = typeMetrics[0];
    const values = typeMetrics.map((m) => m.value);
    const average = values.reduce((a, b) => a + b, 0) / values.length;

    // Calculer la tendance (comparer les 7 derniers jours avec les 7 précédents)
    const recent = typeMetrics.slice(0, 7);
    const previous = typeMetrics.slice(7, 14);
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
        recordedAt: latest.recordedAt,
      },
      average: {
        value: average,
        unit: latest.unit || undefined,
        period: `${days} jours`,
      },
      trend,
      count: typeMetrics.length,
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

  return await prisma.healthMetric.findMany({
    where: {
      userId,
      type,
      recordedAt: { gte: startDate },
    },
    orderBy: { recordedAt: "asc" },
  });
}

/**
 * Supprime une métrique de santé
 */
export async function deleteHealthMetric(metricId: string, userId: string) {
  return await prisma.healthMetric.deleteMany({
    where: {
      id: metricId,
      userId,
    },
  });
}


