/**
 * Service de trafic
 * Supporte TomTom Traffic API (prioritaire), Google Maps Directions API et Waze Deep Links
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
  source: "tomtom" | "openrouteservice" | "google" | "waze" | "simulation";
}

/**
 * Récupère les données de trafic depuis OpenRouteService (GRATUIT et OPEN-SOURCE)
 * OpenRouteService est basé sur OpenStreetMap et offre un quota généreux gratuit
 */
export async function getTrafficFromOpenRouteService(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number,
  destinationAddress?: string
): Promise<TrafficData | null> {
  try {
    console.log("[Traffic OpenRouteService] Appel de l'API OpenRouteService...");
    
    // OpenRouteService Directions API - GRATUIT et OPEN-SOURCE
    const url = new URL("https://api.openrouteservice.org/v2/directions/driving-car");
    
    // Pas besoin de clé API pour le service public (mais limité)
    // Pour plus de requêtes, créer un compte gratuit sur https://openrouteservice.org
    const apiKey = process.env.OPENROUTESERVICE_API_KEY || ""; // Optionnel mais recommandé
    
    if (apiKey) {
      url.searchParams.append("api_key", apiKey);
    }
    
    // Format GeoJSON pour les coordonnées
    const coordinates = [
      [originLng, originLat], // [longitude, latitude]
      [destinationLng, destinationLat]
    ];
    
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        coordinates: coordinates,
        format: "json",
        instructions: true,
        geometry: true,
        extra_info: ["surface", "waytype", "steepness"],
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Traffic OpenRouteService] Erreur HTTP:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("[Traffic OpenRouteService] Réponse reçue, nombre de routes:", data.routes?.length || 0);

    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const routes: TrafficRoute[] = data.routes.map((route: any, index: number) => {
      const summary = route.summary;
      const durationSeconds = summary.duration || 0;
      const distanceMeters = summary.distance || 0;
      
      // Convertir la durée en format lisible
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      const duration = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
      
      // Convertir la distance
      const distance = distanceMeters > 1000 
        ? `${(distanceMeters / 1000).toFixed(1)} km`
        : `${Math.round(distanceMeters)} m`;
      
      // Extraire la polyline depuis la géométrie
      const polyline: Array<{ lat: number; lng: number }> = [];
      if (route.geometry && route.geometry.coordinates) {
        route.geometry.coordinates.forEach((coord: [number, number]) => {
          polyline.push({ lat: coord[1], lng: coord[0] });
        });
      }
      
      return {
        name: `Itinéraire ${index + 1}`,
        duration,
        durationSeconds: Math.round(durationSeconds),
        distance,
        distanceMeters: Math.round(distanceMeters),
        traffic: "Trafic normal", // OpenRouteService ne fournit pas de données de trafic en temps réel
        status: "good",
        details: destinationAddress || `${originLat.toFixed(4)},${originLng.toFixed(4)} → ${destinationLat.toFixed(4)},${destinationLng.toFixed(4)}`,
        polyline,
      };
    });

    return {
      origin: `${originLat.toFixed(4)},${originLng.toFixed(4)}`,
      destination: destinationAddress || `${destinationLat.toFixed(4)},${destinationLng.toFixed(4)}`,
      userLocation: { lat: originLat, lng: originLng },
      destinationLocation: { lat: destinationLat, lng: destinationLng },
      routes,
      lastUpdate: new Date().toISOString(),
      source: "openrouteservice",
    };
  } catch (error) {
    console.error("[Traffic OpenRouteService] Erreur:", error);
    return null;
  }
}

/**
 * Récupère les données de trafic depuis TomTom Routing API
 * TomTom offre 2500 requêtes/jour gratuites
 */
export async function getTrafficFromTomTom(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number,
  destinationAddress?: string
): Promise<TrafficData | null> {
  const apiKey = process.env.TOMTOM_API_KEY;
  
  if (!apiKey) {
    console.warn("[Traffic] TOMTOM_API_KEY non configurée");
    return null;
  }

  try {
    console.log("[Traffic TomTom] Appel de l'API TomTom...");
    
    // TomTom Routing API avec support du trafic en temps réel
    const url = new URL("https://api.tomtom.com/routing/1/calculateRoute/json");
    url.searchParams.append("key", apiKey);
    url.searchParams.append("routeType", "fastest"); // fastest, shortest, eco, thrilling
    url.searchParams.append("traffic", "true"); // Activer les données de trafic
    url.searchParams.append("travelMode", "car");
    url.searchParams.append("language", "fr-FR");
    url.searchParams.append("instructionsType", "text");
    url.searchParams.append("computeTravelTimeFor", "all"); // Calculer le temps pour tous les segments
    url.searchParams.append("routeRepresentation", "polyline"); // Pour obtenir la polyline
    url.searchParams.append("alternatives", "3"); // Jusqu'à 3 itinéraires alternatifs
    
    // Format: lat1,lng1:lat2,lng2
    // Note: TomTom utilise lon,lat (longitude en premier)
    const waypoints = `${originLng},${originLat}:${destinationLng},${destinationLat}`;
    url.searchParams.append("waypoints", waypoints);

    console.log("[Traffic TomTom] URL:", url.toString().replace(apiKey, "***"));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Traffic TomTom] Erreur HTTP:", response.status, errorText);
      throw new Error(`TomTom API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("[Traffic TomTom] Réponse reçue, nombre de routes:", data.routes?.length || 0);

    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const routes: TrafficRoute[] = data.routes.map((route: any, index: number) => {
      const summary = route.summary;
      const durationSeconds = summary.travelTimeInSeconds || 0;
      const distanceMeters = summary.lengthInMeters || 0;
      
      // TomTom fournit des informations de trafic détaillées
      const currentTrafficDelay = summary.trafficDelayInSeconds || 0;
      const noTrafficTravelTime = summary.noTrafficTravelTimeInSeconds || durationSeconds;
      const trafficRatio = noTrafficTravelTime > 0 
        ? (durationSeconds - noTrafficTravelTime) / noTrafficTravelTime 
        : 0;
      
      let status: "good" | "moderate" | "heavy" | "bad";
      let traffic: string;
      
      if (trafficRatio < 0.1 || currentTrafficDelay < 60) {
        status = "good";
        traffic = "Fluide";
      } else if (trafficRatio < 0.3 || currentTrafficDelay < 300) {
        status = "moderate";
        traffic = "Modéré";
      } else if (trafficRatio < 0.5 || currentTrafficDelay < 600) {
        status = "heavy";
        traffic = "Dense";
      } else {
        status = "bad";
        traffic = "Bloqué";
      }

      // Extraire les points de la polyline TomTom
      // TomTom peut retourner les points dans route.legs[].points ou dans route.sections[].points
      let polyline: Array<{ lat: number; lng: number }> | undefined = undefined;
      
      if (route.legs && route.legs.length > 0 && route.legs[0].points) {
        polyline = route.legs[0].points.map((point: any) => ({
          lat: point.latitude,
          lng: point.longitude,
        }));
      } else if (route.sections && route.sections.length > 0) {
        // Alternative: extraire depuis les sections
        const allPoints: Array<{ lat: number; lng: number }> = [];
        route.sections.forEach((section: any) => {
          if (section.points) {
            section.points.forEach((point: any) => {
              allPoints.push({
                lat: point.latitude,
                lng: point.longitude,
              });
            });
          }
        });
        if (allPoints.length > 0) {
          polyline = allPoints;
        }
      }

      // Extraire les incidents de trafic depuis les instructions
      const incidents: string[] = [];
      if (route.guidance?.instructions) {
        route.guidance.instructions.forEach((instruction: any) => {
          if (instruction.message?.includes("traffic") || 
              instruction.message?.includes("ralentissement") ||
              instruction.message?.includes("embouteillage") ||
              instruction.message?.includes("accident")) {
            incidents.push(instruction.message);
          }
        });
      }

      return {
        name: index === 0 ? "Itinéraire principal" : `Itinéraire alternatif ${index}`,
        duration: formatDuration(durationSeconds),
        durationSeconds,
        distance: formatDistance(distanceMeters),
        distanceMeters,
        traffic,
        status,
        details: incidents.length > 0 
          ? incidents.join("; ") 
          : currentTrafficDelay > 0
          ? `Délai de trafic: ${formatDuration(currentTrafficDelay)}`
          : "Aucun incident signalé",
        polyline,
      };
    });

    // Utiliser les coordonnées pour les adresses (TomTom ne retourne pas toujours les adresses formatées)
    const originAddress = "Position actuelle";
    const destAddress = destinationAddress || "Destination";

    return {
      origin: originAddress,
      destination: destAddress,
      userLocation: { lat: originLat, lng: originLng },
      destinationLocation: { lat: destinationLat, lng: destinationLng },
      routes,
      lastUpdate: new Date().toISOString(),
      source: "tomtom",
    };
  } catch (error) {
    console.error("[Traffic] Erreur TomTom:", error);
    return null;
  }
}

/**
 * Récupère les données de flux de trafic depuis TomTom Traffic Flow API
 * Utile pour obtenir des informations de trafic sur une zone spécifique
 */
export async function getTrafficFlowFromTomTom(
  lat: number,
  lng: number,
  zoom: number = 12
): Promise<any> {
  const apiKey = process.env.TOMTOM_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  try {
    // TomTom Traffic Flow API
    const url = new URL("https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json");
    url.searchParams.append("key", apiKey);
    url.searchParams.append("point", `${lat},${lng}`);
    url.searchParams.append("unit", "KMPH");

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`TomTom Traffic Flow API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[Traffic] Erreur TomTom Traffic Flow:", error);
    return null;
  }
}

/**
 * Retourne un tableau vide d'incidents - Les incidents simulés ont été supprimés
 * En production, vous pouvez intégrer une vraie API d'incidents de trafic
 */
export async function getTrafficIncidentsFromOSM(
  bbox: string // Format: "minLon,minLat,maxLon,maxLat"
): Promise<{ incidents: any[] }> {
  // Plus d'incidents simulés - retourner un tableau vide
  return { incidents: [] };
  try {
    const [minLon, minLat, maxLon, maxLat] = bbox.split(",").map(parseFloat);
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;
    
    console.log("[Traffic OSM] Génération d'incidents simulés pour bbox:", bbox);

    // Routes principales françaises avec leurs coordonnées approximatives
    // Ces routes sont fréquemment encombrées ou sujettes à incidents
    const majorRoads = [
      // Autoroutes principales
      { name: "A1 Paris-Lille", lat: 49.0, lng: 2.3, type: "accident" },
      { name: "A6 Paris-Lyon", lat: 48.7, lng: 2.4, type: "congestion" },
      { name: "A4 Paris-Strasbourg", lat: 48.8, lng: 2.6, type: "travaux" },
      { name: "A10 Paris-Bordeaux", lat: 48.6, lng: 2.2, type: "accident" },
      { name: "A13 Paris-Caen", lat: 48.9, lng: 2.2, type: "congestion" },
      // Péripherique parisien
      { name: "Périphérique Paris", lat: 48.8566, lng: 2.3522, type: "congestion" },
      // Routes autour de grandes villes
      { name: "Rocade Lyon", lat: 45.7640, lng: 4.8357, type: "travaux" },
      { name: "Rocade Marseille", lat: 43.2965, lng: 5.3698, type: "congestion" },
      { name: "Rocade Toulouse", lat: 43.6047, lng: 1.4442, type: "accident" },
      { name: "Rocade Nantes", lat: 47.2184, lng: -1.5536, type: "congestion" },
    ];

    // Filtrer les routes dans la bounding box
    const roadsInBox = majorRoads.filter(road => 
      road.lat >= minLat && road.lat <= maxLat &&
      road.lon >= minLon && road.lon <= maxLon
    );

    // Générer des incidents réalistes pour les routes dans la zone
    const incidents: any[] = roadsInBox.map((road, index) => {
      // Variation aléatoire de la position (dans un rayon de 5km)
      const latVariation = (Math.random() - 0.5) * 0.045; // ~5km
      const lonVariation = (Math.random() - 0.5) * 0.06; // ~5km
      
      const incidentLat = road.lat + latVariation;
      const incidentLon = road.lon + lonVariation;

      // Types d'incidents avec leurs probabilités
      const delayMinutes = road.type === "accident" 
        ? Math.floor(Math.random() * 30) + 15 // 15-45 min
        : road.type === "congestion"
        ? Math.floor(Math.random() * 20) + 5 // 5-25 min
        : Math.floor(Math.random() * 15) + 10; // 10-25 min pour travaux

      const severity = delayMinutes > 20 ? "high" : delayMinutes > 10 ? "medium" : "low";
      
      const descriptions = {
        accident: [
          `${road.name}: Accident de la circulation`,
          `${road.name}: Collision entre véhicules`,
          `${road.name}: Sortie de route`,
        ],
        congestion: [
          `${road.name}: Circulation dense`,
          `${road.name}: Bouchon important`,
          `${road.name}: Ralentissements`,
        ],
        travaux: [
          `${road.name}: Travaux de voirie`,
          `${road.name}: Route réduite à une voie`,
          `${road.name}: Chantier en cours`,
        ],
      };

      const description = descriptions[road.type as keyof typeof descriptions][
        Math.floor(Math.random() * descriptions[road.type as keyof typeof descriptions].length)
      ];

      // Icon category pour compatibilité (0-11 comme TomTom)
      const iconCategory = road.type === "accident" ? 8 : road.type === "congestion" ? 2 : 3;

      return {
        type: road.type,
        geometry: {
          type: "Point",
          coordinates: [incidentLon, incidentLat],
        },
        properties: {
          iconCategory,
          type: road.type,
          description,
          delay: delayMinutes * 60, // en secondes
          startTime: new Date(Date.now() - Math.random() * 3600000).toISOString(), // il y a 0-1h
          from: road.name,
          to: "",
          length: Math.floor(Math.random() * 5) + 1, // 1-5 km
          severity,
        },
        lat: incidentLat,
        lng: incidentLon,
      };
    });

    // Ajouter quelques incidents aléatoires supplémentaires dans la zone si c'est une grande zone
    const areaSize = Math.abs(maxLat - minLat) * Math.abs(maxLon - minLon);
    if (areaSize > 0.5) {
      const additionalIncidents = Math.floor(Math.random() * 3) + 1; // 1-3 incidents supplémentaires
      
      for (let i = 0; i < additionalIncidents; i++) {
        const randomLat = minLat + Math.random() * (maxLat - minLat);
        const randomLon = minLon + Math.random() * (maxLon - minLon);
        
        const types = ["congestion", "travaux", "accident"];
        const type = types[Math.floor(Math.random() * types.length)];
        const delayMinutes = type === "accident" 
          ? Math.floor(Math.random() * 30) + 15
          : Math.floor(Math.random() * 15) + 5;

        incidents.push({
          type,
          geometry: {
            type: "Point",
            coordinates: [randomLon, randomLat],
          },
          properties: {
            iconCategory: type === "accident" ? 8 : type === "congestion" ? 2 : 3,
            type,
            description: `Incident de trafic sur la route`,
            delay: delayMinutes * 60,
            startTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            from: "Route départementale",
            to: "",
            length: Math.floor(Math.random() * 3) + 1,
            severity: delayMinutes > 20 ? "high" : delayMinutes > 10 ? "medium" : "low",
          },
          lat: randomLat,
          lng: randomLon,
        });
      }
    }

    console.log(`[Traffic OSM] ${incidents.length} incidents générés (simulés basés sur OSM)`);
    
    return { incidents };
  } catch (error) {
    console.error("[Traffic OSM] Erreur génération incidents:", error);
    return { incidents: [] };
  }
}

/**
 * @deprecated Utiliser getTrafficIncidentsFromOSM à la place
 * Conservé pour compatibilité mais retourne toujours un tableau vide
 */
export async function getTrafficIncidentsFromTomTom(
  bbox: string
): Promise<{ incidents: any[] }> {
  console.warn("[Traffic] getTrafficIncidentsFromTomTom est déprécié, utilisation de getTrafficIncidentsFromOSM");
  return getTrafficIncidentsFromOSM(bbox);
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


