import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";
import { ReminderType, ReminderStatus } from "@prisma/client";
import { calculateIntelligentReminder } from "@/app/lib/reminders/intelligent-calculator";
import { toJsonInput } from "@/app/lib/prisma/json";
import { logger } from "@/app/lib/logger";

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
      const event = await prisma.calendarEvent.findFirst({
        where: { id: body.calendarEventId, userId: user.id },
      });

      if (!event) {
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
          scheduledFor = new Date(event.start);
          scheduledFor.setMinutes(
            scheduledFor.getMinutes() - (body.minutesBefore || 15)
          );
        }
      } else {
        // Calcul simple
        scheduledFor = new Date(event.start);
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

    const reminder = await prisma.reminder.create({
      data: {
        userId: user.id,
        calendarEventId: body.calendarEventId || null,
        title: body.title,
        message: body.message || null,
        reminderType: body.reminderType,
        scheduledFor,
        includeTraffic: body.includeTraffic || false,
        includeWeather: body.includeWeather || false,
        trafficInfo: toJsonInput(trafficInfo),
        weatherInfo: toJsonInput(weatherInfo),
        isRecurring: body.isRecurring || false,
        recurrenceRule: body.recurrenceRule || null,
        recurrenceEnd: body.recurrenceEnd ? new Date(body.recurrenceEnd) : null,
        status: ReminderStatus.PENDING,
      },
    });

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

    const where: any = { userId: user.id };

    // Filtres optionnels
    if (params.get("status")) {
      where.status = params.get("status");
    }

    if (params.get("calendarEventId")) {
      where.calendarEventId = params.get("calendarEventId");
    }

    const reminders = await prisma.reminder.findMany({
      where,
      include: {
        calendarEvent: {
          select: {
            id: true,
            title: true,
            start: true,
            location: true,
          },
        },
      },
      orderBy: { scheduledFor: "asc" },
    });

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



