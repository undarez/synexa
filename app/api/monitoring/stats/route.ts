import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { monitoring } from "@/app/lib/monitoring";
import { logger } from "@/app/lib/logger";

/**
 * GET - Récupère les statistiques de monitoring
 * Nécessite une authentification (pour la sécurité)
 */
export async function GET() {
  try {
    const user = await requireUser();

    // Seuls les administrateurs devraient avoir accès (à implémenter selon vos besoins)
    // Pour l'instant, tous les utilisateurs authentifiés peuvent voir les stats

    const stats = {
      errors: monitoring.getErrorStats(),
      recentMetrics: monitoring.getRecentMetrics(50),
      recentErrors: monitoring.getRecentErrors(20).map((report) => ({
        message: report.error.message,
        severity: report.severity,
        timestamp: new Date().toISOString(),
        context: report.context,
      })),
    };

    logger.debug("Statistiques de monitoring récupérées", { userId: user.id });

    return NextResponse.json({ stats });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    logger.error("Erreur lors de la récupération des statistiques", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}



