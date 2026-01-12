"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import type { SNCFTrain, SNCFStation } from "@/app/lib/services/sncf-trains";

interface MapFerroviaireProps {
  refreshInterval?: number; // en millisecondes, défaut: 60000 (60 secondes)
}

export function MapFerroviaire({ refreshInterval = 60000 }: MapFerroviaireProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const trainMarkersRef = useRef<any[]>([]);
  const LRef = useRef<any>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [trains, setTrains] = useState<SNCFTrain[]>([]);
  const [stations, setStations] = useState<SNCFStation[]>([]);
  const [selectedDeparture, setSelectedDeparture] = useState<string>("");
  const [selectedArrival, setSelectedArrival] = useState<string>("");
  const [selectedLine, setSelectedLine] = useState<string>("RER A"); // Par défaut: RER A
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  // Fonction pour charger les trains en circulation
  const loadTrains = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/traffic/sncf/trains");
      
      if (!response.ok) {
        throw new Error("Erreur récupération trains");
      }
      
      const data = await response.json();
      
      if (data.trains && Array.isArray(data.trains)) {
        setTrains(data.trains);
      }
      
      if (data.stations && Array.isArray(data.stations)) {
        setStations(data.stations);
      }
      
      setLastUpdate(data.lastUpdate || new Date().toISOString());
    } catch (error) {
      console.error("[MapFerroviaire] Erreur chargement trains:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Fonction pour mettre à jour les markers sur la carte
  const updateTrainsOnMap = useCallback((trainsToDisplay: SNCFTrain[]) => {
    if (!mapRef.current || !LRef.current) return;
    
    const map = mapRef.current;
    const L = LRef.current;
    
    // Supprimer les anciens markers
    trainMarkersRef.current.forEach(marker => {
      try {
        map.removeLayer(marker);
      } catch (e) {
        // Ignorer les erreurs de suppression
      }
    });
    trainMarkersRef.current = [];
    
    // Ajouter les nouveaux markers
    trainsToDisplay.forEach(train => {
      if (!train.coordinates || !train.coordinates.lat || !train.coordinates.lng) {
        return; // Ignorer les trains sans coordonnées
      }
      
      // Déterminer l'icône et la couleur selon le type de train
      const { icon, color } = getTrainIconAndColor(train.type);
      
      const trainIcon = L.divIcon({
        className: "custom-train-marker",
        html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <span style="font-size: 12px;">${icon}</span>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      
      const marker = L.marker([train.coordinates.lat, train.coordinates.lng], { icon: trainIcon }).addTo(map);
      
      // Construire le popup
      const popupContent = buildTrainPopup(train);
      
      marker.bindPopup(popupContent, {
        maxWidth: 280,
        className: 'custom-train-popup',
      });
      
      trainMarkersRef.current.push(marker);
    });
  }, []);

  // Fonction pour obtenir l'icône et la couleur selon le type de train
  const getTrainIconAndColor = (type: string): { icon: string; color: string } => {
    switch (type) {
      case 'RER':
        return { icon: '🚆', color: '#003CA6' };
      case 'TER':
        return { icon: '🚃', color: '#00AC9A' };
      case 'TGV':
        return { icon: '🚄', color: '#FF0000' };
      case 'Intercités':
        return { icon: '🚂', color: '#FFCD00' };
      case 'Tram':
        return { icon: '🚊', color: '#00A550' };
      case 'Metro':
        return { icon: '🚇', color: '#FF6B00' };
      default:
        return { icon: '🚉', color: '#6B7280' };
    }
  };

  // Fonction pour construire le popup d'un train
  const buildTrainPopup = (train: SNCFTrain): string => {
    const delayMinutes = train.delay ? Math.floor(train.delay / 60) : 0;
    const delayDisplay = delayMinutes > 0 ? `+${delayMinutes} min` : 'À l\'heure';
    const delayColor = delayMinutes > 0 ? '#ef4444' : '#10b981';
    
    let popupContent = `<div style="padding: 12px; min-width: 250px; font-family: system-ui, -apple-system, sans-serif;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
        <span style="font-size: 20px;">${getTrainIconAndColor(train.type).icon}</span>
        <b style="font-size: 16px; color: ${getTrainIconAndColor(train.type).color};">${train.type}</b>
      </div>
      
      <div style="font-size: 13px; margin-bottom: 8px; line-height: 1.5;">
        <div style="margin-bottom: 4px;">
          <strong>Départ:</strong> ${train.departureStation}
        </div>
        <div>
          <strong>Arrivée:</strong> ${train.arrivalStation}
        </div>
      </div>`;
    
    // Heure théorique
    if (train.departureTime) {
      try {
        const departureDate = new Date(train.departureTime);
        const timeStr = departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        popupContent += `<div style="font-size: 12px; color: #666; margin-bottom: 6px;">
          <strong>Départ théorique:</strong> ${timeStr}
        </div>`;
      } catch (e) {
        // Ignorer les erreurs de parsing
      }
    }
    
    // Retard
    popupContent += `<div style="font-size: 12px; margin-bottom: 6px;">
      <span style="background-color: ${delayColor}; color: white; padding: 2px 8px; border-radius: 12px; font-weight: 500;">
        ${delayDisplay}
      </span>
    </div>`;
    
    // Ligne
    if (train.line) {
      popupContent += `<div style="font-size: 11px; color: #999; margin-top: 6px; border-top: 1px solid #eee; padding-top: 6px;">
        Ligne: ${train.line}
      </div>`;
    }
    
    popupContent += `</div>`;
    
    return popupContent;
  };

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    let mounted = true;
    
    const initMap = async () => {
      try {
        const L = await import("leaflet");
        
        // Fix des icônes Leaflet
        delete (L.default.Icon.Default.prototype as any)._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });
        
        if (!mounted || !mapContainerRef.current) return;
        
        const Leaflet = L.default;
        LRef.current = Leaflet;
        
        // Créer la carte centrée sur la France
        const map = Leaflet.map(mapContainerRef.current, {
          center: [46.6034, 1.8883], // Centre de la France
          zoom: 6,
          zoomControl: true,
        });
        
        // Ajouter la couche de tuiles
        Leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);
        
        mapRef.current = map;
        
        // Charger les trains initialement
        loadTrains();
      } catch (error) {
        console.error("[MapFerroviaire] Erreur initialisation carte:", error);
      }
    };
    
    initMap();
    
    return () => {
      mounted = false;
    };
  }, [loadTrains]);

  // Rafraîchissement automatique
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    refreshIntervalRef.current = setInterval(() => {
      loadTrains();
    }, refreshInterval);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [loadTrains, refreshInterval]);

  // Fonction pour filtrer les trains selon les critères sélectionnés
  const getFilteredTrains = useCallback((trainsToFilter: SNCFTrain[]): SNCFTrain[] => {
    let filtered = trainsToFilter;
    
    // Filtrer par ligne sélectionnée
    if (selectedLine && selectedLine !== "all") {
      filtered = filtered.filter(train => {
        // Vérifier si le train correspond à la ligne sélectionnée
        // Le champ `line` peut contenir "RER A", "RER B", "TER", etc.
        const trainLine = train.line?.toUpperCase() || '';
        const selectedLineUpper = selectedLine.toUpperCase();
        
        // Correspondance exacte ou partielle (ex: "RER A" dans "RER A - Châtelet")
        // Supporte aussi les lignes TER, RER C, D, E, etc.
        return trainLine.includes(selectedLineUpper) || 
               (train.type === 'RER' && selectedLineUpper.startsWith('RER') && trainLine.includes(selectedLineUpper)) ||
               (train.type === 'TER' && selectedLineUpper.startsWith('TER') && trainLine.includes(selectedLineUpper));
      });
    }
    
    // Filtrer par gare de départ
    if (selectedDeparture) {
      filtered = filtered.filter(train => 
        train.departureStation.toLowerCase().includes(selectedDeparture.toLowerCase())
      );
    }
    
    // Filtrer par gare d'arrivée
    if (selectedArrival) {
      filtered = filtered.filter(train => 
        train.arrivalStation.toLowerCase().includes(selectedArrival.toLowerCase())
      );
    }
    
    return filtered;
  }, [selectedDeparture, selectedArrival, selectedLine]);

  // Filtrer les trains quand les gares ou la ligne changent
  useEffect(() => {
    if (trains.length > 0) {
      const filteredTrains = getFilteredTrains(trains);
      updateTrainsOnMap(filteredTrains);
    }
  }, [selectedDeparture, selectedArrival, selectedLine, trains, updateTrainsOnMap, getFilteredTrains]);

  // Nettoyage
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Sélecteurs de gares et lignes au-dessus de la carte */}
      <div className="station-selectors-container" style={{ position: 'relative', zIndex: 1000 }}>
        <div className="absolute top-4 left-4 right-4 flex gap-4 flex-wrap">
          {/* Sélecteur de ligne (Onglets RER A / RER B / Toutes) */}
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-lg p-3">
            <label className="text-xs font-medium text-[hsl(var(--foreground))] block mb-2">
              Ligne
            </label>
            <Tabs value={selectedLine} onValueChange={setSelectedLine} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="RER A" className="text-xs px-2 py-1">
                  RER A
                </TabsTrigger>
                <TabsTrigger value="RER B" className="text-xs px-2 py-1">
                  RER B
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs px-2 py-1">
                  Toutes
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Sélecteur gare de départ */}
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-lg p-3 min-w-[200px]">
            <label htmlFor="departure-select" className="text-xs font-medium text-[hsl(var(--foreground))] block mb-2">
              Gare de départ
            </label>
            <Select value={selectedDeparture || "all"} onValueChange={(value) => setSelectedDeparture(value === "all" ? "" : value)}>
              <SelectTrigger id="departure-select" className="w-full">
                <SelectValue placeholder="Toutes les gares" />
              </SelectTrigger>
              <SelectContent className="!z-[1001]">
                <SelectItem value="all">Toutes les gares</SelectItem>
                {stations.map((station) => (
                  <SelectItem key={station.id} value={station.name}>
                    {station.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sélecteur gare d'arrivée */}
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-lg p-3 min-w-[200px]">
            <label htmlFor="arrival-select" className="text-xs font-medium text-[hsl(var(--foreground))] block mb-2">
              Gare d'arrivée
            </label>
            <Select value={selectedArrival || "all"} onValueChange={(value) => setSelectedArrival(value === "all" ? "" : value)}>
              <SelectTrigger id="arrival-select" className="w-full">
                <SelectValue placeholder="Toutes les gares" />
              </SelectTrigger>
              <SelectContent className="!z-[1001]">
                <SelectItem value="all">Toutes les gares</SelectItem>
                {stations.map((station) => (
                  <SelectItem key={station.id} value={station.name}>
                    {station.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Indicateur de chargement et dernière mise à jour */}
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-lg p-3 flex items-center gap-2">
            {isLoading ? (
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Chargement...</span>
            ) : (
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {(() => {
                  const filteredCount = getFilteredTrains(trains).length;
                  return `${filteredCount} train${filteredCount > 1 ? 's' : ''} affiché${filteredCount > 1 ? 's' : ''}`;
                })()}
                {lastUpdate && (
                  <span className="block text-[10px] mt-1">
                    Dernière mise à jour: {new Date(lastUpdate).toLocaleTimeString('fr-FR')}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Conteneur de la carte avec z-index inférieur */}
      <div className="map-container" style={{ position: 'relative', zIndex: 1, width: '100%', height: '600px' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
