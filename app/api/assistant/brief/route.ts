import { NextResponse } from "next/server";
import { startOfDay, endOfDay, addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Routine, Task, CalendarEvent, Reminder } from "@/app/lib/supabase/types";
import { supabase } from "@/app/lib/supabase/client";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
import { getWeather } from "@/app/lib/services/weather";

interface BriefData {
  date: string;
  greeting: string;
  summary: string;
  agenda: CalendarEvent[];
  tasks: {
    highPriority: Task[];
    today: Task[];
    overdue: Task[];
  };
  reminders: Reminder[];
  weather?: {
    current: {
      temperature: number;
      description: string;
      humidity: number;
      windSpeed: number;
    };
    forecast: Array<{
      date: string;
      temperature: { min: number; max: number };
      description: string;
    }>;
  };
  suggestions: {
    traffic?: Array<{
      event: CalendarEvent;
      suggestion: string;
    }>;
    routines?: Array<{
      routine: Routine;
      suggestion: string;
    }>;
    tasks?: Array<{
      task: Task;
      suggestion: string;
    }>;
  };
  activeRoutines: Array<{
    id: string;
    name: string;
    triggerType: string;
  }>;
}

export async function GET() {
  try {
    const user = await requireUser();
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const tomorrow = addDays(now, 1);

    // Récupérer toutes les données en parallèle avec Supabase
    const [
      eventsResult,
      tasksResult,
      remindersResult,
      routinesResult,
      userResult,
    ] = await Promise.all([
      // Événements du jour
      supabase
        .from('CalendarEvent')
        .select('*')
        .eq('userId', user.id)
        .gte('start', todayStart.toISOString())
        .lt('start', endOfDay(tomorrow).toISOString())
        .order('start', { ascending: true }),
      // Toutes les tâches
      supabase
        .from('Task')
        .select('*')
        .eq('userId', user.id)
        .eq('completed', false)
        .order('priority', { ascending: false })
        .order('due', { ascending: true, nullsFirst: false }),
      // Rappels à venir (prochaines 24h)
      supabase
        .from('Reminder')
        .select(`
          *,
          calendarEvent:CalendarEvent(*)
        `)
        .eq('userId', user.id)
        .eq('status', 'PENDING')
        .gte('scheduledFor', now.toISOString())
        .lte('scheduledFor', addDays(now, 1).toISOString())
        .order('scheduledFor', { ascending: true })
        .limit(10),
      // Routines actives
      supabase
        .from('Routine')
        .select('*')
        .eq('userId', user.id)
        .eq('active', true)
        .order('createdAt', { ascending: true }),
      // Données utilisateur pour géolocalisation
      supabase
        .from('User')
        .select('homeAddress, workAddress, workLat, workLng')
        .eq('id', user.id)
        .single(),
    ]);

    // Extraire les données et gérer les erreurs
    if (eventsResult.error) {
      console.error('[Brief] Erreur récupération événements:', eventsResult.error);
    }
    if (tasksResult.error) {
      console.error('[Brief] Erreur récupération tâches:', tasksResult.error);
    }
    if (remindersResult.error) {
      console.error('[Brief] Erreur récupération rappels:', remindersResult.error);
    }
    if (routinesResult.error) {
      console.error('[Brief] Erreur récupération routines:', routinesResult.error);
    }
    if (userResult.error) {
      console.error('[Brief] Erreur récupération utilisateur:', userResult.error);
    }

    const events = (eventsResult.data || []) as CalendarEvent[];
    const allTasks = (tasksResult.data || []) as Task[];
    const reminders = (remindersResult.data || []) as Reminder[];
    const routines = (routinesResult.data || []) as Routine[];
    const userData = userResult.data as { homeAddress?: string | null; workAddress?: string | null; workLat?: number | null; workLng?: number | null } | null;

    // Séparer les tâches
    const highPriorityTasks = allTasks.filter((t: Task) => t.priority === "HIGH");
    const todayTasks = allTasks.filter(
      (t: Task) => t.due && new Date(t.due) <= todayEnd && new Date(t.due) >= todayStart
    );
    const overdueTasks = allTasks.filter(
      (t: Task) => t.due && new Date(t.due) < todayStart
    );

    // Récupérer la météo si on a une localisation
    let weather = undefined;
    if (userData?.workLat && userData?.workLng) {
      try {
        weather = await getWeather(userData.workLat, userData.workLng, 3);
      } catch (error) {
        console.error("[Brief] Erreur météo:", error);
      }
    }

    // Générer les suggestions
    const suggestions: BriefData["suggestions"] = {
      traffic: [],
      routines: [],
      tasks: [],
    };

    // Suggestions de trafic pour les événements avec lieu
    const eventsWithLocation = events.filter((e: CalendarEvent) => e.location);
    for (const event of eventsWithLocation.slice(0, 3)) {
      if (event.location && userData?.workAddress) {
        suggestions.traffic?.push({
          event,
          suggestion: `Vérifiez le trafic pour "${event.title}" à ${event.location}`,
        });
      }
    }

    // Suggestions de routines basées sur l'heure
    const currentHour = now.getHours();
    const morningRoutines = routines.filter(
      (r: Routine) => r.triggerType === "SCHEDULE" && r.name.toLowerCase().includes("matin")
    );
    if (currentHour >= 6 && currentHour < 10 && morningRoutines.length > 0) {
      suggestions.routines?.push({
        routine: morningRoutines[0],
        suggestion: "C'est le moment idéal pour votre routine matinale",
      });
    }

    // Suggestions de tâches prioritaires
    if (highPriorityTasks.length > 0) {
      suggestions.tasks?.push({
        task: highPriorityTasks[0],
        suggestion: `N'oubliez pas votre tâche prioritaire : "${highPriorityTasks[0].title}"`,
      });
    }

    // Générer le message de salutation
    const hour = now.getHours();
    let greeting = "Bonjour";
    if (hour < 12) {
      greeting = "Bonjour";
    } else if (hour < 18) {
      greeting = "Bon après-midi";
    } else {
      greeting = "Bonsoir";
    }

    // Générer un résumé textuel
    const summaryParts: string[] = [];
    
    if (events.length > 0) {
      summaryParts.push(`${events.length} événement${events.length > 1 ? "s" : ""} aujourd'hui`);
    }
    
    if (highPriorityTasks.length > 0) {
      summaryParts.push(`${highPriorityTasks.length} tâche${highPriorityTasks.length > 1 ? "s" : ""} prioritaire${highPriorityTasks.length > 1 ? "s" : ""}`);
    }
    
    if (overdueTasks.length > 0) {
      summaryParts.push(`⚠️ ${overdueTasks.length} tâche${overdueTasks.length > 1 ? "s" : ""} en retard`);
    }
    
    if (reminders.length > 0) {
      summaryParts.push(`${reminders.length} rappel${reminders.length > 1 ? "s" : ""} à venir`);
    }

    const summary = summaryParts.length > 0
      ? summaryParts.join(", ")
      : "Journée tranquille prévue";

    const brief: BriefData = {
      date: now.toISOString(),
      greeting,
      summary,
      agenda: events,
      tasks: {
        highPriority: highPriorityTasks,
        today: todayTasks,
        overdue: overdueTasks,
      },
      reminders: reminders.slice(0, 5),
      weather: weather
        ? {
            current: {
              temperature: weather.current.temperature,
              description: weather.current.description,
              humidity: weather.current.humidity,
              windSpeed: weather.current.windSpeed,
            },
            forecast: weather.forecast.slice(0, 3).map((f) => ({
              date: f.date,
              temperature: f.temperature,
              description: f.description,
            })),
          }
        : undefined,
      suggestions,
      activeRoutines: routines.map((routine: Routine) => ({
        id: routine.id,
        name: routine.name,
        triggerType: routine.triggerType,
      })),
    };

    return NextResponse.json({ brief });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /assistant/brief]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}
