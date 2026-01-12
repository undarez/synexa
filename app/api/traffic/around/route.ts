import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";

/**
 * API pour récupérer les données de trafic autour d'une position
 * Retourne les incidents de trafic en temps réel autour de l'utilisateur ou en France
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Coordonnées requises" },
        { status: 400 }
      );
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (isNaN(userLat) || isNaN(userLng)) {
      return NextResponse.json(
        { error: "Coordonnées invalides" },
        { status: 400 }
      );
    }

    // Calculer la bounding box pour la France entière ou autour de l'utilisateur
    // Si l'utilisateur est en France, on utilise un rayon de 100km autour de sa position
    // Sinon, on utilise les limites de la France métropolitaine
    const isInFrance = userLat >= 41.0 && userLat <= 51.0 && userLng >= -5.0 && userLng <= 10.0;
    
    let bbox: string;
    if (isInFrance) {
      // Rayon de 100km autour de la position utilisateur (environ 0.9 degrés)
      const radius = 0.9;
      bbox = [
        userLng - radius, // minLon
        userLat - radius, // minLat
        userLng + radius, // maxLon
        userLat + radius, // maxLat
      ].join(",");
    } else {
      // Bounding box de la France métropolitaine
      bbox = "-5.0,41.0,10.0,51.0";
    }

    console.log("[Traffic Around API] Récupération des incidents en temps réel...", {
      userLocation: { lat: userLat, lng: userLng },
      bbox,
      isInFrance,
    });

    // Pas d'incidents simulés - retourner un tableau vide
    console.log("[Traffic Around API] Aucun incident simulé - fonctionnalité désactivée");
    return NextResponse.json({
      origin: "Position actuelle",
      destination: "Zone autour de vous",
      userLocation: { lat: userLat, lng: userLng },
      destinationLocation: null,
      routes: [],
      incidents: [], // Pas d'incidents simulés
      lastUpdate: new Date().toISOString(),
      source: "openrouteservice",
    });
  } catch (error) {
    console.error("[Traffic Around API] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}






