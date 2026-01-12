/**
 * Route API pour les messages Cinexa
 * 
 * Point d'entrée principal pour toutes les interactions utilisateur
 * 
 * POST /api/cinexa/message
 * {
 *   message: string,
 *   source?: "dashboard" | "mobile" | "voice" | "routine" | "api"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/server";
import { handleUserMessage } from "@/app/lib/cinexa/core";
import type { CinexaSource } from "@/app/lib/cinexa/types";

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification
    const user = await requireUser();

    // 2. Parser le body
    const body = await request.json();
    const { message, source = "dashboard" } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message requis (string)" },
        { status: 400 }
      );
    }

    // 3. Appeler le Cinexa Core Agent
    const result = await handleUserMessage(
      user.id,
      message,
      source as CinexaSource
    );

    // 4. Retourner le résultat
    return NextResponse.json({
      success: result.success,
      message: result.userMessage,
      intent: result.intent.intent,
      agents: result.intent.requiredAgents,
      executionTime: result.totalDuration,
      // Optionnel : retourner plus de détails en dev
      ...(process.env.NODE_ENV === "development" && {
        details: {
          plan: result.plan,
          steps: result.steps.map(s => ({
            agent: s.step.agent,
            action: s.step.action,
            success: s.output.success,
          })),
        },
      }),
    });
  } catch (error) {
    console.error("[Cinexa API] Erreur:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur serveur",
        message: "Une erreur est survenue. Veuillez réessayer.",
      },
      { status: 500 }
    );
  }
}
