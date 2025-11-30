import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { parseNaturalLanguageRoutine } from "@/app/lib/ai/routine-parser";

/**
 * Parse un texte en langage naturel pour créer une routine
 * POST /api/routines/parse
 * 
 * Body: { text: string }
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

    const parsedRoutine = await parseNaturalLanguageRoutine(
      body.text,
      user.id
    );

    return NextResponse.json({
      success: true,
      routine: parsedRoutine,
    });
  } catch (error) {
    console.error("[POST /api/routines/parse]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors du parsing",
      },
      { status: 400 }
    );
  }
}



