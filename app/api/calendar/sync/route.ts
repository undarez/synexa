import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
import { convertGoogleEventToInternal } from "@/app/lib/google-calendar";
import { supabase } from "@/app/lib/supabase/client";
import { addDays } from "date-fns";

/**
 * Récupère les événements Google Calendar avec un provider_token
 */
async function fetchGoogleCalendarEventsWithToken(
  providerToken: string,
  options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  } = {}
): Promise<any[]> {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(options.maxResults || 250),
  });

  if (options.timeMin) {
    params.append("timeMin", options.timeMin);
  }
  if (options.timeMax) {
    params.append("timeMax", options.timeMax);
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${providerToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText };
    }
    
    console.error("[fetchGoogleCalendarEventsWithToken] Erreur:", errorData);
    
    // Si erreur 403, vérifier si c'est vraiment un problème de scopes
    if (response.status === 403) {
      const errorReason = errorData?.error?.details?.[0]?.reason || errorData?.error?.errors?.[0]?.reason;
      if (errorReason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT" || errorReason === "insufficientPermissions") {
        throw new Error("INSUFFICIENT_SCOPES");
      }
      throw new Error(`Erreur Google Calendar: ${errorData?.error?.message || "Permission refusée"}`);
    }
    
    throw new Error(`Erreur Google Calendar: ${response.status} - ${errorData?.error?.message || errorText}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Synchronise les événements Google Calendar avec la base de données locale
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    
    // Récupérer le provider_token depuis le body (envoyé par le client)
    const providerToken = body.providerToken;
    
    if (!providerToken) {
      return NextResponse.json(
        { error: "Token Google (provider_token) manquant. Veuillez vous connecter avec Google." },
        { status: 400 }
      );
    }

    const daysAhead = body.daysAhead || 30; // Synchroniser les 30 prochains jours par défaut

    const timeMin = new Date().toISOString();
    const timeMax = addDays(new Date(), daysAhead).toISOString();

    // Récupérer les événements Google Calendar avec le provider_token
    let googleEvents;
    try {
      googleEvents = await fetchGoogleCalendarEventsWithToken(providerToken, {
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
        const { data: existingEvent } = await supabase
          .from('CalendarEvent')
          .select('id')
          .eq('userId', user.id)
          .eq('externalId', googleEvent.id)
          .eq('source', 'GOOGLE')
          .single();

        const now = new Date().toISOString();

        type ExistingEventData = { id: string };
        const typedExistingEvent = existingEvent as ExistingEventData | null;
        if (typedExistingEvent) {
          // Mettre à jour l'événement existant
          // @ts-ignore - Supabase infère 'never' mais les données sont valides
          const { data: updatedEvent } = await supabase
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
            .eq('id', typedExistingEvent.id)
            .select('id')
            .single();
          
          type UpdatedEvent = { id: string };
          const typedUpdatedEvent = updatedEvent as UpdatedEvent | null;
          if (typedUpdatedEvent) {
            syncedEvents.push(typedUpdatedEvent.id);
          }
        } else {
          // Créer un nouvel événement
          type NewEvent = { id: string };
          const { data: newEvent } = await supabase
            .from('CalendarEvent')
            .insert({
              ...eventData,
              start: eventData.start.toISOString(),
              end: eventData.end.toISOString(),
              reminders: eventData.reminders || null,
              metadata: eventData.metadata || null,
              createdAt: now,
              updatedAt: now,
            } as any)
            .select('id')
            .single();
          
          const typedNewEvent = newEvent as NewEvent | null;
          if (typedNewEvent) {
            syncedEvents.push(typedNewEvent.id);
          }
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
 * Accepte le provider_token dans le header Authorization
 */
export async function GET(request: NextRequest) {
  try {
    // Récupérer le provider_token depuis le header Authorization
    const authHeader = request.headers.get("authorization");
    const providerToken = authHeader?.replace("Bearer ", "") || null;
    
    // Si pas de token fourni, retourner un statut non connecté (pas d'erreur 400)
    if (!providerToken) {
      return NextResponse.json({
        connected: false,
        error: "Aucun token Google fourni. Veuillez vous connecter avec Google.",
      });
    }
    
    // Si un token est fourni, vérifier qu'il fonctionne avec Google Calendar API
    try {
      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1",
        {
          headers: {
            Authorization: `Bearer ${providerToken}`,
          },
        }
      );
      
      if (response.ok) {
        return NextResponse.json({
          connected: true,
        });
      } else if (response.status === 401) {
        // Token invalide ou expiré
        return NextResponse.json({
          connected: false,
          error: "Token invalide ou expiré",
        });
      } else if (response.status === 403) {
        // Permissions insuffisantes (pas de scopes Calendar)
        return NextResponse.json({
          connected: false,
          needsReconnect: true,
          error: "Permissions Google Calendar insuffisantes. Veuillez vous reconnecter avec Google pour autoriser l'accès au calendrier.",
        });
      } else {
        // Autre erreur
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error("[GET /api/calendar/sync] Erreur Google Calendar API:", response.status, errorData);
        return NextResponse.json({
          connected: false,
          error: `Erreur Google Calendar API: ${errorData?.error?.message || "Erreur inconnue"}`,
        });
      }
    } catch (err) {
      console.error("[GET /api/calendar/sync] Erreur vérification token:", err);
      return NextResponse.json({
        connected: false,
        error: err instanceof Error ? err.message : "Erreur lors de la vérification du token",
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[GET /api/calendar/sync] Erreur inattendue:", error);
    return NextResponse.json(
      { 
        connected: false,
        error: error instanceof Error ? error.message : "Erreur serveur" 
      },
      { status: 500 }
    );
  }
}

