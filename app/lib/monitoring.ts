/**
 * Module de monitoring et métriques
 */

import { logger } from "./logger";

export interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: Date;
}

export interface ErrorReport {
  error: Error;
  context?: Record<string, any>;
  userId?: string;
  severity: "low" | "medium" | "high" | "critical";
}

class MonitoringService {
  private metrics: Metric[] = [];
  private errorReports: ErrorReport[] = [];

  /**
   * Enregistre une métrique
   */
  recordMetric(metric: Metric) {
    metric.timestamp = metric.timestamp || new Date();
    this.metrics.push(metric);

    // Logger la métrique
    logger.info(`[Metric] ${metric.name}`, {
      value: metric.value,
      tags: metric.tags,
      timestamp: metric.timestamp.toISOString(),
    });

    // En production, vous pourriez envoyer ces métriques à un service comme Datadog, Prometheus, etc.
  }

  /**
   * Enregistre un rapport d'erreur
   */
  reportError(report: ErrorReport) {
    this.errorReports.push(report);

    // Logger selon la sévérité
    const logContext = {
      error: {
        message: report.error.message,
        stack: report.error.stack,
        name: report.error.name,
      },
      context: report.context,
      userId: report.userId,
      severity: report.severity,
    };

    switch (report.severity) {
      case "critical":
      case "high":
        logger.error(`[Error Report] ${report.error.message}`, report.error, logContext);
        break;
      case "medium":
        logger.warn(`[Error Report] ${report.error.message}`, logContext);
        break;
      case "low":
        logger.info(`[Error Report] ${report.error.message}`, logContext);
        break;
    }

    // En production, vous pourriez envoyer ces erreurs à un service comme Sentry, Rollbar, etc.
  }

  /**
   * Récupère les métriques récentes
   */
  getRecentMetrics(limit: number = 100): Metric[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Récupère les rapports d'erreur récents
   */
  getRecentErrors(limit: number = 50): ErrorReport[] {
    return this.errorReports.slice(-limit);
  }

  /**
   * Statistiques des erreurs par sévérité
   */
  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const report of this.errorReports) {
      stats[report.severity]++;
    }

    return stats;
  }

  /**
   * Nettoie les anciennes métriques et erreurs (garder seulement les dernières 1000)
   */
  cleanup() {
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
    if (this.errorReports.length > 1000) {
      this.errorReports = this.errorReports.slice(-1000);
    }
  }
}

export const monitoring = new MonitoringService();

// Nettoyer périodiquement (toutes les heures)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    monitoring.cleanup();
  }, 60 * 60 * 1000); // 1 heure
}



