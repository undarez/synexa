/**
 * Service de trafic
 * Supporte Google Maps Directions API et Waze Deep Links
 */

export interface TrafficRoute {
  name: string;
  duration: string; // Format: "25 min"
  durationSeconds: number; // Durée en secondes
  distance: string; // Format: "12 km"
  distanceMeters: number; // Distance en mètres
  traffic: string; // "Fluide", "Modéré", "Dense", "Bloqué"
  status: "good" | "moderate" | "heavy" | "bad";
  details: string;
  polyline?: Array<{ lat: number; lng: number }>;
}

export interface TrafficData {
  origin: string;
  destination: string;
  userLocation: { lat: number; lng: number } | null;
  destinationLocation: { lat: number; lng: number } | null;
  routes: TrafficRoute[];
  lastUpdate: string;
  source: "google" | "waze" | "simulation";
}

/**
 * Récupère les données de trafic depuis Google Maps Directions API
 */
export async function getTrafficFromGoogleMaps(
  originLat: number,
  originLng: number,
  destinationLat?: number,
  destinationLng?: number,
  destinationAddress?: string
): Promise<TrafficData | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn("[Traffic] GOOGLE_MAPS_API_KEY non configurée");
    return null;
  }

  try {
    const origin = `${originLat},${originLng}`;
    let destination = destinationAddress || "Travail";
    
    if (destinationLat && destinationLng) {
      destination = `${destinationLat},${destinationLng}`;
    }

    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.append("origin", origin);
    url.searchParams.append("destination", destination);
    url.searchParams.append("key", apiKey);
    url.searchParams.append("language", "fr");
    url.searchParams.append("region", "fr");
    url.searchParams.append("alternatives", "true");
    url.searchParams.append("traffic_model", "best_guess");
    url.searchParams.append("departure_time", "now");

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Google Maps API status: ${data.status}`);
    }

    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const routes: TrafficRoute[] = data.routes.map((route: any, index: number) => {
      const leg = route.legs[0];
      const durationInTraffic = leg.duration_in_traffic || leg.duration;
      const durationSeconds = durationInTraffic.value;
      const distanceMeters = leg.distance.value;
      
      // Déterminer le statut du trafic
      const baseDuration = leg.duration.value;
      const trafficDelay = durationSeconds - baseDuration;
      const trafficRatio = trafficDelay / baseDuration;
      
      let status: "good" | "moderate" | "heavy" | "bad";
      let traffic: string;
      
      if (trafficRatio < 0.1) {
        status = "good";
        traffic = "Fluide";
      } else if (trafficRatio < 0.3) {
        status = "moderate";
        traffic = "Modéré";
      } else if (trafficRatio < 0.5) {
        status = "heavy";
        traffic = "Dense";
      } else {
        status = "bad";
        traffic = "Bloqué";
      }

      // Extraire les points de la polyline
      const polyline = route.overview_polyline?.points
        ? decodePolyline(route.overview_polyline.points)
        : undefined;

      return {
        name: index === 0 ? "Itinéraire principal" : `Itinéraire alternatif ${index}`,
        duration: formatDuration(durationSeconds),
        durationSeconds,
        distance: formatDistance(distanceMeters),
        distanceMeters,
        traffic,
        status,
        details: leg.steps
          ?.filter((step: any) => step.html_instructions?.includes("traffic") || step.html_instructions?.includes("ralentissement"))
          .map((step: any) => step.html_instructions?.replace(/<[^>]+>/g, ""))
          .join("; ") || "Aucun incident signalé",
        polyline,
      };
    });

    return {
      origin: data.routes[0].legs[0].start_address || origin,
      destination: data.routes[0].legs[0].end_address || destination,
      userLocation: { lat: originLat, lng: originLng },
      destinationLocation: destinationLat && destinationLng
        ? { lat: destinationLat, lng: destinationLng }
        : null,
      routes,
      lastUpdate: new Date().toISOString(),
      source: "google",
    };
  } catch (error) {
    console.error("[Traffic] Erreur Google Maps:", error);
    return null;
  }
}

/**
 * Génère un lien Waze Deep Link pour ouvrir la navigation
 */
export function getWazeDeepLink(
  destinationLat: number,
  destinationLng: number,
  destinationName?: string
): string {
  const name = destinationName ? encodeURIComponent(destinationName) : "";
  return `https://waze.com/ul?ll=${destinationLat},${destinationLng}&navigate=yes${name ? `&q=${name}` : ""}`;
}

/**
 * Génère un lien Waze Deep Link avec origine et destination
 */
export function getWazeRouteDeepLink(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number
): string {
  return `https://waze.com/ul?ll=${destinationLat},${destinationLng}&navigate=yes&from=${originLat},${originLng}`;
}

/**
 * Décode une polyline Google Maps en points de coordonnées
 */
function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const polyline: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    polyline.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
  }

  return polyline;
}

/**
 * Formate une durée en secondes en format lisible
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  }
  
  return `${minutes} min`;
}

/**
 * Formate une distance en mètres en format lisible
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}


