import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { 
  getTrafficFromTomTom,
  getTrafficFlowFromTomTom,
  getTrafficIncidentsFromTomTom
} from "@/app/lib/services/traffic";

/**
 * GET /api/traffic/automation
 * API pour l'automatisation - retourne des données de trafic structurées
 * 
 * Query params:
 * - originLat, originLng: Position de départ
 * - destinationLat, destinationLng: Position d'arrivée
 * - includeIncidents: Inclure les incidents (default: true)
 * - includeFlow: Inclure les données de flux (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    
    const originLat = searchParams.get("originLat");
    const originLng = searchParams.get("originLng");
    const destinationLat = searchParams.get("destinationLat");
    const destinationLng = searchParams.get("destinationLng");
    const includeIncidents = searchParams.get("includeIncidents") !== "false";
    const includeFlow = searchParams.get("includeFlow") !== "false";

    if (!originLat || !originLng || !destinationLat || !destinationLng) {
      return NextResponse.json(
        { error: "Les coordonnées d'origine et de destination sont requises" },
        { status: 400 }
      );
    }

    const parsedOriginLat = parseFloat(originLat);
    const parsedOriginLng = parseFloat(originLng);
    const parsedDestLat = parseFloat(destinationLat);
    const parsedDestLng = parseFloat(destinationLng);

    if (
      isNaN(parsedOriginLat) ||
      isNaN(parsedOriginLng) ||
      isNaN(parsedDestLat) ||
      isNaN(parsedDestLng)
    ) {
      return NextResponse.json(
        { error: "Coordonnées invalides" },
        { status: 400 }
      );
    }

    // Récupérer les données de trafic
    const trafficData = await getTrafficFromTomTom(
      parsedOriginLat,
      parsedOriginLng,
      parsedDestLat,
      parsedDestLng,
      "Destination"
    );

    if (!trafficData) {
      return NextResponse.json(
        { error: "Impossible de récupérer les données de trafic" },
        { status: 500 }
      );
    }

    const result: any = {
      success: true,
      timestamp: new Date().toISOString(),
      origin: {
        lat: parsedOriginLat,
        lng: parsedOriginLng,
      },
      destination: {
        lat: parsedDestLat,
        lng: parsedDestLng,
      },
      routes: trafficData.routes.map((route) => ({
        name: route.name,
        duration: route.durationSeconds,
        distance: route.distanceMeters,
        traffic: route.traffic,
        status: route.status,
        details: route.details,
      })),
      bestRoute: trafficData.routes[0] ? {
        duration: trafficData.routes[0].durationSeconds,
        distance: trafficData.routes[0].distanceMeters,
        traffic: trafficData.routes[0].traffic,
        status: trafficData.routes[0].status,
      } : null,
    };

    // Ajouter les incidents si demandé
    if (includeIncidents) {
      const bbox = [
        Math.min(parsedOriginLng, parsedDestLng) - 0.1,
        Math.min(parsedOriginLat, parsedDestLat) - 0.1,
        Math.max(parsedOriginLng, parsedDestLng) + 0.1,
        Math.max(parsedOriginLat, parsedDestLat) + 0.1,
      ].join(",");

      const incidents = await getTrafficIncidentsFromTomTom(bbox);
      
      result.incidents = incidents?.incidents?.map((incident: any) => ({
        type: incident.type,
        lat: incident.geometry.coordinates[1],
        lng: incident.geometry.coordinates[0],
        description: incident.properties.description,
        delay: incident.properties.delay,
        category: incident.properties.iconCategory,
      })) || [];
    }

    // Ajouter les données de flux si demandé
    if (includeFlow) {
      const flow = await getTrafficFlowFromTomTom(
        parsedOriginLat,
        parsedOriginLng
      );
      
      result.trafficFlow = flow ? {
        currentSpeed: flow.currentSpeed,
        freeFlowSpeed: flow.freeFlowSpeed,
        coordinates: {
          lat: parsedOriginLat,
          lng: parsedOriginLng,
        },
      } : null;
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /traffic/automation]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

