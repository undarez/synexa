import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";
import { 
  getTrafficFromTomTom, 
  getTrafficFromOpenRouteService,
  getTrafficFromGoogleMaps, 
  getTrafficFlowFromTomTom,
  getTrafficIncidentsFromTomTom
} from "@/app/lib/services/traffic";
import { geocodeAddress } from "@/app/lib/services/tomtom-geocoding";

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
    
    const destinationText = userProfile?.workAddress || searchParams.get("destination") || "Travail";
    let destinationLat = userProfile?.workLat;
    let destinationLng = userProfile?.workLng;
    let destination = destinationText;
    
    // Si on a une destination textuelle mais pas de coordonnées, géocodifier
    if (destinationText && (!destinationLat || !destinationLng) && destinationText !== "Travail") {
      console.log("[Traffic API] Géocodification de la destination:", destinationText);
      const geocoded = await geocodeAddress(destinationText);
      if (geocoded) {
        destinationLat = geocoded.lat;
        destinationLng = geocoded.lng;
        destination = geocoded.formattedAddress;
        console.log("[Traffic API] ✅ Destination géocodifiée:", { lat: destinationLat, lng: destinationLng, address: destination });
      } else {
        console.warn("[Traffic API] ⚠️ Impossible de géocodifier la destination:", destinationText);
      }
    }

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


    // Si on a une position utilisateur, essayer TomTom en priorité
    if (userLocation) {
      // Vérifier si TomTom est configuré
      const tomtomApiKey = process.env.TOMTOM_API_KEY;
      
      console.log("[Traffic API] 🔍 Vérification configuration:", {
        hasUserLocation: !!userLocation,
        hasDestination: !!(destinationLat && destinationLng),
        hasTomTomKey: !!tomtomApiKey,
        destinationLat,
        destinationLng,
      });
      
      if (!tomtomApiKey) {
        console.warn("[Traffic API] ⚠️ TOMTOM_API_KEY non configurée - mode simulation activé");
        console.warn("[Traffic API] Ajoutez TOMTOM_API_KEY dans votre .env pour des données en temps réel");
      } else {
        // Si on a une destination avec coordonnées, utiliser OpenRouteService (GRATUIT et OPEN-SOURCE)
        if (destinationLat && destinationLng) {
          console.log("[Traffic API] Tentative d'appel OpenRouteService avec:", {
            origin: `${userLocation.lat},${userLocation.lng}`,
            destination: `${destinationLat},${destinationLng}`,
          });
          
          // Essayer OpenRouteService en premier (GRATUIT, OPEN-SOURCE, basé sur OpenStreetMap)
          const openRouteTraffic = await getTrafficFromOpenRouteService(
            userLocation.lat,
            userLocation.lng,
            destinationLat,
            destinationLng,
            destination
          );

          if (openRouteTraffic) {
            console.log("[Traffic API] ✅ Données OpenRouteService récupérées avec succès");
            
            // Récupérer les incidents de trafic dans la zone (si TomTom est configuré)
            const bbox = [
              Math.min(userLocation.lng, destinationLng) - 0.1,
              Math.min(userLocation.lat, destinationLat) - 0.1,
              Math.max(userLocation.lng, destinationLng) + 0.1,
              Math.max(userLocation.lat, destinationLat) + 0.1,
            ].join(",");
            
            const incidents = await getTrafficIncidentsFromTomTom(bbox);
            
            // Récupérer les données de flux de trafic pour la position utilisateur
            const trafficFlow = await getTrafficFlowFromTomTom(
              userLocation.lat,
              userLocation.lng
            );
            
            // Convertir les incidents au format attendu
            const formattedIncidents = (incidents?.incidents || []).map((incident: any, idx: number) => ({
              id: `incident-${idx}-${Date.now()}`,
              type: incident.properties?.iconCategory?.toString() || incident.type || "Incident",
              severity: incident.properties?.delay && incident.properties.delay > 10 ? "high" as const :
                       incident.properties?.delay && incident.properties.delay > 5 ? "medium" as const : "low" as const,
              lat: incident.geometry?.coordinates?.[1] || incident.lat,
              lng: incident.geometry?.coordinates?.[0] || incident.lng,
              description: incident.properties?.description || incident.description || "Incident de trafic",
              delay: incident.properties?.delay ? Math.round(incident.properties.delay / 60) : incident.delay,
              distance: incident.distance,
            }));

            return NextResponse.json({
              ...openRouteTraffic,
              incidents: formattedIncidents,
              trafficFlow: trafficFlow ? [trafficFlow] : [],
            });
          }
          
          // Fallback sur TomTom si OpenRouteService échoue
          console.log("[Traffic API] OpenRouteService n'a pas fonctionné, essai avec TomTom...");
          const tomtomTraffic = await getTrafficFromTomTom(
            userLocation.lat,
            userLocation.lng,
            destinationLat,
            destinationLng,
            destination
          );

          if (tomtomTraffic) {
            console.log("[Traffic API] ✅ Données TomTom récupérées avec succès");
            
            // Récupérer les incidents de trafic dans la zone
            const bbox = [
              Math.min(userLocation.lng, destinationLng) - 0.1,
              Math.min(userLocation.lat, destinationLat) - 0.1,
              Math.max(userLocation.lng, destinationLng) + 0.1,
              Math.max(userLocation.lat, destinationLat) + 0.1,
            ].join(",");
            
            const incidents = await getTrafficIncidentsFromTomTom(bbox);
            
            // Récupérer les données de flux de trafic pour la position utilisateur
            const trafficFlow = await getTrafficFlowFromTomTom(
              userLocation.lat,
              userLocation.lng
            );
            
            // Convertir les incidents au format attendu
            const formattedIncidentsTomTom = (incidents?.incidents || []).map((incident: any, idx: number) => ({
              id: `incident-${idx}-${Date.now()}`,
              type: incident.properties?.iconCategory?.toString() || incident.type || "Incident",
              severity: incident.properties?.delay && incident.properties.delay > 10 ? "high" as const :
                       incident.properties?.delay && incident.properties.delay > 5 ? "medium" as const : "low" as const,
              lat: incident.geometry?.coordinates?.[1] || incident.lat,
              lng: incident.geometry?.coordinates?.[0] || incident.lng,
              description: incident.properties?.description || incident.description || "Incident de trafic",
              delay: incident.properties?.delay ? Math.round(incident.properties.delay / 60) : incident.delay,
              distance: incident.distance,
            }));

            return NextResponse.json({
              ...tomtomTraffic,
              incidents: formattedIncidentsTomTom,
              trafficFlow: trafficFlow ? [trafficFlow] : [],
            });
          } else {
            console.log("[Traffic API] ⚠️ TomTom n'a pas retourné de données");
            console.error("[Traffic API] ❌ TomTom API Key configurée mais aucune donnée retournée");
            // Continuer avec le fallback
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
            });
          }
        } else {
          // Pas de destination mais TomTom est configuré - récupérer au moins les incidents et le flux
          console.log("[Traffic API] Pas de destination, récupération des incidents et flux de trafic autour de la position");
          
          const bbox = [
            userLocation.lng - 0.1,
            userLocation.lat - 0.1,
            userLocation.lng + 0.1,
            userLocation.lat + 0.1,
          ].join(",");
          
          const incidents = await getTrafficIncidentsFromTomTom(bbox);
          const trafficFlow = await getTrafficFlowFromTomTom(
            userLocation.lat,
            userLocation.lng
          );
          
          // Retourner les données disponibles même sans itinéraire
          return NextResponse.json({
            origin: "Position actuelle",
            destination: "Aucune destination",
            userLocation,
            destinationLocation: null,
            routes: [],
            lastUpdate: new Date().toISOString(),
            source: "tomtom",
            incidents: incidents?.incidents || [],
            trafficFlow: trafficFlow ? [trafficFlow] : [],
            message: "Saisissez une destination pour voir les itinéraires",
          });
        }
      }
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

