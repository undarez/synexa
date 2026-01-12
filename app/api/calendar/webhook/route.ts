import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase/client";
import {
  getGoogleCalendarToken,
  fetchGoogleCalendarEvents,
  convertGoogleEventToInternal,
} from "@/app/lib/google-calendar";
import { addDays } from "date-fns";

/**
 * Endpoint webhook pour recevoir les notifications Google Calendar
 * 
 * Google envoie une notification POST avec :
 * - X-Goog-Channel-ID: ID du channel
 * - X-Goog-Resource-ID: Resource ID
 * - X-Goog-Resource-State: "sync" (première notification) ou "exists" (changement)
 * - X-Goog-Channel-Token: Token optionnel
 */
export async function POST(request: NextRequest) {
  try {
    const channelId = request.headers.get("X-Goog-Channel-ID");
    const resourceId = request.headers.get("X-Goog-Resource-ID");
    const resourceState = request.headers.get("X-Goog-Resource-State");

    if (!channelId || !resourceId) {
      return NextResponse.json(
        { error: "Headers manquants" },
        { status: 400 }
      );
    }

    // Trouver le channel dans la base de données
    const { data: channel, error: channelError } = await supabase
      .from('CalendarChannel')
      .select(`
        *,
        user:User(*)
      `)
      .eq('channelId', channelId)
      .single();

    if (!channel) {
      console.warn(`[Webhook] Channel non trouvé: ${channelId}`);
      return NextResponse.json({ received: true });
    }

    type CalendarChannelData = { resourceId: string; userId: string; calendarId: string; [key: string]: unknown };
    const typedChannel = channel as CalendarChannelData;

    // Vérifier que le resource ID correspond
    if (typedChannel.resourceId !== resourceId) {
      console.warn(
        `[Webhook] Resource ID mismatch: ${typedChannel.resourceId} vs ${resourceId}`
      );
      return NextResponse.json({ received: true });
    }

    // Si c'est la première notification (sync), on synchronise tout
    // Sinon (exists), on synchronise seulement les changements récents
    if (resourceState === "sync") {
      console.log(`[Webhook] Sync initial pour user ${typedChannel.userId}`);
      // Synchronisation complète
      await syncUserCalendar(typedChannel.userId, typedChannel.calendarId);
    } else if (resourceState === "exists") {
      console.log(`[Webhook] Changement détecté pour user ${typedChannel.userId}`);
      // Synchronisation des changements récents (dernières 24h)
      await syncUserCalendar(typedChannel.userId, typedChannel.calendarId, 1);
    }

    // Retourner 200 OK pour confirmer la réception
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook Calendar] Erreur:", error);
    // Retourner 200 quand même pour éviter que Google réessaie immédiatement
    return NextResponse.json({ received: true });
  }
}

/**
 * Synchronise le calendrier d'un utilisateur
 */
async function syncUserCalendar(
  userId: string,
  calendarId: string,
  daysAhead: number = 30
) {
  try {
    const hasGoogleToken = await getGoogleCalendarToken(userId);
    if (!hasGoogleToken) {
      console.warn(`[Webhook] Pas de token Google pour user ${userId}`);
      return;
    }

    const timeMin = new Date().toISOString();
    const timeMax = addDays(new Date(), daysAhead).toISOString();

    // Récupérer les événements Google
    const googleEvents = await fetchGoogleCalendarEvents(userId, {
      timeMin,
      timeMax,
      maxResults: 250,
    });

    // Synchroniser chaque événement
    for (const googleEvent of googleEvents) {
      if (!googleEvent.id) continue;

      try {
        const eventData = convertGoogleEventToInternal(googleEvent, userId);
        eventData.calendarId = calendarId;

        type ExistingEventData = { id: string };
        const { data: existingEvent } = await supabase
          .from('CalendarEvent')
          .select('id')
          .eq('userId', userId)
          .eq('externalId', googleEvent.id)
          .eq('source', 'GOOGLE')
          .single();

        const now = new Date().toISOString();
        const typedExistingEvent = existingEvent as ExistingEventData | null;

        if (typedExistingEvent) {
          // Mettre à jour l'événement existant
          // @ts-ignore - Supabase infère 'never' mais les données sont valides
          await supabase
            .from('CalendarEvent')
            // @ts-ignore
            .update({
              title: eventData.title,
              description: eventData.description || null,
              location: eventData.location || null,
              start: eventData.start.toISOString(),
              end: eventData.end.toISOString(),
              allDay: eventData.allDay,
              reminders: eventData.reminders || null,
              metadata: eventData.metadata || null,
              updatedAt: now,
            } as any)
            .eq('id', typedExistingEvent.id);
        } else {
          // Créer un nouvel événement
          // @ts-ignore - Supabase infère 'never' mais les données sont valides
          await supabase
            .from('CalendarEvent')
            .insert({
              ...eventData,
              start: eventData.start.toISOString(),
              end: eventData.end.toISOString(),
              reminders: eventData.reminders || null,
              metadata: eventData.metadata || null,
              createdAt: now,
              updatedAt: now,
            } as any);
        }
      } catch (error) {
        console.error(
          `[Webhook] Erreur lors de la sync de l'événement ${googleEvent.id}:`,
          error
        );
      }
    }

    console.log(
      `[Webhook] Synchronisation terminée pour user ${userId}: ${googleEvents.length} événements`
    );
  } catch (error) {
    console.error(`[Webhook] Erreur lors de la sync pour user ${userId}:`, error);
  }
}

/**
 * GET pour vérifier que l'endpoint fonctionne
 */
export async function GET() {
  return NextResponse.json({
    message: "Webhook Google Calendar actif",
    endpoint: "/api/calendar/webhook",
  });
}







