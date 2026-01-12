"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "leaflet/dist/leaflet.css";

interface TraficRoutierMapProps {
  userLocation: { lat: number; lng: number };
  destinationLocation?: { lat: number; lng: number } | null;
  routes?: Array<{
    name: string;
    polyline?: Array<{ lat: number; lng: number }>;
  }>;
}

import type { MappedTrafficIncident } from "@/app/lib/services/tomtom-traffic";

interface TrafficIncident extends MappedTrafficIncident {}

export function TraficRoutierMap({ 
  userLocation, 
  destinationLocation,
  routes = []
}: TraficRoutierMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const incidentsLayersRef = useRef<any[]>([]);
  const LRef = useRef<any>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);

  // Fonction pour calculer la BBOX depuis les bounds de la carte
  const getCurrentBbox = useCallback((): string | null => {
    if (!mapRef.current) return null;

    const map = mapRef.current;
    const bounds = map.getBounds();
    
    if (!bounds) return null;

    const northEast = bounds.getNorthEast();
    const southWest = bounds.getSouthWest();

    // Format: "minLon,minLat,maxLon,maxLat"
    return `${southWest.lng},${southWest.lat},${northEast.lng},${northEast.lat}`;
  }, []);

  // Fonction pour récupérer les incidents réels depuis TomTom
  const fetchTrafficIncidents = useCallback(async () => {
    if (!mapRef.current || isLoadingIncidents) return;

    const bbox = getCurrentBbox();
    if (!bbox) return;

    setIsLoadingIncidents(true);

    try {
      // Appel API serveur (clé API sécurisée côté serveur)
      const response = await fetch(`/api/traffic/tomtom?bbox=${bbox}`);
      
      const data = await response.json();
      
      // Gérer les erreurs de manière gracieuse
      if (data.error) {
        console.warn("[TraficRoutierMap] Avertissement:", data.error);
        // Afficher un tableau vide plutôt que de planter
        setIncidents([]);
        updateIncidentsOnMap([]);
        return;
      }
      
      if (data.incidents && Array.isArray(data.incidents)) {
        setIncidents(data.incidents);
        updateIncidentsOnMap(data.incidents);
      } else {
        // Si pas d'incidents, initialiser avec un tableau vide
        setIncidents([]);
        updateIncidentsOnMap([]);
      }
    } catch (error) {
      console.error("[TraficRoutierMap] Erreur récupération incidents:", error);
      // En cas d'erreur, afficher un tableau vide plutôt que de planter
      setIncidents([]);
      updateIncidentsOnMap([]);
    } finally {
      setIsLoadingIncidents(false);
    }
  }, [getCurrentBbox, isLoadingIncidents]);

  // Fonction pour afficher les incidents sur la carte
  const updateIncidentsOnMap = useCallback((incidents: TrafficIncident[]) => {
    if (!mapRef.current || !LRef.current) return;

    const map = mapRef.current;
    const L = LRef.current;

    // Supprimer les anciens incidents
    incidentsLayersRef.current.forEach(layer => {
      try {
        map.removeLayer(layer);
      } catch (e) {}
    });
    incidentsLayersRef.current = [];

    // Ajouter les nouveaux incidents avec icônes et popups améliorés
    incidents.forEach(incident => {
      // Utiliser les métadonnées mappées (icon, color, label)
      const icon = L.divIcon({
        className: "custom-incident-marker",
        html: `<div style="background-color: ${incident.color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-center; cursor: pointer;">
          <span style="font-size: 14px;">${incident.icon}</span>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([incident.lat, incident.lng], { icon }).addTo(map);
      
      // Construire le popup avec toutes les informations disponibles
      let popupContent = `<div style="padding: 10px; min-width: 220px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: 18px;">${incident.icon}</span>
          <b style="font-size: 15px; color: ${incident.color};">${incident.label}</b>
        </div>
        
        <div style="font-size: 12px; color: #666; margin-bottom: 8px; line-height: 1.4;">
          ${incident.description}
        </div>
        
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">`;
      
      // Badge de sévérité
      const severityColors: Record<string, string> = {
        'LOW': '#10b981',
        'MEDIUM': '#f59e0b',
        'HIGH': '#ef4444',
      };
      const severityLabels: Record<string, string> = {
        'LOW': 'Faible',
        'MEDIUM': 'Moyenne',
        'HIGH': 'Élevée',
      };
      popupContent += `<span style="background-color: ${severityColors[incident.severity]}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">
        Gravité: ${severityLabels[incident.severity]}
      </span>`;
      
      // Retard estimé
      if (incident.delay) {
        popupContent += `<span style="background-color: #3b82f6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">
          Retard: ${incident.delay} min
        </span>`;
      }
      
      popupContent += `</div>`;
      
      // Heure de début
      if (incident.startTime) {
        try {
          const startDate = new Date(incident.startTime);
          const timeStr = startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          popupContent += `<div style="font-size: 11px; color: #999; margin-top: 6px; border-top: 1px solid #eee; padding-top: 6px;">
            Début: ${timeStr}
          </div>`;
        } catch (e) {
          // Ignorer les erreurs de parsing de date
        }
      }
      
      // Numéros de route
      if (incident.roadNumbers && incident.roadNumbers.length > 0) {
        popupContent += `<div style="font-size: 11px; color: #999; margin-top: 4px;">
          Routes: ${incident.roadNumbers.join(', ')}
        </div>`;
      }
      
      popupContent += `</div>`;
      
      marker.bindPopup(popupContent, {
        maxWidth: 250,
        className: 'custom-popup',
      });
      incidentsLayersRef.current.push(marker);
    });
  }, []);

  // Les fonctions getIncidentColor, getIncidentIcon et getIncidentTypeLabel
  // ne sont plus nécessaires car les incidents mappés contiennent déjà
  // icon, color et label depuis mapTomTomIncident()

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
          center: [userLocation.lat, userLocation.lng],
          zoom: 13,
          zoomControl: true,
        });

        // Ajouter la couche de tuiles
        Leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;

        // Écouter les événements de déplacement/zoom pour mettre à jour les incidents
        map.on("moveend", () => {
          fetchTrafficIncidents();
        });

        map.on("zoomend", () => {
          fetchTrafficIncidents();
        });

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

        // Ajouter marqueur position utilisateur
        const userIcon = Leaflet.divIcon({
          className: "custom-user-marker",
          html: `<div style="background-color: #3b82f6; width: 32px; height: 32px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-center;">
            <span style="color: white; font-size: 14px; font-weight: bold;">📍</span>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const userMarker = Leaflet.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup("<b>Votre position</b>");
        layersRef.current.push(userMarker);

        // Ajouter marqueur destination si disponible
        if (destinationLocation) {
          const destIcon = Leaflet.divIcon({
            className: "custom-dest-marker",
            html: `<div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-center;">
              <span style="color: white; font-size: 14px; font-weight: bold;">🎯</span>
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const destMarker = Leaflet.marker([destinationLocation.lat, destinationLocation.lng], { icon: destIcon })
            .addTo(map)
            .bindPopup("<b>Destination</b>");
          layersRef.current.push(destMarker);

          // Ajuster la vue
          const bounds = Leaflet.latLngBounds(
            [[userLocation.lat, userLocation.lng], [destinationLocation.lat, destinationLocation.lng]]
          );
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }

        // Afficher les itinéraires
        if (routes && routes.length > 0) {
          routes.forEach((route, index) => {
            if (route.polyline && route.polyline.length > 1) {
              const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];
              const color = colors[index % colors.length];
              const positions = route.polyline.map(p => [p.lat, p.lng] as [number, number]);
              
              const polyline = Leaflet.polyline(positions, {
                color,
                weight: 5,
                opacity: 0.7,
              }).addTo(map);

              polyline.bindPopup(`<b>${route.name}</b>`);
              layersRef.current.push(polyline);
            }
          });

          // Ajuster la vue pour voir tous les itinéraires
          if (destinationLocation) {
            const allPoints = [
              [userLocation.lat, userLocation.lng],
              [destinationLocation.lat, destinationLocation.lng],
              ...(routes.flatMap(r => r.polyline?.map(p => [p.lat, p.lng]) || []) as [number, number][])
            ];
            if (allPoints.length > 2) {
              const bounds = Leaflet.latLngBounds(allPoints);
              map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
            }
          }
        } else if (!destinationLocation) {
          // Centrer sur la position utilisateur
          map.setView([userLocation.lat, userLocation.lng], 13);
        }

        // Charger les incidents initiaux
        setTimeout(() => {
          fetchTrafficIncidents();
        }, 500);

        // Rafraîchissement périodique (60 secondes)
        refreshIntervalRef.current = setInterval(() => {
          fetchTrafficIncidents();
        }, 60000);
      } catch (err) {
        console.error("[TraficRoutierMap] Erreur:", err);
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
      }
      
      if (mapRef.current) {
        try {
          layersRef.current.forEach(layer => {
            try {
              mapRef.current.removeLayer(layer);
            } catch (e) {}
          });
          incidentsLayersRef.current.forEach(layer => {
            try {
              mapRef.current.removeLayer(layer);
            } catch (e) {}
          });
          layersRef.current = [];
          incidentsLayersRef.current = [];
          mapRef.current.remove();
          mapRef.current = null;
        } catch (e) {
          console.warn("[TraficRoutierMap] Erreur cleanup:", e);
        }
      }
    };
  }, []); // Initialisation unique

  // Mettre à jour les layers quand les données changent
  useEffect(() => {
    if (!mapRef.current || !LRef.current) return;

    const map = mapRef.current;
    const L = LRef.current;

    // Supprimer les anciens layers (sauf incidents)
    layersRef.current.forEach(layer => {
      try {
        map.removeLayer(layer);
      } catch (e) {}
    });
    layersRef.current = [];

    // Ajouter marqueur position utilisateur
    const userIcon = L.divIcon({
      className: "custom-user-marker",
      html: `<div style="background-color: #3b82f6; width: 32px; height: 32px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-center;">
        <span style="color: white; font-size: 14px; font-weight: bold;">📍</span>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup("<b>Votre position</b>");
    layersRef.current.push(userMarker);

    // Ajouter marqueur destination si disponible
    if (destinationLocation) {
      const destIcon = L.divIcon({
        className: "custom-dest-marker",
        html: `<div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-center;">
          <span style="color: white; font-size: 14px; font-weight: bold;">🎯</span>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const destMarker = L.marker([destinationLocation.lat, destinationLocation.lng], { icon: destIcon })
        .addTo(map)
        .bindPopup("<b>Destination</b>");
      layersRef.current.push(destMarker);
    }

    // Afficher les itinéraires
    if (routes && routes.length > 0) {
      routes.forEach((route, index) => {
        if (route.polyline && route.polyline.length > 1) {
          const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];
          const color = colors[index % colors.length];
          const positions = route.polyline.map(p => [p.lat, p.lng] as [number, number]);
          
          const polyline = L.polyline(positions, {
            color,
            weight: 5,
            opacity: 0.7,
          }).addTo(map);

          polyline.bindPopup(`<b>${route.name}</b>`);
          layersRef.current.push(polyline);
        }
      });
    }

    // Ajuster la vue
    if (destinationLocation && routes && routes.length > 0) {
      const allPoints = [
        [userLocation.lat, userLocation.lng],
        [destinationLocation.lat, destinationLocation.lng],
        ...(routes.flatMap(r => r.polyline?.map(p => [p.lat, p.lng]) || []) as [number, number][])
      ];
      if (allPoints.length > 2) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    } else if (destinationLocation) {
      const bounds = L.latLngBounds(
        [[userLocation.lat, userLocation.lng], [destinationLocation.lat, destinationLocation.lng]]
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else {
      map.setView([userLocation.lat, userLocation.lng], 13);
    }
  }, [userLocation.lat, userLocation.lng, destinationLocation?.lat, destinationLocation?.lng, routes]);

  return (
    <div className="relative">
      <div
        ref={mapContainerRef}
        className="h-[500px] w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800"
      />
      {isLoadingIncidents && (
        <div className="absolute top-2 right-2 bg-white/90 dark:bg-zinc-900/90 px-3 py-1 rounded-md text-xs text-zinc-600 dark:text-zinc-400">
          Mise à jour incidents...
        </div>
      )}
    </div>
  );
}
