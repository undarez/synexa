import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
import { getGoogleCalendarToken } from "@/app/lib/google-calendar";

/**
 * Route de débogage pour vérifier les scopes Google Calendar
 */
export async function GET() {
  try {
    const user = await requireUser();
    
    // TODO: Récupérer les informations du compte Google depuis Supabase Auth
    // Pour l'instant, on vérifie juste si un token est disponible
    const token = await getGoogleCalendarToken(user.id);
    
    // Tester directement avec l'API Google
    let apiTest = null;
    if (token) {
      try {
        const testResponse = await fetch(
          "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        apiTest = {
          status: testResponse.status,
          ok: testResponse.ok,
          message: testResponse.ok ? "API accessible" : await testResponse.text().catch(() => "Erreur inconnue"),
        };
      } catch (error) {
        apiTest = {
          error: error instanceof Error ? error.message : "Erreur lors du test",
        };
      }
    }

    return NextResponse.json({
      hasAccount: !!token,
      hasToken: !!token,
      message: token ? "Token Google Calendar disponible" : "Aucun token Google Calendar trouvé",
      apiTest,
      note: "Les informations de scope nécessiteront Supabase Auth pour être complètes",
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









