// app/lib/google-calendar/supabase.ts
// Fonctions utilitaires pour utiliser Google Calendar avec les tokens Supabase

import { getBrowserClient } from "@/app/lib/supabase/client-browser";
import type { Session } from "@supabase/supabase-js";

/**
 * Récupère le token Google depuis la session Supabase
 * @returns Le provider_token (Google Access Token) ou null
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  const supabase = getBrowserClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    if (process.env.NODE_ENV === 'development') {
      console.error("[Google Calendar] Erreur lors de la récupération de la session:", error);
    }
    return null;
  }

  if (!session.provider_token) {
    if (process.env.NODE_ENV === 'development') {
      console.warn("[Google Calendar] provider_token non présent dans la session");
      console.warn("[Google Calendar] Vérifiez que les scopes Calendar sont correctement configurés");
    }
    return null;
  }

  return session.provider_token;
}

/**
 * Récupère le refresh token Google depuis la session Supabase
 * @returns Le provider_refresh_token (Google Refresh Token) ou null
 */
export async function getGoogleRefreshToken(): Promise<string | null> {
  const supabase = getBrowserClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session.provider_refresh_token || null;
}

/**
 * Récupère la session Supabase complète
 * @returns La session Supabase ou null
 */
export async function getSupabaseSession(): Promise<Session | null> {
  const supabase = getBrowserClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("[Google Calendar] Erreur lors de la récupération de la session:", error);
    }
    return null;
  }

  return session;
}

/**
 * Vérifie si l'utilisateur a un accès Google Calendar valide
 * @returns true si provider_token est présent, false sinon
 */
export async function hasGoogleCalendarAccess(): Promise<boolean> {
  const token = await getGoogleAccessToken();
  return token !== null;
}

/**
 * Appelle l'API Google Calendar pour récupérer les événements
 * @param calendarId ID du calendrier (par défaut: 'primary')
 * @param maxResults Nombre maximum de résultats (par défaut: 10)
 * @returns Les événements du calendrier ou null en cas d'erreur
 */
export async function getGoogleCalendarEvents(
  calendarId: string = 'primary',
  maxResults: number = 10
): Promise<Array<{
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
  location?: string;
}> | null> {
  try {
    const accessToken = await getGoogleAccessToken();

    if (!accessToken) {
      if (process.env.NODE_ENV === 'development') {
        console.error("[Google Calendar] Token Google non disponible");
      }
      return null;
    }

    // Construire l'URL de l'API Google Calendar
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`);
    url.searchParams.set('maxResults', maxResults.toString());
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('timeMin', new Date().toISOString());

    // Appel API Google Calendar
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
      
      if (process.env.NODE_ENV === 'development') {
        console.error("[Google Calendar] Erreur API:", response.status, errorData);
        
        if (response.status === 401) {
          console.error("[Google Calendar] Token expiré - Utilisez provider_refresh_token pour rafraîchir");
        } else if (response.status === 403) {
          console.error("[Google Calendar] Permission refusée - Vérifiez que Google Calendar API est activée");
        }
      }
      
      return null;
    }

    const data = await response.json();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Google Calendar] ✅ ${data.items?.length || 0} événements récupérés`);
    }

    return data.items || [];
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("[Google Calendar] Erreur lors de la récupération des événements:", error);
    }
    return null;
  }
}

/**
 * Crée un événement dans Google Calendar
 * @param event Données de l'événement
 * @param calendarId ID du calendrier (par défaut: 'primary')
 * @returns L'événement créé ou null en cas d'erreur
 */
export async function createGoogleCalendarEvent(
  event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string } | { date: string };
    end: { dateTime: string; timeZone?: string } | { date: string };
    location?: string;
  },
  calendarId: string = 'primary'
): Promise<{
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
} | null> {
  try {
    const accessToken = await getGoogleAccessToken();

    if (!accessToken) {
      if (process.env.NODE_ENV === 'development') {
        console.error("[Google Calendar] Token Google non disponible");
      }
      return null;
    }

    // Appel API Google Calendar pour créer l'événement
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
      
      if (process.env.NODE_ENV === 'development') {
        console.error("[Google Calendar] Erreur lors de la création de l'événement:", response.status, errorData);
      }
      
      return null;
    }

    const createdEvent = await response.json();
    
    if (process.env.NODE_ENV === 'development') {
      console.log("[Google Calendar] ✅ Événement créé:", createdEvent.id);
    }

    return createdEvent;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("[Google Calendar] Erreur lors de la création de l'événement:", error);
    }
    return null;
  }
}
