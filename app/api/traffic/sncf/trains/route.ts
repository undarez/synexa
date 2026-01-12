import { NextRequest, NextResponse } from "next/server";
import { getAllTrainsInCirculation, getSNCFStations } from "@/app/lib/services/sncf-trains";

/**
 * API Route pour récupérer les trains en circulation en temps réel
 * 
 * Query params:
 * - lineTypes: Types de lignes à récupérer (défaut: RER,TER)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lineTypesParam = searchParams.get("lineTypes") || "RER,TER";
    const lineTypes = lineTypesParam.split(",").map(t => t.trim());
    
    const apiKey = process.env.SNCF_API_KEY;
    
    console.log("[SNCF Trains API] Récupération trains en circulation:", { lineTypes });
    
    // Récupérer tous les trains en circulation
    const trains = await getAllTrainsInCirculation(apiKey, lineTypes);
    
    // Récupérer les gares pour les sélecteurs
    const stations = await getSNCFStations(apiKey);
    
    return NextResponse.json({
      trains,
      stations,
      lastUpdate: new Date().toISOString(),
      source: "sncf",
    });
  } catch (error) {
    console.error("[SNCF Trains API] Erreur:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Erreur serveur",
        trains: [],
        stations: [],
      },
      { status: 500 }
    );
  }
}
