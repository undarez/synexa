import prisma from "@/app/lib/prisma";

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
}

interface GoogleCalendarListResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
}

/**
 * Récupère le token d'accès Google Calendar pour un utilisateur
 */
export async function getGoogleCalendarToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
    select: {
      access_token: true,
      refresh_token: true,
      expires_at: true,
      providerAccountId: true,
      scope: true,
    },
  });

  if (!account?.access_token) {
    return null;
  }

  // Vérifier si les scopes Calendar sont présents
  // Les scopes peuvent être stockés comme une chaîne séparée par des espaces
  const scopeString = account.scope || "";
  const hasCalendarScopes = 
    scopeString.includes("calendar") || 
    scopeString.includes("https://www.googleapis.com/auth/calendar");

  // Si on a un token mais pas de scopes Calendar détectés, on log pour déboguer
  // mais on continue quand même car :
  // 1. Google peut avoir accordé les permissions même si le format est différent
  // 2. Le token peut être valide même si les scopes ne sont pas dans la chaîne exactement
  if (!hasCalendarScopes && scopeString) {
    console.log("[getGoogleCalendarToken] Scopes disponibles:", scopeString);
    console.log("[getGoogleCalendarToken] Calendar scope non détecté, mais on continue avec le token");
  }
  
  // Si aucun scope n'est stocké, on essaie quand même le token
  // car il peut être valide même sans les scopes dans la base

  // Vérifier si le token est expiré et le rafraîchir si nécessaire
  if (account.expires_at && account.expires_at * 1000 < Date.now()) {
    if (!account.refresh_token) {
      return null;
    }

    // Rafraîchir le token
    const refreshedToken = await refreshGoogleToken(account.refresh_token);
    if (!refreshedToken) {
      return null;
    }

    // Mettre à jour le token dans la base de données
    await prisma.account.update({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: account.providerAccountId,
        },
      },
      data: {
        access_token: refreshedToken.access_token,
        expires_at: refreshedToken.expires_at,
        refresh_token: refreshedToken.refresh_token || account.refresh_token,
      },
    });

    return refreshedToken.access_token;
  }

  return account.access_token;
}

/**
 * Rafraîchit un token Google expiré
 */
async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string;
  expires_at: number;
  refresh_token?: string;
} | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("[refreshGoogleToken] Erreur:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      refresh_token: data.refresh_token,
    };
  } catch (error) {
    console.error("[refreshGoogleToken]", error);
    return null;
  }
}

/**
 * Récupère les événements Google Calendar pour un utilisateur
 */
export async function fetchGoogleCalendarEvents(
  userId: string,
  options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  } = {}
): Promise<GoogleCalendarEvent[]> {
  const accessToken = await getGoogleCalendarToken(userId);
  if (!accessToken) {
    throw new Error("Token Google Calendar non disponible");
  }

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
        Authorization: `Bearer ${accessToken}`,
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
    
    console.error("[fetchGoogleCalendarEvents] Erreur:", errorData);
    
    // Si erreur 403, vérifier si c'est vraiment un problème de scopes
    if (response.status === 403) {
      const errorReason = errorData?.error?.details?.[0]?.reason || errorData?.error?.errors?.[0]?.reason;
      if (errorReason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT" || errorReason === "insufficientPermissions") {
        throw new Error("INSUFFICIENT_SCOPES");
      }
      // Sinon, c'est peut-être une autre erreur 403 (permissions, etc.)
      throw new Error(`Erreur Google Calendar: ${errorData?.error?.message || "Permission refusée"}`);
    }
    
    throw new Error(`Erreur Google Calendar: ${response.status} - ${errorData?.error?.message || errorText}`);
  }

  const data: GoogleCalendarListResponse = await response.json();
  return data.items || [];
}

/**
 * Crée un événement dans Google Calendar
 */
export async function createGoogleCalendarEvent(
  userId: string,
  event: Omit<GoogleCalendarEvent, "id">
): Promise<GoogleCalendarEvent> {
  const accessToken = await getGoogleCalendarToken(userId);
  if (!accessToken) {
    throw new Error("Token Google Calendar non disponible");
  }

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("[createGoogleCalendarEvent] Erreur:", error);
    throw new Error(`Erreur création événement: ${response.status}`);
  }

  return await response.json();
}

/**
 * Met à jour un événement dans Google Calendar
 */
export async function updateGoogleCalendarEvent(
  userId: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>
): Promise<GoogleCalendarEvent> {
  const accessToken = await getGoogleCalendarToken(userId);
  if (!accessToken) {
    throw new Error("Token Google Calendar non disponible");
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("[updateGoogleCalendarEvent] Erreur:", error);
    throw new Error(`Erreur mise à jour événement: ${response.status}`);
  }

  return await response.json();
}

/**
 * Supprime un événement dans Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  userId: string,
  eventId: string
): Promise<void> {
  const accessToken = await getGoogleCalendarToken(userId);
  if (!accessToken) {
    throw new Error("Token Google Calendar non disponible");
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    console.error("[deleteGoogleCalendarEvent] Erreur:", error);
    throw new Error(`Erreur suppression événement: ${response.status}`);
  }
}

/**
 * Convertit un événement Google Calendar en format interne
 */
export function convertGoogleEventToInternal(
  googleEvent: GoogleCalendarEvent,
  userId: string
) {
  const startDate = googleEvent.start.dateTime
    ? new Date(googleEvent.start.dateTime)
    : googleEvent.start.date
    ? new Date(googleEvent.start.date)
    : new Date();

  const endDate = googleEvent.end.dateTime
    ? new Date(googleEvent.end.dateTime)
    : googleEvent.end.date
    ? new Date(googleEvent.end.date)
    : new Date(startDate.getTime() + 3600000); // +1h par défaut

  return {
    userId,
    title: googleEvent.summary || "Sans titre",
    description: googleEvent.description || null,
    location: googleEvent.location || null,
    start: startDate,
    end: endDate,
    allDay: !googleEvent.start.dateTime && !!googleEvent.start.date,
    source: "GOOGLE" as const,
    externalId: googleEvent.id || null,
    calendarId: "primary",
    reminders: googleEvent.reminders
      ? {
          useDefault: googleEvent.reminders.useDefault || false,
          overrides: googleEvent.reminders.overrides || [],
        }
      : null,
    metadata: {
      attendees: googleEvent.attendees || [],
      timeZone: googleEvent.start.timeZone || "Europe/Paris",
    },
  };
}

/**
 * Convertit un événement interne en format Google Calendar
 */
export function convertInternalEventToGoogle(event: {
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end: Date;
  allDay?: boolean;
  reminders?: any;
  attendees?: Array<{ email: string }>;
}): GoogleCalendarEvent {
  const isAllDay = event.allDay || false;
  const timeZone = "Europe/Paris";

  return {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start: isAllDay
      ? { date: event.start.toISOString().split("T")[0] }
      : {
          dateTime: event.start.toISOString(),
          timeZone,
        },
    end: isAllDay
      ? { date: event.end.toISOString().split("T")[0] }
      : {
          dateTime: event.end.toISOString(),
          timeZone,
        },
    attendees: event.attendees,
    reminders: event.reminders
      ? {
          useDefault: event.reminders.useDefault || false,
          overrides: event.reminders.overrides || [],
        }
      : undefined,
  };
}

