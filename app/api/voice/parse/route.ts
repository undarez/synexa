import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { parseVoiceCommand } from "@/app/lib/ai/voice-commands";
import { trackActivity } from "@/app/lib/learning/tracker";

/**
 * Parse une commande vocale
 * POST /api/voice/parse
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

    const command = await parseVoiceCommand(body.text, user.id);

    // Tracker l'activité de commande vocale
    await trackActivity(
      user.id,
      "voice_command",
      {
        commandType: command.type,
        action: command.action,
        confidence: command.confidence,
      }
    );

    return NextResponse.json({
      success: true,
      command,
    });
  } catch (error) {
    console.error("[POST /api/voice/parse]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors du parsing",
      },
      { status: 400 }
    );
  }
}


