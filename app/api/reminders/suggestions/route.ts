import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { suggestReminders, createSuggestedReminders } from "@/app/lib/reminders/suggestions";

/**
 * GET - Récupère les suggestions de rappels
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const daysAhead = parseInt(url.searchParams.get("daysAhead") || "7", 10);

    const suggestions = await suggestReminders(user.id, daysAhead);

    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /reminders/suggestions]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

/**
 * POST - Crée les rappels suggérés pour un événement
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { eventId, minutesBefore } = body;

    if (!eventId || !Array.isArray(minutesBefore)) {
      return NextResponse.json(
        { error: "eventId et minutesBefore (array) sont requis" },
        { status: 400 }
      );
    }

    const created = await createSuggestedReminders(user.id, eventId, minutesBefore);

    return NextResponse.json({
      message: `${created} rappel(s) créé(s)`,
      created,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[POST /reminders/suggestions]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}


