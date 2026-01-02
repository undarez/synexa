import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import {
  fetchGoogleCalendarEvents,
  convertGoogleEventToInternal,
  getGoogleCalendarToken,
} from "@/app/lib/google-calendar";
import prisma from "@/app/lib/prisma";
import { startOfDay, endOfDay, addDays } from "date-fns";

/**
 * Synchronise les événements Google Calendar avec la base de données locale
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    
    // Vérifier si l'utilisateur a un compte Google connecté
    const hasGoogleAccount = await getGoogleCalendarToken(user.id);
    if (!hasGoogleAccount) {
      // Vérifier si un compte Google existe
      const account = await prisma.account.findFirst({
        where: {
          userId: user.id,
          provider: "google",
        },
        select: {
          scope: true,
          access_token: true,
        },
      });

      if (!account) {
        return NextResponse.json(
          { error: "Aucun compte Google connecté. Veuillez vous connecter avec Google." },
          { status: 400 }
        );
      }

      // Si on a un compte mais pas de token, c'est peut-être un problème de scopes
      // Mais on essaie quand même de synchroniser pour voir si ça fonctionne
      if (!account.access_token) {
        return NextResponse.json(
          { error: "Token Google non disponible. Veuillez vous reconnecter avec Google." },
          { status: 400 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const daysAhead = body.daysAhead || 30; // Synchroniser les 30 prochains jours par défaut

    const timeMin = new Date().toISOString();
    const timeMax = addDays(new Date(), daysAhead).toISOString();

    // Récupérer les événements Google Calendar
    let googleEvents;
    try {
      googleEvents = await fetchGoogleCalendarEvents(user.id, {
        timeMin,
        timeMax,
        maxResults: 250,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "INSUFFICIENT_SCOPES") {
          return NextResponse.json(
            { 
              error: "Les permissions Google Calendar ne sont pas disponibles. Veuillez vous reconnecter avec Google pour autoriser l'accès au calendrier.",
              code: "INSUFFICIENT_SCOPES"
            },
            { status: 403 }
          );
        }
        
        // Détecter si l'API n'est pas activée
        if (error.message.includes("has not been used") || error.message.includes("is disabled") || error.message.includes("Enable it by visiting")) {
          return NextResponse.json(
            { 
              error: "L'API Google Calendar n'est pas activée dans votre projet Google Cloud. Veuillez l'activer en suivant ce lien : https://console.cloud.google.com/apis/library/calendar-json.googleapis.com",
              code: "API_NOT_ENABLED",
              helpUrl: "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
            },
            { status: 400 }
          );
        }
      }
      throw error;
    }

    // Synchroniser chaque événement
    const syncedEvents = [];
    const errors = [];

    for (const googleEvent of googleEvents) {
      try {
        if (!googleEvent.id) continue;

        const eventData = convertGoogleEventToInternal(googleEvent, user.id);

        // Vérifier si l'événement existe déjà
        const existingEvent = await prisma.calendarEvent.findFirst({
          where: {
            userId: user.id,
            externalId: googleEvent.id,
            source: "GOOGLE",
          },
        });

        if (existingEvent) {
          // Mettre à jour l'événement existant
          await prisma.calendarEvent.update({
            where: { id: existingEvent.id },
            data: {
              title: eventData.title,
              description: eventData.description,
              location: eventData.location,
              start: eventData.start,
              end: eventData.end,
              allDay: eventData.allDay,
              reminders: eventData.reminders as any,
              metadata: eventData.metadata as any,
            },
          });
          syncedEvents.push(existingEvent.id);
        } else {
          // Créer un nouvel événement
          const newEvent = await prisma.calendarEvent.create({
            data: eventData,
          });
          syncedEvents.push(newEvent.id);
        }
      } catch (error) {
        console.error(`[sync] Erreur pour événement ${googleEvent.id}:`, error);
        errors.push({
          eventId: googleEvent.id,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        });
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedEvents.length,
      errors: errors.length,
      details: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[POST /calendar/sync]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * Vérifie si Google Calendar est connecté avec les bons scopes
 */
export async function GET() {
  try {
    const user = await requireUser();
    const hasGoogleAccount = await getGoogleCalendarToken(user.id);
    
    // Vérifier aussi si c'est un problème de scopes
    if (!hasGoogleAccount) {
      const account = await prisma.account.findFirst({
        where: {
          userId: user.id,
          provider: "google",
        },
        select: {
          scope: true,
        },
      });

      if (account && account.scope && !account.scope.includes("calendar")) {
        // Compte Google existe mais sans scopes Calendar
        return NextResponse.json({
          connected: false,
          needsReconnect: true,
        });
      }
    }
    
    return NextResponse.json({
      connected: !!hasGoogleAccount,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

