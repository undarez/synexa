import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/admin";
import { supabase } from "@/app/lib/supabase/client";

/**
 * GET - Statistiques globales de l'application (admin uniquement)
 */
export async function GET() {
  try {
    await requireAdmin();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalUsersResult,
      activeUsersResult,
      totalEnergyDataResult,
      totalCalendarEventsResult,
      totalTasksResult,
      securityLogsResult,
    ] = await Promise.all([
      supabase.from('User').select('id', { count: 'exact', head: true }),
      supabase.from('User').select('id', { count: 'exact', head: true }).gte('updatedAt', thirtyDaysAgo),
      supabase.from('EnergyConsumption').select('id', { count: 'exact', head: true }),
      supabase.from('CalendarEvent').select('id', { count: 'exact', head: true }),
      supabase.from('Task').select('id', { count: 'exact', head: true }),
      supabase.from('SecurityLog').select('id', { count: 'exact', head: true }),
    ]);

    const totalUsers = totalUsersResult.count || 0;
    const activeUsers = activeUsersResult.count || 0;
    const totalEnergyData = totalEnergyDataResult.count || 0;
    const totalCalendarEvents = totalCalendarEventsResult.count || 0;
    const totalTasks = totalTasksResult.count || 0;
    const securityLogs = securityLogsResult.count || 0;

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

