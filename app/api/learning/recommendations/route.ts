import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { getPersonalizedRecommendations } from "@/app/lib/learning/recommendations";
import { syncPatterns } from "@/app/lib/learning/patterns";

/**
 * GET /api/learning/recommendations
 * Récupère les recommandations personnalisées pour l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const sync = searchParams.get("sync") === "true";

    // Synchroniser les patterns si demandé
    if (sync) {
      await syncPatterns(user.id);
    }

    const recommendations = await getPersonalizedRecommendations(user.id);

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /api/learning/recommendations]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}







