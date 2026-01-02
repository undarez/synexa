import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { detectPatterns } from "@/app/lib/learning/patterns";
import { analyzeRecentPatterns } from "@/app/lib/learning/tracker";
import prisma from "@/app/lib/prisma";

/**
 * GET /api/learning/patterns
 * Récupère les patterns d'utilisation de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30");

    // Récupérer les patterns appris
    const learnedPatterns = await prisma.userLearning.findMany({
      where: { userId: user.id },
      orderBy: [{ confidence: "desc" }, { frequency: "desc" }],
    });

    // Analyser les patterns récents
    const recentPatterns = await analyzeRecentPatterns(user.id, days);

    // Détecter de nouveaux patterns
    const detectedPatterns = await detectPatterns(user.id);

    return NextResponse.json({
      success: true,
      learned: learnedPatterns,
      recent: recentPatterns,
      detected: detectedPatterns,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /api/learning/patterns]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}







