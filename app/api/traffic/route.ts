import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";
import { 
  getTrafficFromOpenRouteService,
  getTrafficFromGoogleMaps
} from "@/app/lib/services/traffic";
import { geocodeAddress } from "@/app/lib/services/tomtom-geocoding";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    
    // Récupérer l'adresse travail de l'utilisateur si disponible
    const { data: userProfile } = await supabase
      .from('User')
      .select('workAddress, workLat, workLng')
      .eq('id', user.id)
      .single();
    
    const profile = userProfile as { workAddress?: string; workLat?: number; workLng?: number } | null;
    const destinationText = profile?.workAddress || searchParams.get("destination") || "Travail";
    let destinationLat = profile?.workLat;
    let destinationLng = profile?.workLng;
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


    // Utiliser OpenRouteService (GRATUIT, OPEN-SOURCE, basé sur OpenStreetMap)
    if (userLocation) {
      console.log("[Traffic API] 🔍 Utilisation OpenRouteService (gratuit et open-source):", {
        hasUserLocation: !!userLocation,
        hasDestination: !!(destinationLat && destinationLng),
        destinationLat,
        destinationLng,
      });
      
      // Si on a une destination avec coordonnées, utiliser OpenRouteService
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
            
            // Pas d'incidents simulés - retourner uniquement les routes
            return NextResponse.json({
              ...openRouteTraffic,
              incidents: [], // Pas d'incidents simulés
            });
          }
          
          // Fallback sur Google Maps si OpenRouteService échoue
          console.log("[Traffic API] OpenRouteService n'a pas fonctionné, essai avec Google Maps...");
          
          const googleTraffic = await getTrafficFromGoogleMaps(
            userLocation.lat,
            userLocation.lng,
            destinationLat,
            destinationLng,
            destination
          );

          if (googleTraffic) {
            // Pas d'incidents simulés - retourner uniquement les routes
            return NextResponse.json({
              ...googleTraffic,
              incidents: [], // Pas d'incidents simulés
            });
          }
        } else {
          // Pas de destination - retourner un message
          return NextResponse.json({
            origin: "Position actuelle",
            destination: "Aucune destination",
            userLocation,
            destinationLocation: null,
            routes: [],
            incidents: [], // Pas d'incidents simulés
            lastUpdate: new Date().toISOString(),
            source: "openrouteservice",
            message: "Saisissez une destination pour voir les itinéraires",
          });
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

