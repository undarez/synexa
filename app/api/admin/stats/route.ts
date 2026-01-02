import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/admin";
import prisma from "@/app/lib/prisma";

/**
 * GET - Statistiques globales de l'application (admin uniquement)
 */
export async function GET() {
  try {
    await requireAdmin();

    const [
      totalUsers,
      activeUsers,
      totalEnergyData,
      totalCalendarEvents,
      totalTasks,
      securityLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Actifs dans les 30 derniers jours
          },
        },
      }),
      prisma.energyConsumption.count(),
      prisma.calendarEvent.count(),
      prisma.task.count(),
      prisma.securityLog.count(),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        totalEnergyData,
        totalCalendarEvents,
        totalTasks,
        securityLogs,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: error instanceof Error && error.message.includes("Accès refusé") ? 403 : 500 }
    );
  }
}

