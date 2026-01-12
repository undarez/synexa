/**
 * Service SNCF Navitia API pour récupérer les trains en circulation en temps réel
 * Documentation: https://www.navitia.io/
 */

export interface SNCFTrain {
  id: string;
  type: 'TER' | 'RER' | 'TGV' | 'Intercités' | 'Tram' | 'Metro' | 'Autre';
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
  delay?: number; // en secondes
  coordinates?: {
    lat: number;
    lng: number;
  };
  line?: string;
  route?: string;
}

export interface SNCFLine {
  id: string;
  name: string;
  type: string;
  color?: string;
}

export interface SNCFStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/**
 * Parse une date au format Navitia (YYYYMMDDTHHMMSS) vers ISO string
 */
function parseNavitiaDateTime(dateTime: string | number): string {
  try {
    if (typeof dateTime === 'number') {
      // Si c'est un timestamp
      return new Date(dateTime * 1000).toISOString();
    }
    
    if (typeof dateTime === 'string') {
      // Format Navitia: YYYYMMDDTHHMMSS
      if (dateTime.length === 15 && dateTime.includes('T')) {
        const year = dateTime.substring(0, 4);
        const month = dateTime.substring(4, 6);
        const day = dateTime.substring(6, 8);
        const hour = dateTime.substring(9, 11);
        const minute = dateTime.substring(11, 13);
        const second = dateTime.substring(13, 15);
        
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
      }
      
      // Si c'est déjà au format ISO
      if (dateTime.includes('-') && dateTime.includes('T')) {
        return new Date(dateTime).toISOString();
      }
    }
  } catch (error) {
    console.warn("[SNCF Trains] Erreur parsing date:", dateTime, error);
  }
  
  return new Date().toISOString();
}

/**
 * Mappe un train de l'API Navitia vers notre format métier
 */
export function mapSncfTrain(train: any): SNCFTrain | null {
  try {
    // Extraire les informations du train
    const id = train?.id || train?.trip?.id || `train_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Déterminer le type de train depuis la catégorie
    const category = train?.category || train?.trip?.category || '';
    let type: SNCFTrain['type'] = 'Autre';
    
    if (category.includes('TER') || category.includes('ter')) {
      type = 'TER';
    } else if (category.includes('RER') || category.includes('rer')) {
      type = 'RER';
    } else if (category.includes('TGV') || category.includes('tgv')) {
      type = 'TGV';
    } else if (category.includes('Intercités') || category.includes('intercites')) {
      type = 'Intercités';
    } else if (category.includes('Tram') || category.includes('tram')) {
      type = 'Tram';
    } else if (category.includes('Metro') || category.includes('metro')) {
      type = 'Metro';
    }
    
    // Extraire les gares de départ et d'arrivée (code défensif avec optional chaining)
    const stopTimes = train?.stop_times || train?.trip?.stop_times || train?.vehicle_journey?.stop_times || [];
    const departureStop = stopTimes[0];
    const arrivalStop = stopTimes.length > 0 ? stopTimes[stopTimes.length - 1] : null;
    
    // Extraire les noms de gares avec plusieurs fallbacks
    let departureStation = 'Gare inconnue';
    let arrivalStation = 'Gare inconnue';
    
    if (departureStop) {
      departureStation = departureStop?.stop_point?.name || 
                        departureStop?.stop_point?.stop_area?.name ||
                        departureStop?.stop_area?.name ||
                        departureStop?.name ||
                        'Gare inconnue';
    }
    
    if (arrivalStop) {
      arrivalStation = arrivalStop?.stop_point?.name || 
                      arrivalStop?.stop_point?.stop_area?.name ||
                      arrivalStop?.stop_area?.name ||
                      arrivalStop?.name ||
                      'Gare inconnue';
    }
    
    // Extraire les heures (format Navitia: YYYYMMDDTHHMMSS)
    let departureTime = new Date().toISOString();
    let arrivalTime = new Date().toISOString();
    
    if (departureStop) {
      const depTime = departureStop?.departure_date_time || 
                     departureStop?.stop_date_time?.departure_date_time ||
                     departureStop?.datetime;
      
      if (depTime) {
        departureTime = parseNavitiaDateTime(depTime);
      }
    }
    
    if (arrivalStop) {
      const arrTime = arrivalStop?.arrival_date_time || 
                     arrivalStop?.stop_date_time?.arrival_date_time ||
                     arrivalStop?.datetime;
      
      if (arrTime) {
        arrivalTime = parseNavitiaDateTime(arrTime);
      }
    }
    
    // Calculer le retard
    const delay = train?.delay || 
                 train?.impact?.departure?.delay || 
                 departureStop?.delay || 
                 0;
    
    // Extraire les coordonnées (si disponibles) - plusieurs sources possibles
    let coordinates: { lat: number; lng: number } | undefined;
    
    // Source 1: geojson du train
    if (train?.geojson?.coordinates) {
      const coords = train.geojson.coordinates[0];
      if (Array.isArray(coords) && coords.length >= 2) {
        coordinates = { lng: coords[0], lat: coords[1] };
      }
    }
    
    // Source 2: coordonnées du stop_point de départ
    if (!coordinates && departureStop?.stop_point?.coord) {
      const coord = departureStop.stop_point.coord;
      if (coord.lat && coord.lon) {
        coordinates = {
          lat: coord.lat,
          lng: coord.lon,
        };
      }
    }
    
    // Source 3: coordonnées du stop_area de départ
    if (!coordinates && departureStop?.stop_area?.coord) {
      const coord = departureStop.stop_area.coord;
      if (coord.lat && coord.lon) {
        coordinates = {
          lat: coord.lat,
          lng: coord.lon,
        };
      }
    }
    
    // Source 4: coordonnées directes du train
    if (!coordinates && train?.coord) {
      const coord = train.coord;
      if (coord.lat && coord.lon) {
        coordinates = {
          lat: coord.lat,
          lng: coord.lon,
        };
      }
    }
    
    // Extraire la ligne
    const line = train?.route?.line?.name || 
                train?.trip?.route?.line?.name || 
                train?.line?.name || 
                undefined;
    
    const route = train?.route?.name || train?.trip?.route?.name || undefined;
    
    return {
      id,
      type,
      departureStation,
      arrivalStation,
      departureTime,
      arrivalTime,
      delay: typeof delay === 'number' ? delay : 0,
      coordinates,
      line,
      route,
    };
  } catch (error) {
    console.warn("[SNCF Trains] Erreur mapping train:", error, train);
    return null;
  }
}

/**
 * Récupère les lignes ferroviaires (RER, TER) depuis l'API Navitia
 */
export async function getSNCFLines(
  apiKey?: string,
  lineTypes: string[] = ['RER', 'TER']
): Promise<SNCFLine[]> {
  try {
    if (!apiKey) {
      console.warn("[SNCF Trains] Pas de clé API, utilisation de données par défaut");
      return getDefaultLines();
    }
    
    const filter = lineTypes.map(type => `line_type=${type}`).join(',');
    const url = `https://api.navitia.io/v3/coverage/sncf/lines?filter=${filter}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey,
      },
    });
    
    if (!response.ok) {
      console.warn("[SNCF Trains] Erreur récupération lignes:", response.status);
      return getDefaultLines();
    }
    
    const data = await response.json();
    const lines: SNCFLine[] = [];
    
    if (data?.lines && Array.isArray(data.lines)) {
      data.lines.forEach((line: any) => {
        lines.push({
          id: line.id || line.code || `line_${Math.random()}`,
          name: line.name || line.label || 'Ligne inconnue',
          type: line.type || 'unknown',
          color: line.color || undefined,
        });
      });
    }
    
    return lines.length > 0 ? lines : getDefaultLines();
  } catch (error) {
    console.warn("[SNCF Trains] Erreur récupération lignes, utilisation données par défaut:", error);
    return getDefaultLines();
  }
}

/**
 * Récupère les trains en circulation pour une ligne spécifique
 */
export async function getTrainsForLine(
  lineId: string,
  apiKey?: string
): Promise<SNCFTrain[]> {
  try {
    if (!apiKey) {
      console.warn("[SNCF Trains] Pas de clé API, utilisation de données simulées");
      return getSimulatedTrains();
    }
    
    // Utiliser l'endpoint vehicle_journeys pour récupérer les trains en circulation
    const url = `https://api.navitia.io/v3/coverage/sncf/vehicle_journeys?filter=line.id=${lineId}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey,
      },
    });
    
    if (!response.ok) {
      console.warn("[SNCF Trains] Erreur récupération trains pour ligne:", response.status);
      return getSimulatedTrains();
    }
    
    const data = await response.json();
    const trains: SNCFTrain[] = [];
    
    // Parser la réponse Navitia - plusieurs formats possibles
    if (data?.vehicle_journeys && Array.isArray(data.vehicle_journeys)) {
      data.vehicle_journeys.forEach((journey: any) => {
        const mappedTrain = mapSncfTrain(journey);
        if (mappedTrain) {
          trains.push(mappedTrain);
        }
      });
    }
    
    // Alternative: parser depuis traffic_reports
    if (data?.traffic_reports && Array.isArray(data.traffic_reports)) {
      data.traffic_reports.forEach((report: any) => {
        if (report?.vehicle_journeys && Array.isArray(report.vehicle_journeys)) {
          report.vehicle_journeys.forEach((journey: any) => {
            const mappedTrain = mapSncfTrain(journey);
            if (mappedTrain) {
              trains.push(mappedTrain);
            }
          });
        }
      });
    }
    
    return trains.length > 0 ? trains : getSimulatedTrains();
  } catch (error) {
    console.warn("[SNCF Trains] Erreur récupération trains, utilisation données simulées:", error);
    return getSimulatedTrains();
  }
}

/**
 * Récupère tous les trains en circulation (toutes lignes)
 * Utilise une approche optimisée pour éviter trop d'appels API
 */
export async function getAllTrainsInCirculation(
  apiKey?: string,
  lineTypes: string[] = ['RER', 'TER']
): Promise<SNCFTrain[]> {
  try {
    if (!apiKey) {
      console.warn("[SNCF Trains] Pas de clé API, utilisation de données simulées");
      return getSimulatedTrains();
    }
    
    // Approche optimisée: récupérer directement tous les vehicle_journeys avec filtre
    const filter = lineTypes.map(type => `line_type=${type}`).join(',');
    const url = `https://api.navitia.io/v3/coverage/sncf/vehicle_journeys?filter=${filter}&count=100`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey,
      },
    });
    
    if (!response.ok) {
      console.warn("[SNCF Trains] Erreur récupération tous les trains, fallback sur lignes individuelles:", response.status);
      
      // Fallback: récupérer ligne par ligne
      const lines = await getSNCFLines(apiKey, lineTypes);
      const allTrains: SNCFTrain[] = [];
      
      // Limiter à 5 lignes pour éviter trop d'appels
      for (const line of lines.slice(0, 5)) {
        try {
          const trains = await getTrainsForLine(line.id, apiKey);
          allTrains.push(...trains);
        } catch (error) {
          console.warn(`[SNCF Trains] Erreur pour ligne ${line.name}:`, error);
        }
      }
      
      return allTrains.length > 0 ? allTrains : getSimulatedTrains();
    }
    
    const data = await response.json();
    const trains: SNCFTrain[] = [];
    
    // Parser la réponse Navitia
    if (data?.vehicle_journeys && Array.isArray(data.vehicle_journeys)) {
      data.vehicle_journeys.forEach((journey: any) => {
        const mappedTrain = mapSncfTrain(journey);
        if (mappedTrain && mappedTrain.coordinates) {
          trains.push(mappedTrain);
        }
      });
    }
    
    return trains.length > 0 ? trains : getSimulatedTrains();
  } catch (error) {
    console.warn("[SNCF Trains] Erreur récupération tous les trains, utilisation données simulées:", error);
    return getSimulatedTrains();
  }
}

/**
 * Récupère les gares SNCF principales
 */
export async function getSNCFStations(apiKey?: string): Promise<SNCFStation[]> {
  try {
    if (!apiKey) {
      return getDefaultStations();
    }
    
    const url = 'https://api.navitia.io/v3/coverage/sncf/stop_areas?type[]=stop_area';
    
    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey,
      },
    });
    
    if (!response.ok) {
      return getDefaultStations();
    }
    
    const data = await response.json();
    const stations: SNCFStation[] = [];
    
    if (data?.stop_areas && Array.isArray(data.stop_areas)) {
      data.stop_areas.forEach((area: any) => {
        if (area?.coord) {
          stations.push({
            id: area.id || `station_${Math.random()}`,
            name: area.name || 'Gare inconnue',
            lat: area.coord.lat || 0,
            lng: area.coord.lon || 0,
          });
        }
      });
    }
    
    return stations.length > 0 ? stations : getDefaultStations();
  } catch (error) {
    console.warn("[SNCF Trains] Erreur récupération gares, utilisation données par défaut:", error);
    return getDefaultStations();
  }
}

/**
 * Données par défaut pour les lignes
 */
function getDefaultLines(): SNCFLine[] {
  return [
    { id: 'RER_A', name: 'RER A', type: 'RER', color: '#FFCD00' },
    { id: 'RER_B', name: 'RER B', type: 'RER', color: '#003CA6' },
    { id: 'RER_C', name: 'RER C', type: 'RER', color: '#FFCD00' },
    { id: 'RER_D', name: 'RER D', type: 'RER', color: '#00AC9A' },
    { id: 'RER_E', name: 'RER E', type: 'RER', color: '#D4AF37' },
    { id: 'TER_HDF', name: 'TER Hauts-de-France', type: 'TER' },
    { id: 'TER_IDF', name: 'TER Île-de-France', type: 'TER' },
  ];
}

/**
 * Données par défaut pour les gares
 */
function getDefaultStations(): SNCFStation[] {
  return [
    { id: 'stop_area:SNCF:87758011', name: 'Paris Gare du Nord', lat: 48.8809, lng: 2.3553 },
    { id: 'stop_area:SNCF:87758611', name: 'Paris Gare de Lyon', lat: 48.8447, lng: 2.3731 },
    { id: 'stop_area:SNCF:87758608', name: 'Paris Gare de l\'Est', lat: 48.8769, lng: 2.3592 },
    { id: 'stop_area:SNCF:87758605', name: 'Paris Gare Montparnasse', lat: 48.8412, lng: 2.3206 },
    { id: 'stop_area:SNCF:87758606', name: 'Paris Gare d\'Austerlitz', lat: 48.8423, lng: 2.3644 },
    { id: 'stop_area:SNCF:87758607', name: 'Paris Gare Saint-Lazare', lat: 48.8764, lng: 2.3261 },
    { id: 'stop_area:SNCF:87751036', name: 'Lyon Part-Dieu', lat: 45.7606, lng: 4.8604 },
    { id: 'stop_area:SNCF:87751008', name: 'Marseille Saint-Charles', lat: 43.3032, lng: 5.3842 },
    { id: 'stop_area:SNCF:87543008', name: 'Toulouse Matabiau', lat: 43.6108, lng: 1.4544 },
    { id: 'stop_area:SNCF:87547000', name: 'Strasbourg', lat: 48.5850, lng: 7.7344 },
  ];
}

/**
 * Données simulées pour les trains (fallback)
 */
function getSimulatedTrains(): SNCFTrain[] {
  const now = new Date();
  const trains: SNCFTrain[] = [];
  
  // Simuler quelques trains en circulation
  const stations = getDefaultStations();
  
  for (let i = 0; i < 5; i++) {
    const departureStation = stations[Math.floor(Math.random() * stations.length)];
    const arrivalStation = stations[Math.floor(Math.random() * stations.length)];
    
    if (departureStation.id !== arrivalStation.id) {
      const departureTime = new Date(now.getTime() + Math.random() * 3600000);
      const arrivalTime = new Date(departureTime.getTime() + 3600000 + Math.random() * 1800000);
      
      trains.push({
        id: `train_${i}_${Date.now()}`,
        type: Math.random() > 0.5 ? 'RER' : 'TER',
        departureStation: departureStation.name,
        arrivalStation: arrivalStation.name,
        departureTime: departureTime.toISOString(),
        arrivalTime: arrivalTime.toISOString(),
        delay: Math.random() > 0.7 ? Math.floor(Math.random() * 600) : 0,
        coordinates: {
          lat: departureStation.lat + (Math.random() - 0.5) * 0.1,
          lng: departureStation.lng + (Math.random() - 0.5) * 0.1,
        },
        line: Math.random() > 0.5 ? 'RER A' : 'TER',
      });
    }
  }
  
  return trains;
}
