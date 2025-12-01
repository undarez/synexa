import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { parseNaturalLanguageEvent } from "@/app/lib/ai/event-parser";

/**
 * Parse un texte en langage naturel pour créer un événement
 * POST /api/calendar/parse
 * 
 * Body: { text: string, referenceDate?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    if (!body.text || typeof body.text !== "string") {
      return NextResponse.json(
        { error: "Le champ 'text' est requis" },
        { status: 400 }
      );
    }

    const referenceDate = body.referenceDate
      ? new Date(body.referenceDate)
      : new Date();

    const parsedEvent = await parseNaturalLanguageEvent(
      body.text,
      referenceDate
    );

    return NextResponse.json({
      success: true,
      event: parsedEvent,
    });
  } catch (error) {
    console.error("[POST /api/calendar/parse]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors du parsing",
      },
      { status: 400 }
    );
  }
}




