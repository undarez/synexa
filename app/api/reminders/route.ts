import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";
import { ReminderType, ReminderStatus } from "@/app/lib/supabase/types";
import { calculateIntelligentReminder } from "@/app/lib/reminders/intelligent-calculator";
import { logger } from "@/app/lib/logger";
import { generateId } from "@/app/lib/supabase/helpers";

type ReminderPayload = {
  calendarEventId?: string;
  title: string;
  message?: string;
  reminderType: ReminderType;
  minutesBefore: number; // Minutes avant l'événement
  includeTraffic?: boolean;
  includeWeather?: boolean;
  scheduledFor?: string; // Date ISO (optionnel, calculée automatiquement si non fournie)
  isRecurring?: boolean;
  recurrenceRule?: string | null;
  recurrenceEnd?: string | null;
};

/**
 * Crée un nouveau rappel
 */
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
    const body = (await request.json()) as ReminderPayload;

    if (!body.title) {
      return NextResponse.json(
        { error: "Le champ 'title' est requis" },
        { status: 400 }
      );
    }

    if (!body.minutesBefore && !body.scheduledFor) {
      return NextResponse.json(
        { error: "Le champ 'minutesBefore' ou 'scheduledFor' est requis" },
        { status: 400 }
      );
    }

    let scheduledFor: Date;
    let trafficInfo = null;
    let weatherInfo = null;

    // Si un événement est associé, calculer intelligemment
    if (body.calendarEventId) {
      const { data: event, error: eventError } = await supabase
        .from('CalendarEvent')
        .select('*')
        .eq('id', body.calendarEventId)
        .eq('userId', user.id)
        .single();

      if (eventError || !event) {
        return NextResponse.json(
          { error: "Événement introuvable" },
          { status: 404 }
        );
      }

      // Calculer le rappel intelligent si demandé
      if (body.includeTraffic || body.includeWeather) {
        try {
          const calculation = await calculateIntelligentReminder(
            user.id,
            body.calendarEventId,
            body.minutesBefore || 15
          );

          scheduledFor = calculation.recommendedSendTime;
          if (body.includeTraffic) {
            trafficInfo = calculation.trafficInfo;
          }
          if (body.includeWeather) {
            weatherInfo = calculation.weatherInfo;
          }

          // Utiliser le message calculé si aucun message n'est fourni
          if (!body.message && calculation.message) {
            body.message = calculation.message;
          }
        } catch (error) {
          console.error("[POST /reminders] Erreur calcul intelligent:", error);
          // Fallback : calcul simple
          scheduledFor = new Date(event.start as string);
          scheduledFor.setMinutes(
            scheduledFor.getMinutes() - (body.minutesBefore || 15)
          );
        }
      } else {
        // Calcul simple
        scheduledFor = new Date(event.start as string);
        scheduledFor.setMinutes(
          scheduledFor.getMinutes() - (body.minutesBefore || 15)
        );
      }
    } else if (body.scheduledFor) {
      scheduledFor = new Date(body.scheduledFor);
    } else {
      return NextResponse.json(
        { error: "Impossible de déterminer la date d'envoi" },
        { status: 400 }
      );
    }

    // Vérifier que la date n'est pas dans le passé
    if (scheduledFor < new Date()) {
      return NextResponse.json(
        { error: "La date d'envoi ne peut pas être dans le passé" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const reminderId = generateId();
    
    const { data: reminder, error: createError } = await supabase
      .from('Reminder')
      .insert({
        id: reminderId,
        userId: user.id,
        calendarEventId: body.calendarEventId || null,
        title: body.title,
        message: body.message || null,
        reminderType: body.reminderType,
        scheduledFor: scheduledFor.toISOString(),
        includeTraffic: body.includeTraffic || false,
        includeWeather: body.includeWeather || false,
        trafficInfo: trafficInfo ?? null,
        weatherInfo: weatherInfo ?? null,
        isRecurring: body.isRecurring || false,
        recurrenceRule: body.recurrenceRule || null,
        recurrenceEnd: body.recurrenceEnd ? new Date(body.recurrenceEnd).toISOString() : null,
        status: ReminderStatus.PENDING,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (createError || !reminder) {
      console.error('[POST /reminders] Erreur Supabase:', createError);
      return NextResponse.json(
        { error: 'Erreur lors de la création du rappel', details: createError?.message },
        { status: 500 }
      );
    }

    logger.info("Rappel créé", {
      userId: user.id,
      reminderId: reminder.id,
      reminderType: body.reminderType,
      isRecurring: body.isRecurring || false,
      scheduledFor: scheduledFor.toISOString(),
    });

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      logger.warn("Tentative de création de rappel non autorisée");
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    logger.error("Erreur lors de la création du rappel", error, {
      userId: user?.id,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * Liste les rappels de l'utilisateur
 */
export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
    const params = request.nextUrl.searchParams;

    // Construire la requête Supabase avec filtres
    let query = supabase
      .from('Reminder')
      .select(`
        *,
        calendarEvent:CalendarEvent(
          id,
          title,
          start,
          location
        )
      `)
      .eq('userId', user.id);

    // Filtres optionnels
    if (params.get("status")) {
      query = query.eq('status', params.get("status"));
    }

    if (params.get("calendarEventId")) {
      query = query.eq('calendarEventId', params.get("calendarEventId"));
    }

    query = query.order('scheduledFor', { ascending: true });

    const { data: reminders, error } = await query;

    if (error) {
      console.error('[GET /reminders] Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des rappels', details: error.message },
        { status: 500 }
      );
    }

    logger.debug("Rappels récupérés", {
      userId: user.id,
      count: reminders.length,
      status: params.get("status") || "all",
    });

    return NextResponse.json({ reminders });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      logger.warn("Tentative d'accès non autorisé aux rappels");
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    logger.error("Erreur lors de la récupération des rappels", error, {
      userId: user?.id,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}



