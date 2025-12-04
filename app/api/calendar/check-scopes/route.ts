import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";
import { getGoogleCalendarToken } from "@/app/lib/google-calendar";

/**
 * Route de débogage pour vérifier les scopes Google Calendar
 */
export async function GET() {
  try {
    const user = await requireUser();
    
    const account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: "google",
      },
      select: {
        scope: true,
        access_token: true,
        expires_at: true,
        providerAccountId: true,
      },
    });

    if (!account) {
      return NextResponse.json({
        hasAccount: false,
        message: "Aucun compte Google trouvé",
      });
    }

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
      hasAccount: true,
      scope: account.scope,
      hasToken: !!token,
      tokenExpired: account.expires_at ? account.expires_at * 1000 < Date.now() : null,
      scopeContainsCalendar: account.scope?.includes("calendar") || false,
      apiTest,
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









