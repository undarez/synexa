import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { getTrafficFromOpenRouteService } from "@/app/lib/services/traffic";
import { geocodeAddress } from "@/app/lib/services/tomtom-geocoding";

/**
 * API pour récupérer les données de trafic autour d'une position
 * Retourne les incidents de trafic et les conditions autour de l'utilisateur
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

    // Simuler des incidents de trafic autour de la position
    // Dans un vrai projet, vous utiliseriez une API de trafic en temps réel
    const incidents = generateTrafficIncidents(userLat, userLng);

    return NextResponse.json({
      origin: "Position actuelle",
      destination: "Zone autour de vous",
      userLocation: { lat: userLat, lng: userLng },
      destinationLocation: null,
      routes: [],
      incidents,
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

/**
 * Génère des incidents de trafic simulés autour d'une position
 * Dans un vrai projet, utilisez une API de trafic en temps réel
 */
function generateTrafficIncidents(
  centerLat: number,
  centerLng: number
): Array<{
  id: string;
  type: string;
  severity: "low" | "medium" | "high";
  lat: number;
  lng: number;
  description: string;
  delay?: number;
  distance?: number;
}> {
  const incidents = [];
  const types = [
    { name: "Accident", severity: "high" as const, delay: 15 },
    { name: "Bouchon", severity: "medium" as const, delay: 8 },
    { name: "Travaux", severity: "low" as const, delay: 5 },
    { name: "Ralentissement", severity: "low" as const, delay: 3 },
  ];

  // Générer 3-5 incidents aléatoires dans un rayon de 5km
  const numIncidents = Math.floor(Math.random() * 3) + 3;
  
  for (let i = 0; i < numIncidents; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * 0.05; // ~5km max
    const latOffset = distance * Math.cos(angle);
    const lngOffset = distance * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);

    incidents.push({
      id: `incident-${i}-${Date.now()}`,
      type: type.name,
      severity: type.severity,
      lat: centerLat + latOffset,
      lng: centerLng + lngOffset,
      description: `${type.name} détecté sur la route`,
      delay: type.delay,
      distance: distance * 111, // Convertir en km approximatif
    });
  }

  return incidents;
}

