import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";
import { 
  getTrafficFromTomTom, 
  getTrafficFromGoogleMaps, 
  getWazeDeepLink, 
  getWazeRouteDeepLink 
} from "@/app/lib/services/traffic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    
    // Récupérer l'adresse travail de l'utilisateur si disponible
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { workAddress: true, workLat: true, workLng: true },
    });
    
    const destination = userProfile?.workAddress || searchParams.get("destination") || "Travail";
    const destinationLat = userProfile?.workLat;
    const destinationLng = userProfile?.workLng;

    // Si géolocalisation fournie, l'utiliser
    let userLocation: { lat: number; lng: number } | null = null;
    
    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        userLocation = {
          lat: parsedLat,
          lng: parsedLng,
        };
      }
    }

    // Toujours générer les liens Waze si on a les coordonnées
    let wazeLinks: { destination: string; route: string } | undefined;
    if (userLocation) {
      if (destinationLat && destinationLng) {
        // Si on a une destination avec coordonnées, générer le lien de route complète
        wazeLinks = {
          destination: getWazeDeepLink(destinationLat, destinationLng, destination),
          route: getWazeRouteDeepLink(
            userLocation.lat,
            userLocation.lng,
            destinationLat,
            destinationLng
          ),
        };
      } else {
        // Si pas de destination, générer juste un lien vers la position actuelle
        // L'utilisateur pourra choisir sa destination dans Waze
        wazeLinks = {
          destination: getWazeDeepLink(userLocation.lat, userLocation.lng, "Position actuelle"),
          route: getWazeDeepLink(userLocation.lat, userLocation.lng, "Position actuelle"),
        };
      }
    }

    // Si on a une position utilisateur, essayer TomTom en priorité
    if (userLocation) {
      // Si on a une destination avec coordonnées, utiliser TomTom
      if (destinationLat && destinationLng) {
        console.log("[Traffic API] Tentative d'appel TomTom avec:", {
          origin: `${userLocation.lat},${userLocation.lng}`,
          destination: `${destinationLat},${destinationLng}`,
        });
        
        // Essayer TomTom en premier (gratuit, 2500 requêtes/jour)
        const tomtomTraffic = await getTrafficFromTomTom(
          userLocation.lat,
          userLocation.lng,
          destinationLat,
          destinationLng,
          destination
        );

        if (tomtomTraffic) {
          console.log("[Traffic API] ✅ Données TomTom récupérées avec succès");
          return NextResponse.json({
            ...tomtomTraffic,
            wazeLinks,
          });
        } else {
          console.log("[Traffic API] ⚠️ TomTom n'a pas retourné de données");
        }

        // Fallback sur Google Maps si TomTom n'est pas disponible
        const googleTraffic = await getTrafficFromGoogleMaps(
          userLocation.lat,
          userLocation.lng,
          destinationLat,
          destinationLng,
          destination
        );

        if (googleTraffic) {
          return NextResponse.json({
            ...googleTraffic,
            wazeLinks,
          });
        }
      }
      // Si pas de destination mais qu'on a la position, on peut toujours retourner les liens Waze
      // Les données de trafic nécessitent une destination
    }

    // Fallback : simulation si Google Maps n'est pas disponible ou si pas de coordonnées
    const routes = [
      {
        name: "Itinéraire principal",
        duration: "25 min",
        durationSeconds: 1500,
        distance: "12 km",
        distanceMeters: 12000,
        traffic: "Fluide",
        status: "good" as const,
        details: "Aucun incident signalé sur votre itinéraire",
        polyline: userLocation ? [
          { lat: userLocation.lat, lng: userLocation.lng },
          { lat: userLocation.lat + 0.1, lng: userLocation.lng + 0.1 },
          { lat: userLocation.lat + 0.2, lng: userLocation.lng + 0.15 },
        ] : undefined,
      },
      {
        name: "Itinéraire alternatif",
        duration: "28 min",
        durationSeconds: 1680,
        distance: "14 km",
        distanceMeters: 14000,
        traffic: "Modéré",
        status: "moderate" as const,
        details: "Quelques ralentissements sur le périphérique",
        polyline: userLocation ? [
          { lat: userLocation.lat, lng: userLocation.lng },
          { lat: userLocation.lat + 0.15, lng: userLocation.lng + 0.05 },
          { lat: userLocation.lat + 0.25, lng: userLocation.lng + 0.2 },
        ] : undefined,
      },
    ];

    // Les liens Waze sont déjà générés plus haut si disponibles

    return NextResponse.json({
      origin: userLocation ? `${userLocation.lat},${userLocation.lng}` : "Paris",
      destination,
      userLocation,
      destinationLocation: destinationLat && destinationLng ? {
        lat: destinationLat,
        lng: destinationLng,
      } : null,
      routes,
      lastUpdate: new Date().toISOString(),
      source: "simulation",
      wazeLinks,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /traffic]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

