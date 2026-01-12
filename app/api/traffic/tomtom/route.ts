import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import { getTomTomTrafficIncidents, calculateBboxFromBounds } from "@/app/lib/services/tomtom-traffic";

/**
 * API Route pour récupérer les incidents de trafic réels depuis TomTom
 * 
 * Query params:
 * - bbox: Bounding box au format "minLon,minLat,maxLon,maxLat" (optionnel)
 * - northEast: Coordonnées nord-est "lat,lng" (optionnel, avec southWest)
 * - southWest: Coordonnées sud-ouest "lat,lng" (optionnel, avec northEast)
 * 
 * Si bbox n'est pas fourni, on calcule depuis northEast et southWest
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    
    const apiKey = process.env.TOMTOM_API_KEY;
    
    if (!apiKey) {
      console.warn("[TomTom API] TOMTOM_API_KEY non configurée");
      return NextResponse.json(
        { error: "Configuration API manquante", incidents: [] },
        { status: 500 }
      );
    }

    let bbox: string;

    // Option 1: BBOX directement fournie
    const bboxParam = searchParams.get("bbox");
    if (bboxParam) {
      bbox = bboxParam;
    } else {
      // Option 2: Calculer depuis les bounds de la carte
      const northEastParam = searchParams.get("northEast");
      const southWestParam = searchParams.get("southWest");
      
      if (northEastParam && southWestParam) {
        const [neLat, neLng] = northEastParam.split(",").map(Number);
        const [swLat, swLng] = southWestParam.split(",").map(Number);
        
        bbox = calculateBboxFromBounds(
          { lat: neLat, lng: neLng },
          { lat: swLat, lng: swLng }
        );
      } else {
        return NextResponse.json(
          { error: "BBOX ou bounds requis", incidents: [] },
          { status: 400 }
        );
      }
    }

    console.log("[TomTom API] Récupération incidents réels, BBOX:", bbox);

    // Récupérer les incidents réels depuis TomTom
    const trafficData = await getTomTomTrafficIncidents(bbox, apiKey);

    return NextResponse.json({
      incidents: trafficData.incidents,
      lastUpdate: trafficData.lastUpdate,
      bbox: trafficData.bbox,
      source: "tomtom",
    });
  } catch (error) {
    console.error("[TomTom API] Erreur:", error);
    
    // Si c'est une erreur 400 de TomTom, retourner un statut 200 avec des incidents vides
    // plutôt qu'une erreur 500 pour éviter de planter l'interface
    if (error instanceof Error && error.message.includes("400")) {
      return NextResponse.json(
        { 
          error: "Format BBOX invalide ou zone trop petite",
          incidents: [],
          source: "tomtom",
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Erreur serveur",
        incidents: [],
        source: "tomtom",
      },
      { status: 200 } // Retourner 200 même en cas d'erreur pour éviter de planter l'interface
    );
  }
}
