/**
 * Service TomTom Traffic API
 * Récupère les incidents de trafic réels (accidents, bouchons, travaux)
 * 
 * Documentation: https://developer.tomtom.com/traffic-api/documentation/product-information/introduction
 */

/**
 * Types métier pour les incidents de trafic
 */
export type IncidentType = 'ACCIDENT' | 'BOUCHON' | 'TRAVAUX' | 'FERMETURE' | 'AUTRE';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Interface pour les incidents de trafic mappés avec les métadonnées d'affichage
 */
export interface MappedTrafficIncident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  icon: string;
  color: string;
  label: string;
  lat: number;
  lng: number;
  description: string;
  startTime: string;
  endTime?: string;
  delay?: number; // en minutes
  length?: number; // en mètres
  roadNumbers?: string[];
  events?: Array<{ description?: string; [key: string]: unknown }>;
}

/**
 * Interface pour les incidents bruts TomTom (compatibilité)
 */
export interface TomTomTrafficIncident {
  id: string;
  type: string; // "ACCIDENT", "CONGESTION", "ROAD_CLOSED", "CONSTRUCTION", etc.
  severity: "LOW_IMPACT" | "MINOR" | "MODERATE" | "MAJOR" | "CRITICAL";
  lat: number;
  lng: number;
  description: string;
  startTime: string;
  endTime?: string;
  delay?: number; // en secondes
  length?: number; // en mètres
  roadNumbers?: string[];
}

export interface TomTomTrafficResponse {
  incidents: MappedTrafficIncident[];
  lastUpdate: string;
  bbox: string;
}

/**
 * Calcule la BBOX (bounding box) depuis les coordonnées de la vue de la carte
 * Format: "minLon,minLat,maxLon,maxLat"
 */
export function calculateBboxFromBounds(
  northEast: { lat: number; lng: number },
  southWest: { lat: number; lng: number }
): string {
  const minLon = Math.min(southWest.lng, northEast.lng);
  const maxLon = Math.max(southWest.lng, northEast.lng);
  const minLat = Math.min(southWest.lat, northEast.lat);
  const maxLat = Math.max(southWest.lat, northEast.lat);
  
  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

/**
 * Valide le format du BBOX
 */
function validateBbox(bbox: string): { valid: boolean; error?: string } {
  const parts = bbox.split(",");
  
  if (parts.length !== 4) {
    return { valid: false, error: "BBOX doit contenir 4 valeurs (minLon,minLat,maxLon,maxLat)" };
  }
  
  const [minLon, minLat, maxLon, maxLat] = parts.map(Number);
  
  if (parts.some(p => isNaN(Number(p)))) {
    return { valid: false, error: "Toutes les valeurs du BBOX doivent être des nombres" };
  }
  
  if (minLon < -180 || minLon > 180 || maxLon < -180 || maxLon > 180) {
    return { valid: false, error: "Les longitudes doivent être entre -180 et 180" };
  }
  
  if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) {
    return { valid: false, error: "Les latitudes doivent être entre -90 et 90" };
  }
  
  if (minLon >= maxLon || minLat >= maxLat) {
    return { valid: false, error: "minLon < maxLon et minLat < maxLat requis" };
  }
  
  // Vérifier que la zone n'est pas trop petite (au moins 0.01 degré)
  const lonDiff = maxLon - minLon;
  const latDiff = maxLat - minLat;
  
  if (lonDiff < 0.001 || latDiff < 0.001) {
    return { valid: false, error: "La zone de recherche est trop petite (minimum 0.001 degré)" };
  }
  
  return { valid: true };
}

/**
 * Récupère les incidents de trafic réels depuis TomTom Traffic API
 * 
 * @param bbox - Bounding box au format "minLon,minLat,maxLon,maxLat"
 * @param apiKey - Clé API TomTom (doit être côté serveur uniquement)
 * @returns Liste des incidents de trafic réels
 */
export async function getTomTomTrafficIncidents(
  bbox: string,
  apiKey: string
): Promise<TomTomTrafficResponse> {
  try {
    // Valider le format du BBOX avant d'appeler l'API
    const validation = validateBbox(bbox);
    if (!validation.valid) {
      console.warn("[TomTom Traffic] BBOX invalide:", validation.error, "BBOX:", bbox);
      return {
        incidents: [],
        lastUpdate: new Date().toISOString(),
        bbox: bbox,
      };
    }
    
    // TomTom Traffic Incident Details API
    // Documentation: https://developer.tomtom.com/traffic-api/documentation/api-documentation/traffic-service/incident-details
    const url = new URL("https://api.tomtom.com/traffic/services/5/incidentDetails");
    
    url.searchParams.append("key", apiKey);
    url.searchParams.append("bbox", bbox);
    url.searchParams.append("language", "fr-FR");
    url.searchParams.append("timeValidityFilter", "present"); // Seulement les incidents actuels
    
    // Solution robuste : Essayer d'abord sans fields, puis avec fields minimaux si nécessaire
    // L'API TomTom peut retourner tous les champs par défaut, ce qui évite les erreurs de champs invalides
    let response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    // Si erreur 400, essayer avec fields minimaux
    if (!response.ok && response.status === 400) {
      const errorText = await response.text();
      console.warn("[TomTom Traffic] Première tentative échouée, essai avec fields minimaux:", errorText);
      
      // Réessayer avec une requête minimale (seulement geometry et iconCategory)
      const fallbackUrl = new URL("https://api.tomtom.com/traffic/services/5/incidentDetails");
      fallbackUrl.searchParams.append("key", apiKey);
      fallbackUrl.searchParams.append("bbox", bbox);
      fallbackUrl.searchParams.append("language", "fr-FR");
      fallbackUrl.searchParams.append("timeValidityFilter", "present");
      // Fields minimaux : seulement ce qui est absolument nécessaire
      fallbackUrl.searchParams.append("fields", "{incidents{geometry{type,coordinates},properties{iconCategory}}}");
      
      response = await fetch(fallbackUrl.toString(), {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TomTom Traffic] Erreur API:", response.status, errorText);
      
      // Si c'est toujours une erreur 400, retourner une réponse vide plutôt que de planter
      if (response.status === 400) {
        console.warn("[TomTom Traffic] Impossible de récupérer les incidents, BBOX:", bbox);
        return {
          incidents: [],
          lastUpdate: new Date().toISOString(),
          bbox: bbox,
        };
      }
      
      throw new Error(`TomTom API error: ${response.status}`);
    }

    const data = await response.json();

    // Parser la réponse TomTom avec le mapping centralisé
    const incidents: MappedTrafficIncident[] = [];

    if (data.incidents && Array.isArray(data.incidents)) {
      data.incidents.forEach((incident: any) => {
        try {
          const mappedIncident = mapTomTomIncident(incident);
          incidents.push(mappedIncident);
        } catch (error) {
          console.warn("[TomTom Traffic] Erreur mapping incident:", error, incident);
        }
      });
    }

    return {
      incidents,
      lastUpdate: new Date().toISOString(),
      bbox,
    };
  } catch (error) {
    console.error("[TomTom Traffic] Erreur:", error);
    throw error;
  }
}

/**
 * Extrait la description d'un incident depuis les events
 * 
 * @param incident - Incident brut de l'API TomTom
 * @returns Description de l'incident ou message par défaut
 */
function getIncidentDescription(incident: {
  properties?: {
    events?: Array<{ 
      description?: { text?: string; [key: string]: unknown } | string; 
      [key: string]: unknown 
    }>;
    // Support pour d'autres champs possibles selon la réponse de l'API
    [key: string]: unknown;
  };
  [key: string]: unknown;
}): string {
  try {
    // Méthode 1 : Extraire depuis events[0].description.text
    const events = incident.properties?.events;
    if (events && Array.isArray(events) && events.length > 0) {
      const firstEvent = events[0];
      const description = firstEvent?.description;
      
      // Support de différents formats de description
      if (typeof description === 'string' && description.trim().length > 0) {
        return description.trim();
      }
      
      if (description && typeof description === 'object') {
        const text = (description as { text?: string }).text;
        if (text && typeof text === 'string' && text.trim().length > 0) {
          return text.trim();
        }
      }
    }
    
    // Méthode 2 : Si events n'est pas disponible, essayer d'autres champs
    // (fallback pour compatibilité avec différentes versions de l'API)
    const props = incident.properties || {};
    
    // Chercher dans d'autres champs possibles (code défensif)
    if (typeof props.description === 'string' && props.description.trim().length > 0) {
      return props.description.trim();
    }
    
    // Chercher dans d'autres formats possibles
    const message = props.message || props.summary || props.title;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message.trim();
    }
  } catch (error) {
    console.warn("[TomTom Traffic] Erreur extraction description:", error);
  }
  
  return 'Incident en cours';
}

/**
 * Fonction de mapping centralisée : transforme les données brutes TomTom en types métier lisibles
 * 
 * @param incident - Incident brut de l'API TomTom
 * @returns Incident mappé avec type métier, icône, couleur et label
 */
export function mapTomTomIncident(incident: {
  properties?: {
    id?: string;
    iconCategory?: number | string;
    magnitudeOfDelay?: number;
    startTime?: string;
    endTime?: string;
    delay?: number;
    length?: number;
    roadNumbers?: string[];
    events?: Array<{ description?: { text?: string; [key: string]: unknown } | string; [key: string]: unknown }>;
    [key: string]: unknown;
  };
  geometry?: {
    type?: string;
    coordinates?: number[] | number[][];
  };
  [key: string]: unknown;
}): MappedTrafficIncident {
  const props = incident.properties || {};
  const geometry = incident.geometry || {};
  
  // Extraire les coordonnées (code défensif avec optional chaining)
  let lat = 0;
  let lng = 0;
  
  try {
    if (geometry?.coordinates && Array.isArray(geometry.coordinates)) {
      if (geometry.type === "Point") {
        const coords = geometry.coordinates as number[];
        if (coords.length >= 2) {
          [lng, lat] = coords;
        }
      } else if (geometry.type === "LineString") {
        const coords = geometry.coordinates as number[][];
        if (coords.length > 0 && Array.isArray(coords[0]) && coords[0].length >= 2) {
          [lng, lat] = coords[0];
        }
      }
    }
  } catch (error) {
    console.warn("[TomTom Traffic] Erreur extraction coordonnées:", error);
  }
  
  // Mapper iconCategory vers type métier (code défensif)
  const iconCategory = props.iconCategory !== undefined && props.iconCategory !== null
    ? (typeof props.iconCategory === "string" ? parseInt(props.iconCategory, 10) : props.iconCategory)
    : 0;
  
  let type: IncidentType;
  let icon: string;
  let color: string;
  let label: string;
  
  // Règles de mapping selon iconCategory
  if (iconCategory === 1 || iconCategory === 7) {
    type = 'ACCIDENT';
    icon = '⚠️';
    color = '#ef4444'; // Rouge
    label = 'Accident';
  } else if (iconCategory === 6) {
    type = 'TRAVAUX';
    icon = '🔨';
    color = '#f59e0b'; // Orange
    label = 'Travaux';
  } else if (iconCategory === 8) {
    type = 'FERMETURE';
    icon = '🚧';
    color = '#dc2626'; // Rouge foncé
    label = 'Route fermée';
  } else {
    type = 'BOUCHON';
    icon = '🚗';
    color = '#eab308'; // Jaune
    label = 'Bouchon';
  }
  
  // Mapper magnitudeOfDelay vers severity (code défensif)
  const magnitudeOfDelay = props.magnitudeOfDelay !== undefined && props.magnitudeOfDelay !== null
    ? (typeof props.magnitudeOfDelay === "number" ? props.magnitudeOfDelay : 0)
    : 0;
  
  let severity: IncidentSeverity;
  if (magnitudeOfDelay >= 0 && magnitudeOfDelay <= 1) {
    severity = 'LOW';
  } else if (magnitudeOfDelay >= 2 && magnitudeOfDelay <= 3) {
    severity = 'MEDIUM';
  } else {
    severity = 'HIGH';
  }
  
  // Ajuster la couleur selon la sévérité
  if (severity === 'HIGH' && color !== '#dc2626') {
    color = '#ef4444'; // Rouge pour haute sévérité
  } else if (severity === 'MEDIUM' && color === '#eab308') {
    color = '#f59e0b'; // Orange pour sévérité moyenne
  }
  
  // Extraire la description depuis events (utiliser la fonction utilitaire)
  const description = getIncidentDescription(incident);
  
  // Générer un ID unique si non fourni
  const id = props.id || `tomtom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  return {
    id,
    type,
    severity,
    icon,
    color,
    label,
    lat,
    lng,
    description,
    startTime: props.startTime || new Date().toISOString(),
    endTime: props.endTime || undefined,
    delay: props.delay !== undefined && props.delay !== null 
      ? Math.round(Number(props.delay) / 60) 
      : undefined, // Convertir en minutes
    length: props.length !== undefined && props.length !== null ? Number(props.length) : undefined,
    roadNumbers: Array.isArray(props.roadNumbers) ? props.roadNumbers : [],
    events: Array.isArray(props.events) ? props.events : undefined,
  };
}

/**
 * Mappe la catégorie TomTom vers notre niveau de sévérité (compatibilité)
 */
function mapSeverity(iconCategory: number | string | undefined): TomTomTrafficIncident["severity"] {
  if (!iconCategory) return "MODERATE";
  
  const category = typeof iconCategory === "string" ? parseInt(iconCategory) : iconCategory;
  
  // Catégories TomTom:
  // 0-1: Accident/Congestion mineure
  // 2-3: Fermeture/Construction
  // 4-5: Météo/Divers
  if (category <= 1) return "MINOR";
  if (category <= 3) return "MODERATE";
  return "MAJOR";
}

/**
 * Filtre les incidents par type
 */
export function filterIncidentsByType(
  incidents: TomTomTrafficIncident[],
  types: string[]
): TomTomTrafficIncident[] {
  return incidents.filter(incident => types.includes(incident.type));
}
