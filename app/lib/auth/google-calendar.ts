// app/lib/auth/google-calendar.ts
// Utilitaires pour interagir avec Google Calendar API

import { createServerComponentClient } from "@/app/lib/supabase/server-client";

/**
 * Récupère le provider_token Google depuis la session Supabase (côté serveur)
 * SÉCURISÉ: Ne retourne le token que côté serveur, jamais exposé au client
 * 
 * ⚠️ IMPORTANT: Cette fonction doit être appelée uniquement depuis :
 * - Server Actions
 * - API Routes
 * - Server Components
 * 
 * Ne JAMAIS appeler depuis un Client Component
 */
export async function getGoogleCalendarToken(): Promise<string | null> {
  try {
    const supabase = await createServerComponentClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[getGoogleCalendarToken] Pas de session:", error?.message);
      }
      return null;
    }

    // Récupérer le provider_token (token Google OAuth)
    const providerToken = session.provider_token;

    if (!providerToken) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("[getGoogleCalendarToken] ⚠️ Aucun provider_token dans la session");
        console.warn("[getGoogleCalendarToken] Assurez-vous que les scopes Google Calendar sont demandés lors de la connexion");
        console.warn("[getGoogleCalendarToken] Vérifiez que access_type=offline et prompt=consent sont dans queryParams");
      }
      return null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log("[getGoogleCalendarToken] ✅ Token Google récupéré (longueur:", providerToken.length, ")");
    }

    return providerToken;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("[getGoogleCalendarToken] Erreur:", error);
    }
    return null;
  }
}

/**
 * Récupère le refresh_token Google depuis la session Supabase (côté serveur)
 * SÉCURISÉ: Ne retourne le token que côté serveur
 */
export async function getGoogleRefreshToken(): Promise<string | null> {
  try {
    const supabase = await createServerComponentClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.provider_refresh_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Vérifie si l'utilisateur a accès à Google Calendar
 * Teste le token en faisant un appel API minimal
 */
export async function hasGoogleCalendarAccess(): Promise<boolean> {
  const accessToken = await getGoogleCalendarToken();
  if (!accessToken) return false;

  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Récupère les événements Google Calendar (exemple d'utilisation)
 * ⚠️ À appeler uniquement depuis une Server Action ou API Route (jamais côté client)
 * 
 * @param calendarId - ID du calendrier (par défaut: "primary")
 * @param maxResults - Nombre maximum d'événements à récupérer
 * @param timeMin - Date de début (optionnel)
 * @param timeMax - Date de fin (optionnel)
 */
export async function getGoogleCalendarEvents(
  calendarId: string = "primary",
  maxResults: number = 10,
  timeMin?: Date,
  timeMax?: Date
) {
  const accessToken = await getGoogleCalendarToken();
  if (!accessToken) {
    throw new Error("Token Google Calendar non disponible. Veuillez vous reconnecter.");
  }

  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(maxResults),
  });

  if (timeMin) {
    params.append("timeMin", timeMin.toISOString());
  }
  if (timeMax) {
    params.append("timeMax", timeMax.toISOString());
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Erreur Google Calendar: ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.items || [];
}
