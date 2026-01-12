"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "leaflet/dist/leaflet.css";

interface RailwayStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance: number;
  lines: string[];
}

interface RailwayDisruption {
  id: string;
  type: "delay" | "cancellation" | "partial_cancellation" | "incident";
  severity: "low" | "medium" | "high";
  stationId: string;
  stationName: string;
  line: string;
  delayMinutes: number;
  delayHours: number;
  message: string;
}

interface TraficFerroviaireMapProps {
  cityLocation: { lat: number; lng: number; name: string };
}

export function TraficFerroviaireMap({ cityLocation }: TraficFerroviaireMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const dataRef = useRef<{ stations: RailwayStation[]; disruptions: RailwayDisruption[] } | null>(null);
  const LRef = useRef<any>(null);
  const mapInitializedRef = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadingRef = useRef(false);
  const lastFetchRef = useRef<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Fonction pour charger les données SNCF réelles
  const loadSNCFData = useCallback(async () => {
    // Éviter les appels multiples simultanés
    if (loadingRef.current) return;

    // Créer une clé unique pour cette requête
    const fetchKey = `${cityLocation.lat}-${cityLocation.lng}-${cityLocation.name}`;
    
    // Éviter les appels identiques répétés
    if (lastFetchRef.current === fetchKey && dataRef.current) {
      return;
    }

    loadingRef.current = true;
    lastFetchRef.current = fetchKey;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/traffic/sncf?lat=${cityLocation.lat}&lng=${cityLocation.lng}&radius=100`);
      
      if (!response.ok) {
        throw new Error("Erreur récupération données SNCF");
      }

      const data = await response.json();
      
      if (data.stations && data.disruptions) {
        dataRef.current = {
          stations: data.stations || [],
          disruptions: data.disruptions || [],
        };
        
        // Mettre à jour la carte si elle est initialisée
        if (mapInitializedRef.current && mapRef.current) {
          updateMapLayers();
        }
      }
    } catch (err) {
      console.error("[TraficFerroviaireMap] Erreur chargement données:", err);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [cityLocation.lat, cityLocation.lng, cityLocation.name]);

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

        // Créer la carte
        const map = Leaflet.map(mapContainerRef.current, {
          center: [cityLocation.lat, cityLocation.lng],
          zoom: 11,
          zoomControl: true,
        });

        // Ajouter la couche de tuiles
        Leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;
        mapInitializedRef.current = true;

        // Forcer le recalcul de la taille
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (map && typeof map.invalidateSize === 'function') {
              try {
                map.invalidateSize();
              } catch (e) {}
            }
          }, 100);
        });

        // Si les données sont déjà chargées, les afficher
        if (dataRef.current) {
          updateMapLayers();
        }
      } catch (err) {
        console.error("[TraficFerroviaireMap] Erreur initialisation:", err);
      }
    };

    const timer = setTimeout(() => {
      initMap();
    }, 50);

    return () => {
      mounted = false;
      clearTimeout(timer);
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      
      if (mapRef.current) {
        try {
          layersRef.current.forEach(layer => {
            try {
              mapRef.current.removeLayer(layer);
            } catch (e) {}
          });
          layersRef.current = [];
          mapRef.current.remove();
          mapRef.current = null;
          mapInitializedRef.current = false;
        } catch (e) {
          console.warn("[TraficFerroviaireMap] Erreur cleanup:", e);
        }
      }
    };
  }, []); // Initialisation unique

  // Charger les données SNCF une seule fois au montage et quand la ville change
  useEffect(() => {
    // Nettoyer l'intervalle précédent
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // Charger les données immédiatement
    loadSNCFData();

    // Rafraîchissement périodique (60 secondes) seulement si la carte est initialisée
    const intervalId = setInterval(() => {
      if (mapInitializedRef.current) {
        loadSNCFData();
      }
    }, 60000);

    refreshIntervalRef.current = intervalId;

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [cityLocation.lat, cityLocation.lng, cityLocation.name, loadSNCFData]);

  // Fonction pour mettre à jour les layers
  const updateMapLayers = useCallback(() => {
    if (!mapRef.current || !dataRef.current || !LRef.current) return;

    const map = mapRef.current;
    const L = LRef.current;

    // Supprimer les anciens layers
    layersRef.current.forEach(layer => {
      try {
        map.removeLayer(layer);
      } catch (e) {}
    });
    layersRef.current = [];

    const { stations, disruptions } = dataRef.current;

    // Créer une map des perturbations par station
    const disruptionsMap = new Map<string, RailwayDisruption>();
    disruptions.forEach(disruption => {
      disruptionsMap.set(disruption.stationId, disruption);
    });

    // Afficher les gares avec perturbations
    if (stations && stations.length > 0) {
      stations.forEach((station: RailwayStation) => {
        const disruption = disruptionsMap.get(station.id);
        
        // Couleur selon le type de perturbation
        const statusColor = disruption
          ? disruption.type === "cancellation"
            ? "#6b7280" // Gris = annulé
            : disruption.severity === "high"
            ? "#ef4444" // Rouge = retard important
            : disruption.severity === "medium"
            ? "#f59e0b" // Orange = retard moyen
            : "#eab308" // Jaune = retard faible
          : "#10b981"; // Vert = à l'heure

        const icon = L.divIcon({
          className: "custom-station-marker",
          html: `<div style="background-color: ${statusColor}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-center;">
            <span style="color: white; font-size: 14px; font-weight: bold;">🚂</span>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([station.lat, station.lng], { icon }).addTo(map);
        
        let popupContent = `<div style="padding: 6px; min-width: 200px;">
          <b style="font-size: 14px; display: block; margin-bottom: 6px;">${station.name}</b>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            📍 Distance: <strong>${station.distance.toFixed(1)} km</strong>
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            🚆 Lignes: <strong>${station.lines.join(", ")}</strong>
          </div>`;
        
        if (disruption) {
          popupContent += `<hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;"/>`;
          
          if (disruption.type === "cancellation") {
            popupContent += `<div style="padding: 6px; background-color: #f3f4f6; border-radius: 4px; border: 1px solid #e5e7eb;">
              <span style="color: #374151; font-weight: 600; font-size: 12px;">❌ Suppression</span><br/>
              <span style="color: #6b7280; font-size: 11px; margin-top: 4px; display: block;">
                ${disruption.message}
              </span>
              <span style="color: #6b7280; font-size: 11px; margin-top: 4px; display: block;">
                Ligne: <strong>${disruption.line}</strong>
              </span>
            </div>`;
          } else if (disruption.type === "delay") {
            popupContent += `<div style="padding: 6px; background-color: #fee2e2; border-radius: 4px; border: 1px solid #fecaca;">
              <span style="color: #991b1b; font-weight: 600; font-size: 12px;">⚠️ Retard</span><br/>
              <span style="color: #7f1d1d; font-size: 12px; margin-top: 4px; display: block;">
                ${disruption.delayHours > 0 ? `<strong>${disruption.delayHours}h </strong>` : ""}<strong>${disruption.delayMinutes}</strong> min
              </span>
              <span style="color: #6b7280; font-size: 11px; margin-top: 4px; display: block;">
                ${disruption.message}
              </span>
              <span style="color: #6b7280; font-size: 11px; margin-top: 4px; display: block;">
                Ligne: <strong>${disruption.line}</strong>
              </span>
            </div>`;
          } else {
            popupContent += `<div style="padding: 6px; background-color: #fef3c7; border-radius: 4px; border: 1px solid #fde68a;">
              <span style="color: #92400e; font-weight: 600; font-size: 12px;">⚠️ ${disruption.type === "incident" ? "Incident" : "Perturbation"}</span><br/>
              <span style="color: #6b7280; font-size: 11px; margin-top: 4px; display: block;">
                ${disruption.message}
              </span>
              <span style="color: #6b7280; font-size: 11px; margin-top: 4px; display: block;">
                Ligne: <strong>${disruption.line}</strong>
              </span>
            </div>`;
          }
        } else {
          popupContent += `<div style="padding: 6px; background-color: #dcfce7; border-radius: 4px; border: 1px solid #bbf7d0;">
            <span style="color: #166534; font-weight: 600; font-size: 12px;">✅ Circulation normale</span>
          </div>`;
        }
        
        popupContent += `</div>`;
        
        marker.bindPopup(popupContent);
        layersRef.current.push(marker);
      });

      // Ajuster la vue pour voir toutes les stations
      if (stations.length > 0) {
        const bounds = L.latLngBounds(
          stations.map((s: RailwayStation) => [s.lat, s.lng] as [number, number])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    } else {
      // Si pas de stations, centrer sur la ville
      map.setView([cityLocation.lat, cityLocation.lng], 11);
    }

    // Recalculer la taille
    requestAnimationFrame(() => {
      if (map && map._loaded && typeof map.invalidateSize === 'function') {
        try {
          map.invalidateSize();
        } catch (e) {}
      }
    });
  }, [cityLocation.lat, cityLocation.lng]);

  // Mettre à jour les layers quand les données changent
  useEffect(() => {
    if (mapInitializedRef.current && mapRef.current && dataRef.current) {
      updateMapLayers();
    }
  }, [updateMapLayers]);

  return (
    <div className="relative">
      <div
        ref={mapContainerRef}
        className="h-[500px] w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800"
        suppressHydrationWarning
      />
      {isLoading && (
        <div className="absolute top-2 right-2 z-[999] bg-white/90 dark:bg-zinc-900/90 px-3 py-1 rounded-md text-xs text-zinc-600 dark:text-zinc-400">
          Mise à jour SNCF...
        </div>
      )}
    </div>
  );
}
