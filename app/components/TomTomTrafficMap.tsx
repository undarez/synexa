"use client";

import { useEffect, useRef, useState } from "react";

interface TomTomTrafficMapProps {
  userLocation: { lat: number; lng: number };
  destinationLocation?: { lat: number; lng: number } | null;
  routes?: Array<{
    name: string;
    duration: string;
    distance: string;
    traffic: string;
    status: string;
    details: string;
    polyline?: Array<{ lat: number; lng: number }>;
  }>;
  incidents?: Array<{
    type: string;
    lat: number;
    lng: number;
    description: string;
    delay?: number;
  }>;
  trafficFlow?: Array<{
    lat: number;
    lng: number;
    speed: number;
    freeFlowSpeed: number;
  }>;
}

export function TomTomTrafficMap({
  userLocation,
  destinationLocation,
  routes = [],
  incidents = [],
  trafficFlow = [],
}: TomTomTrafficMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapRef.current) return;

    // Charger TomTom Maps SDK dynamiquement
    const loadTomTomMap = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Charger le script TomTom Maps SDK
        if (!(window as any).tt) {
          const script = document.createElement("script");
          script.src = "https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js";
          script.async = true;
          document.head.appendChild(script);

          await new Promise((resolve) => {
            script.onload = resolve;
          });

          // Charger le CSS
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css";
          document.head.appendChild(link);
        }

        const tt = (window as any).tt;
        const apiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || "";

        if (!apiKey) {
          console.warn("[TomTom Map] NEXT_PUBLIC_TOMTOM_API_KEY non configurée");
          console.warn("[TomTom Map] Ajoutez NEXT_PUBLIC_TOMTOM_API_KEY dans votre .env et redémarrez le serveur");
          // Afficher un message d'erreur dans la carte
          if (mapRef.current) {
            mapRef.current.innerHTML = `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; text-align: center; background: #f3f4f6; color: #6b7280;">
                <p style="font-weight: 500; margin-bottom: 8px;">⚠️ Clé API TomTom non configurée</p>
                <p style="font-size: 12px; margin: 0;">Ajoutez NEXT_PUBLIC_TOMTOM_API_KEY dans votre .env</p>
                <p style="font-size: 12px; margin-top: 4px;">Voir docs/tomtom-env-setup.md</p>
              </div>
            `;
          }
          return;
        }

        // Créer la carte avec une URL de style complète
        // Utiliser l'URL de style officielle TomTom
        const map = tt.map({
          key: apiKey,
          container: mapRef.current,
          center: [userLocation.lng, userLocation.lat],
          zoom: 13,
          style: `https://api.tomtom.com/style/1/style/23.0.0-0/basic_main-light@2.json?key=${apiKey}`,
        });

        // Ajouter les contrôles de navigation
        map.addControl(new tt.NavigationControl());

        // Marqueur position utilisateur
        const userMarker = new tt.Marker()
          .setLngLat([userLocation.lng, userLocation.lat])
          .setPopup(new tt.Popup().setHTML(`
            <div style="padding: 8px;">
              <p style="font-weight: 500; font-size: 14px; margin: 0;">📍 Votre position</p>
              <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">
                ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}
              </p>
            </div>
          `))
          .addTo(map);

        // Marqueur destination si disponible
        if (destinationLocation) {
          const destMarker = new tt.Marker({ color: "#ef4444" })
            .setLngLat([destinationLocation.lng, destinationLocation.lat])
            .setPopup(new tt.Popup().setHTML(`
              <div style="padding: 8px;">
                <p style="font-weight: 500; font-size: 14px; margin: 0;">🎯 Destination</p>
                <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">
                  ${destinationLocation.lat.toFixed(4)}, ${destinationLocation.lng.toFixed(4)}
                </p>
              </div>
            `))
            .addTo(map);
        }

        // Attendre que la carte soit chargée
        map.on("load", () => {
          console.log("[TomTom Map] Carte chargée avec succès");
          
          // Ajouter les itinéraires
          const routeColors = ["#3b82f6", "#10b981", "#f59e0b"];
          routes.forEach((route, idx) => {
            if (!route.polyline || route.polyline.length === 0) return;

            const coordinates = route.polyline.map((p) => [p.lng, p.lat] as [number, number]);
            const color = routeColors[idx % routeColors.length];

            try {
              map.addLayer({
                id: `route-${idx}`,
                type: "line",
                source: {
                  type: "geojson",
                  data: {
                    type: "Feature",
                    properties: {
                      name: route.name,
                      duration: route.duration,
                      distance: route.distance,
                      traffic: route.traffic,
                    },
                    geometry: {
                      type: "LineString",
                      coordinates,
                    },
                  },
                },
                layout: {
                  "line-join": "round",
                  "line-cap": "round",
                },
                paint: {
                  "line-color": color,
                  "line-width": 4,
                  "line-opacity": 0.7,
                },
              });

              // Ajouter un popup au clic sur l'itinéraire
              map.on("click", `route-${idx}`, (e: any) => {
                const props = e.features[0].properties;
                new tt.Popup()
                  .setLngLat(e.lngLat)
                  .setHTML(`
                    <div style="padding: 8px;">
                      <p style="font-weight: 500; font-size: 14px; margin: 0;">${props.name}</p>
                      <p style="font-size: 12px; margin: 4px 0;">${props.duration} • ${props.distance}</p>
                      <p style="font-size: 12px; color: #6b7280; margin: 0;">${props.traffic}</p>
                    </div>
                  `)
                  .addTo(map);
              });
            } catch (err) {
              console.error(`[TomTom Map] Erreur lors de l'ajout de la route ${idx}:`, err);
            }
          });

          // Marquer la carte comme chargée
          setMapInstance(map);
          setIsLoading(false);
        });

        // Gérer les erreurs de chargement
        map.on("error", (e: any) => {
          console.error("[TomTom Map] Erreur de la carte:", e);
          setIsLoading(false);
          setError("Erreur lors du chargement de la carte TomTom");
        });

        // Timeout de sécurité pour éviter le chargement infini
        const timeout = setTimeout(() => {
          if (isLoading) {
            console.warn("[TomTom Map] Timeout de chargement - la carte prend trop de temps");
            setIsLoading(false);
          }
        }, 10000); // 10 secondes

        // Ajouter les incidents de trafic
        incidents.forEach((incident) => {
          const incidentMarker = new tt.Marker({ color: "#ef4444", scale: 0.8 })
            .setLngLat([incident.lng, incident.lat])
            .setPopup(new tt.Popup().setHTML(`
              <div style="padding: 8px;">
                <p style="font-weight: 500; font-size: 14px; margin: 0;">⚠️ ${incident.type}</p>
                <p style="font-size: 12px; margin: 4px 0;">${incident.description}</p>
                ${incident.delay ? `<p style="font-size: 12px; color: #6b7280; margin: 0;">Délai: ${incident.delay} min</p>` : ""}
              </div>
            `))
            .addTo(map);
        });

        // Nettoyer le timeout au démontage
        return () => {
          clearTimeout(timeout);
          if (map) {
            map.remove();
          }
        };
      } catch (error) {
        console.error("[TomTom Map] Erreur lors du chargement:", error);
        setIsLoading(false);
        let errorMessage = "Erreur inconnue";
        try {
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === "string") {
            errorMessage = error;
          } else if (error && typeof error === "object") {
            errorMessage = JSON.stringify(error, null, 2);
          }
        } catch (e) {
          errorMessage = "Erreur lors de la sérialisation de l'erreur";
        }
        setError(errorMessage);
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; text-align: center; background: #fee2e2; color: #991b1b;">
              <p style="font-weight: 500; margin-bottom: 8px;">❌ Erreur de chargement de la carte</p>
              <p style="font-size: 12px; margin: 0; word-break: break-word;">${errorMessage}</p>
              <p style="font-size: 12px; margin-top: 4px;">Vérifiez NEXT_PUBLIC_TOMTOM_API_KEY dans .env</p>
            </div>
          `;
        }
      }
    };

    loadTomTomMap();
  }, [mounted, userLocation, destinationLocation, routes, incidents]);

  if (!mounted || isLoading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))] mx-auto mb-2"></div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Chargement de la carte TomTom...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20 h-96 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-red-800 dark:text-red-400 mb-2">❌ Erreur de chargement</p>
          <p className="text-xs text-red-600 dark:text-red-500 mb-2 break-words">{error}</p>
          <p className="text-xs text-red-600 dark:text-red-500">Vérifiez NEXT_PUBLIC_TOMTOM_API_KEY dans .env</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
      <div ref={mapRef} className="w-full h-96" />
    </div>
  );
}

