import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { generateProactiveSuggestions } from "@/app/lib/ai/proactive-suggestions";
import { logger } from "@/app/lib/logger";

/**
 * GET - Récupère les suggestions proactives de Synexa
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    
    logger.info("Récupération des suggestions proactives", {
      userId: user.id,
    });

    const suggestions = await generateProactiveSuggestions(user.id);

    return NextResponse.json({
      success: true,
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    // Logger l'erreur côté serveur mais retourner un succès avec un tableau vide
    // pour éviter d'afficher des erreurs à l'utilisateur
    logger.error("Erreur lors de la génération des suggestions proactives", error);
    return NextResponse.json(
      {
        success: true,
        suggestions: [],
        count: 0,
      },
      { status: 200 }
    );
  }
}



