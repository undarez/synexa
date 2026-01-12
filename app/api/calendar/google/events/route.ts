// app/api/calendar/google/events/route.ts
// API Route pour récupérer les événements Google Calendar
// SÉCURISÉ: Les tokens sont récupérés uniquement côté serveur

import { NextRequest, NextResponse } from "next/server";
import { getGoogleCalendarEvents, hasGoogleCalendarAccess } from "@/app/lib/auth/google-calendar";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/server";

/**
 * GET /api/calendar/google/events
 * Récupère les événements Google Calendar pour l'utilisateur connecté
 * 
 * Query parameters:
 * - calendarId: ID du calendrier (par défaut: "primary")
 * - maxResults: Nombre maximum d'événements (par défaut: 10)
 * - timeMin: Date de début ISO (optionnel)
 * - timeMax: Date de fin ISO (optionnel)
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    await requireUser();

    // Vérifier l'accès Google Calendar
    const hasAccess = await hasGoogleCalendarAccess();
    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: "Accès Google Calendar non disponible. Veuillez vous reconnecter avec Google." 
        },
        { status: 403 }
      );
    }

    // Récupérer les paramètres de la requête
    const searchParams = request.nextUrl.searchParams;
    const calendarId = searchParams.get("calendarId") || "primary";
    const maxResults = parseInt(searchParams.get("maxResults") || "10", 10);
    const timeMin = searchParams.get("timeMin") ? new Date(searchParams.get("timeMin")!) : undefined;
    const timeMax = searchParams.get("timeMax") ? new Date(searchParams.get("timeMax")!) : undefined;

    // Récupérer les événements (token récupéré côté serveur automatiquement)
    const events = await getGoogleCalendarEvents(calendarId, maxResults, timeMin, timeMax);
    
    return NextResponse.json({ events });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    console.error("[GET /api/calendar/google/events] Erreur:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
