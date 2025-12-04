import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";

// Simulation d'API actualités - À remplacer par une vraie API (NewsAPI, RSS, etc.)
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get("source") || "general";

    // Simulation de données actualités réalistes
    const articles = [
      {
        title: "Actualités du jour",
        source: "Le Monde",
        summary: "Les principales informations de la journée",
        url: "#",
        publishedAt: new Date().toISOString(),
      },
      {
        title: "Météo : Belle journée ensoleillée prévue",
        source: "Météo France",
        summary: "Températures agréables avec un ciel dégagé",
        url: "#",
        publishedAt: new Date().toISOString(),
      },
      {
        title: "Trafic : Circulation normale sur les grands axes",
        source: "Bison Futé",
        summary: "Pas de perturbation majeure signalée",
        url: "#",
        publishedAt: new Date().toISOString(),
      },
    ];

    return NextResponse.json({
      source,
      articles,
      lastUpdate: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /news]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}










