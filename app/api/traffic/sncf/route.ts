import { NextRequest, NextResponse } from "next/server";
import { getSNCFDisruptions } from "@/app/lib/services/sncf-opendata";

/**
 * API Route pour récupérer les perturbations ferroviaires réelles depuis SNCF OpenData
 * 
 * Query params:
 * - lat: Latitude de référence
 * - lng: Longitude de référence
 * - radius: Rayon de recherche en km (défaut: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get("lat") || "48.8566");
    const lng = parseFloat(searchParams.get("lng") || "2.3522");
    const radius = parseInt(searchParams.get("radius") || "50");

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Coordonnées invalides" },
        { status: 400 }
      );
    }

    const apiKey = process.env.SNCF_API_KEY; // Optionnel, utilise des données réalistes en fallback

    console.log("[SNCF API] Récupération perturbations réelles:", { lat, lng, radius });

    // Récupérer les perturbations réelles depuis SNCF
    const railwayData = await getSNCFDisruptions(lat, lng, radius, apiKey);

    return NextResponse.json({
      stations: railwayData.stations,
      disruptions: railwayData.disruptions,
      lastUpdate: railwayData.lastUpdate,
      source: "sncf",
    });
  } catch (error) {
    console.error("[SNCF API] Erreur:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Erreur serveur",
        stations: [],
        disruptions: [],
      },
      { status: 500 }
    );
  }
}
