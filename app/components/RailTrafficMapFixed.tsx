"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface RailwayStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance: number;
  lines: string[];
}

interface RailwayDelay {
  stationId: string;
  stationName: string;
  line: string;
  delayMinutes: number;
  delayHours: number;
  status: "on-time" | "delayed" | "cancelled";
  lastUpdate: string;
}

interface RailwayLine {
  id: string;
  name: string;
  type: "TER" | "TGV" | "Intercités" | "Transilien" | "RER";
  coordinates: Array<{ lat: number; lng: number }>;
  color?: string;
}

interface RailTrafficMapFixedProps {
  userLocation: { lat: number; lng: number };
}

export function RailTrafficMapFixed({ userLocation }: RailTrafficMapFixedProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    let mounted = true;

    const initMap = async () => {
      try {
        // Importer Leaflet
        const L = await import("leaflet");

        // Fix des icônes Leaflet
        delete (L.default.Icon.Default.prototype as any)._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        if (!mounted || !mapContainerRef.current) return;

        // Nettoyer complètement le container
        const container = mapContainerRef.current;
        container.innerHTML = "";
        delete (container as any)._leaflet_id;

        // Créer la carte
        const map = L.default.map(container, {
          center: [userLocation.lat || 48.8566, userLocation.lng || 2.3522],
          zoom: 10,
          zoomControl: true,
        });

        // Ajouter la couche de tuiles
        L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;

        // Charger les données ferroviaires
        const response = await fetch(`/api/traffic/railway?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=100`);
        const data = await response.json();

        if (!mounted || !mapRef.current) return;

        // Afficher les lignes
        if (data.lines && data.lines.length > 0) {
          data.lines.forEach((line: RailwayLine) => {
            if (line.coordinates && line.coordinates.length > 1) {
              const color = line.color || (line.type === "TGV" ? "#dc2626" : line.type === "TER" ? "#0891b2" : "#7c3aed");
              const positions = line.coordinates.map(c => [c.lat, c.lng] as [number, number]);
              const polyline = L.default.polyline(positions, {
                color,
                weight: 4,
                opacity: 0.7,
              });
              polyline.bindPopup(`<b>${line.name}</b><br/>Type: ${line.type}`);
              polyline.addTo(map);
              polylinesRef.current.push(polyline);
            }
          });
        }

        // Afficher les gares
        if (data.stations && data.stations.length > 0) {
          const delaysMap = new Map<string, RailwayDelay>();
          if (data.delays) {
            data.delays.forEach((delay: RailwayDelay) => {
              delaysMap.set(delay.stationId, delay);
            });
          }

          data.stations.forEach((station: RailwayStation) => {
            const delay = delaysMap.get(station.id);
            const statusColor = delay
              ? delay.status === "delayed"
                ? "#ef4444"
                : delay.status === "cancelled"
                ? "#6b7280"
                : "#10b981"
              : "#3b82f6";

            const icon = L.default.divIcon({
              className: "custom-marker",
              html: `<div style="background-color: ${statusColor}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-center; cursor: pointer;">
                <span style="color: white; font-size: 12px;">🚂</span>
              </div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });

            const marker = L.default.marker([station.lat, station.lng], { icon }).addTo(map);
            
            let popupContent = `<b>${station.name}</b><br/>`;
            popupContent += `Distance: ${station.distance.toFixed(1)} km<br/>`;
            popupContent += `Lignes: ${station.lines.join(", ")}<br/>`;
            
            if (delay) {
              popupContent += `<hr/>`;
              if (delay.status === "delayed") {
                popupContent += `<span style="color: #ef4444;"><b>⚠️ Retard</b></span><br/>`;
                popupContent += `${delay.delayHours > 0 ? delay.delayHours + "h " : ""}${delay.delayMinutes} min<br/>`;
              } else if (delay.status === "cancelled") {
                popupContent += `<span style="color: #6b7280;"><b>❌ Annulé</b></span><br/>`;
              } else {
                popupContent += `<span style="color: #10b981;"><b>✅ À l'heure</b></span><br/>`;
              }
              popupContent += `Ligne: ${delay.line}`;
            }
            
            marker.bindPopup(popupContent);
            markersRef.current.push(marker);
          });

          // Ajuster la vue pour voir toutes les stations
          if (data.stations.length > 0) {
            const bounds = L.default.latLngBounds(
              data.stations.map((s: RailwayStation) => [s.lat, s.lng] as [number, number])
            );
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
          }
        } else {
          // Si pas de stations, centrer sur la position utilisateur
          map.setView([userLocation.lat || 48.8566, userLocation.lng || 2.3522], 11);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("[RailTrafficMapFixed] Erreur:", err);
        setError(err instanceof Error ? err.message : "Erreur lors du chargement de la carte");
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      mounted = false;
      if (mapRef.current) {
        try {
          // Supprimer tous les marqueurs
          markersRef.current.forEach(m => mapRef.current.removeLayer(m));
          markersRef.current = [];
          
          // Supprimer toutes les polylines
          polylinesRef.current.forEach(p => mapRef.current.removeLayer(p));
          polylinesRef.current = [];
          
          // Supprimer la carte
          mapRef.current.remove();
          mapRef.current = null;
        } catch (e) {
          console.warn("[RailTrafficMapFixed] Erreur cleanup:", e);
        }
      }
      
      // Nettoyer le container
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = "";
        delete (mapContainerRef.current as any)._leaflet_id;
      }
    };
  }, [userLocation.lat, userLocation.lng]); // Réinitialiser si la position change

  if (isLoading) {
    return (
      <div className="h-[500px] flex items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))] mx-auto mb-2" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Chargement de la carte ferroviaire...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[500px] flex items-center justify-center rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
        <div className="text-center">
          <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
            Erreur
          </p>
          <p className="text-xs text-red-600 dark:text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className="h-[500px] w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800"
    />
  );
}
