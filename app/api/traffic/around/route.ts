import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { getTrafficIncidentsFromTomTom } from "@/app/lib/services/traffic";

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

    // Récupérer les incidents réels depuis TomTom
    const incidentsData = await getTrafficIncidentsFromTomTom(bbox);

    if (!incidentsData || !incidentsData.incidents || incidentsData.incidents.length === 0) {
      console.log("[Traffic Around API] Aucun incident trouvé");
      return NextResponse.json({
        origin: "Position actuelle",
        destination: "Zone autour de vous",
        userLocation: { lat: userLat, lng: userLng },
        destinationLocation: null,
        routes: [],
        incidents: [],
        lastUpdate: new Date().toISOString(),
        source: "tomtom",
      });
    }

    // Convertir et formater les incidents
    const rawIncidents = incidentsData.incidents.map((incident: any, idx: number) => {
      const incidentLat = incident.geometry?.coordinates?.[1] || incident.lat;
      const incidentLng = incident.geometry?.coordinates?.[0] || incident.lng;
      
      // Calculer la distance depuis la position de l'utilisateur (formule de Haversine)
      const distance = calculateDistance(userLat, userLng, incidentLat, incidentLng);
      
      // Déterminer la sévérité basée sur le délai et la catégorie
      const delaySeconds = incident.properties?.delay || 0;
      const delayMinutes = Math.round(delaySeconds / 60);
      const iconCategory = incident.properties?.iconCategory || 0;
      
      let severity: "low" | "medium" | "high" = "low";
      if (delayMinutes > 10 || iconCategory >= 8) {
        severity = "high";
      } else if (delayMinutes > 5 || iconCategory >= 4) {
        severity = "medium";
      }

      // Formater le type d'incident
      const typeMap: Record<number, string> = {
        0: "Autre",
        1: "Accident",
        2: "Congestion",
        3: "Travaux",
        4: "Route fermée",
        5: "Route fermée",
        6: "Route fermée",
        7: "Route fermée",
        8: "Accident majeur",
        9: "Accident majeur",
        10: "Accident majeur",
        11: "Accident majeur",
      };
      
      const type = typeMap[iconCategory] || incident.properties?.type || "Incident de trafic";
      
      // Formater la description
      const description = incident.properties?.description || 
                          incident.properties?.from || 
                          `${type} sur la route`;

      return {
        id: `incident-${idx}-${Date.now()}`,
        type,
        severity,
        lat: incidentLat,
        lng: incidentLng,
        description,
        delay: delayMinutes > 0 ? delayMinutes : undefined,
        distance: Math.round(distance * 10) / 10, // Arrondir à 1 décimale
        originalData: incident, // Garder les données originales pour debug
      };
    });

    // Trier par distance (plus proche en premier) puis par sévérité (high > medium > low)
    const severityOrder = { high: 3, medium: 2, low: 1 };
    rawIncidents.sort((a: { distance: number; severity: "low" | "medium" | "high" }, b: { distance: number; severity: "low" | "medium" | "high" }) => {
      // Priorité aux incidents proches (dans un rayon de 50km)
      const aIsNear = a.distance <= 50;
      const bIsNear = b.distance <= 50;
      
      if (aIsNear && !bIsNear) return -1;
      if (!aIsNear && bIsNear) return 1;
      
      // Si les deux sont proches ou loin, trier par sévérité puis distance
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      return a.distance - b.distance;
    });

    // Limiter à 7 incidents maximum pour un affichage minimaliste
    const incidents = rawIncidents.slice(0, 7);

    console.log("[Traffic Around API] Incidents récupérés:", {
      total: rawIncidents.length,
      affichés: incidents.length,
    });

    return NextResponse.json({
      origin: "Position actuelle",
      destination: "Zone autour de vous",
      userLocation: { lat: userLat, lng: userLng },
      destinationLocation: null,
      routes: [],
      incidents,
      lastUpdate: new Date().toISOString(),
      source: "tomtom",
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
 * Calcule la distance en kilomètres entre deux points GPS (formule de Haversine)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}





