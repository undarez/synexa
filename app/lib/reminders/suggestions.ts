/**
 * Suggestions automatiques de rappels
 */

import prisma from "@/app/lib/prisma";
import type { CalendarEvent } from "@prisma/client";

export interface ReminderSuggestion {
  eventId: string;
  eventTitle: string;
  eventStart: Date;
  suggestedMinutes: number[];
  reason: string;
}

/**
 * Génère des suggestions de rappels pour les événements à venir
 */
export async function suggestReminders(
  userId: string,
  daysAhead: number = 7
): Promise<ReminderSuggestion[]> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  // Récupérer les événements à venir sans rappel
  const events = await prisma.calendarEvent.findMany({
    where: {
      userId,
      start: {
        gte: now,
        lte: futureDate,
      },
    },
    include: {
      reminderEvents: {
        where: {
          status: "PENDING",
        },
      },
    },
    orderBy: {
      start: "asc",
    },
  });

  const suggestions: ReminderSuggestion[] = [];

  for (const event of events) {
    // Si l'événement a déjà un rappel, on skip
    if (event.reminderEvents.length > 0) {
      continue;
    }

    const eventStart = new Date(event.start);
    const hoursUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Suggestions basées sur le type d'événement et le temps restant
    let suggestedMinutes: number[] = [];
    let reason = "";

    // Événements avec lieu (besoin de temps de trajet)
    if (event.location) {
      if (hoursUntilEvent > 24) {
        // Plus de 24h : rappel la veille et le jour même
        suggestedMinutes = [1440, 60]; // 24h avant et 1h avant
        reason = "Événement avec lieu - rappels recommandés pour préparer le trajet";
      } else if (hoursUntilEvent > 2) {
        // Entre 2h et 24h : rappel 1h avant
        suggestedMinutes = [60];
        reason = "Événement avec lieu - rappel recommandé pour le trajet";
      } else {
        // Moins de 2h : rappel 15 min avant
        suggestedMinutes = [15];
        reason = "Événement proche - rappel immédiat";
      }
    } else {
      // Événements sans lieu
      if (hoursUntilEvent > 24) {
        suggestedMinutes = [1440, 30]; // 24h avant et 30 min avant
        reason = "Événement important - rappels recommandés";
      } else if (hoursUntilEvent > 1) {
        suggestedMinutes = [30];
        reason = "Événement à venir - rappel recommandé";
      } else {
        suggestedMinutes = [15];
        reason = "Événement proche - rappel immédiat";
      }
    }

    // Ajuster selon l'heure de l'événement
    const eventHour = eventStart.getHours();
    if (eventHour < 9) {
      // Événement tôt le matin : rappel la veille
      if (!suggestedMinutes.includes(1440)) {
        suggestedMinutes.unshift(1440);
      }
      reason += " (événement matinal)";
    }

    suggestions.push({
      eventId: event.id,
      eventTitle: event.title,
      eventStart: eventStart,
      suggestedMinutes,
      reason,
    });
  }

  return suggestions;
}

/**
 * Crée automatiquement des rappels suggérés pour un événement
 */
export async function createSuggestedReminders(
  userId: string,
  eventId: string,
  minutesBefore: number[]
): Promise<number> {
  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId, userId },
  });

  if (!event) {
    throw new Error("Événement introuvable");
  }

  let created = 0;

  for (const minutes of minutesBefore) {
    const scheduledFor = new Date(event.start);
    scheduledFor.setMinutes(scheduledFor.getMinutes() - minutes);

    // Vérifier qu'on ne crée pas un rappel dans le passé
    if (scheduledFor < new Date()) {
      continue;
    }

    try {
      await prisma.reminder.create({
        data: {
          userId,
          calendarEventId: eventId,
          title: `Rappel : ${event.title}`,
          message: `N'oubliez pas : ${event.title}${event.location ? ` à ${event.location}` : ""}`,
          reminderType: "PUSH",
          scheduledFor,
          includeTraffic: !!event.location,
          includeWeather: true,
          status: "PENDING",
        },
      });
      created++;
    } catch (error) {
      console.error(`[createSuggestedReminders] Erreur pour ${minutes} min:`, error);
    }
  }

  return created;
}







