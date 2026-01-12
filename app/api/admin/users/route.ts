import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/admin";
import { supabase } from "@/app/lib/supabase/client";

/**
 * GET - Liste tous les utilisateurs (admin uniquement)
 */
export async function GET() {
  try {
    await requireAdmin();

    // Récupérer les utilisateurs
    const { data: users, error: usersError } = await supabase
      .from('User')
      .select('id, email, name, createdAt')
      .order('createdAt', { ascending: false });

    if (usersError) {
      console.error('[GET /admin/users] Erreur:', usersError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des utilisateurs', details: usersError.message },
        { status: 500 }
      );
    }

    // Type explicite pour les utilisateurs
    type UserWithId = { id: string; email: string | null; name: string | null; createdAt: string | null };
    const typedUsers = (users || []) as UserWithId[];

    // Compter les relations pour chaque utilisateur
    const usersWithCounts = await Promise.all(
      typedUsers.map(async (user) => {
        const [calendarEvents, tasks, reminders, energyConsumptions] = await Promise.all([
          supabase.from('CalendarEvent').select('id', { count: 'exact', head: true }).eq('userId', user.id),
          supabase.from('Task').select('id', { count: 'exact', head: true }).eq('userId', user.id),
          supabase.from('Reminder').select('id', { count: 'exact', head: true }).eq('userId', user.id),
          supabase.from('EnergyConsumption').select('id', { count: 'exact', head: true }).eq('userId', user.id),
        ]);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          _count: {
            calendarEvents: calendarEvents.count || 0,
            tasks: tasks.count || 0,
            reminders: reminders.count || 0,
            energyConsumptions: energyConsumptions.count || 0,
          },
        };
      })
    );

    return NextResponse.json({ users: usersWithCounts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: error instanceof Error && error.message.includes("Accès refusé") ? 403 : 500 }
    );
  }
}

