"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { MapPin } from "lucide-react";

interface TrafficIncident {
  id: string;
  type: string;
  severity: "low" | "medium" | "high";
  lat: number;
  lng: number;
  description: string;
  delay?: number;
  distance?: number;
}

interface TrafficRoute {
  name: string;
  duration: string;
  distance: string;
  polyline?: Array<{ lat: number; lng: number }>;
}

interface TrafficMapProps {
  userLocation: { lat: number; lng: number };
  destinationLocation?: { lat: number; lng: number } | null;
  routes?: TrafficRoute[];
  incidents?: TrafficIncident[];
}

function MapCenter({
  lat,
  lng,
  useMapHook,
}: {
  lat: number;
  lng: number;
  useMapHook: any;
}) {
  const map = useMapHook();
  useEffect(() => {
    if (map) {
      map.setView([lat, lng], 13);
    }
  }, [map, lat, lng]);
  return null;
}

export function TrafficMap({
  userLocation,
  destinationLocation,
  routes = [],
  incidents = [],
}: TrafficMapProps) {
  const [leafletComponents, setLeafletComponents] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Charger Leaflet uniquement côté client
    if (typeof window === "undefined") {
      return;
    }

    Promise.all([import("react-leaflet"), import("leaflet")])
      .then(([reactLeaflet, L]) => {
        // Corriger les icônes par défaut de Leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        setLeafletComponents({
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Marker: reactLeaflet.Marker,
          Popup: reactLeaflet.Popup,
          Polyline: reactLeaflet.Polyline,
          useMap: reactLeaflet.useMap,
          Icon: L.Icon,
        });
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Erreur lors du chargement de Leaflet:", error);
        setIsLoading(false);
      });
  }, []);

  // Créer l'icône de position utilisateur
  const createUserLocationIcon = (IconClass: any) => {
    return new IconClass({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="#3b82f6" stroke="white" stroke-width="3" opacity="0.8"/>
          <circle cx="20" cy="20" r="8" fill="white"/>
          <circle cx="20" cy="20" r="4" fill="#3b82f6"/>
        </svg>
      `)}`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });
  };

  // Créer l'icône de destination
  const createDestinationIcon = (IconClass: any) => {
    return new IconClass({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="#ef4444" stroke="white" stroke-width="3" opacity="0.8"/>
          <circle cx="20" cy="20" r="8" fill="white"/>
          <circle cx="20" cy="20" r="4" fill="#ef4444"/>
        </svg>
      `)}`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });
  };

  // Créer l'icône d'incident selon la sévérité
  const createIncidentIcon = (IconClass: any, severity: string, type: string) => {
    const severityColors = {
      high: { fill: "#ef4444", stroke: "#dc2626" },
      medium: { fill: "#f59e0b", stroke: "#d97706" },
      low: { fill: "#3b82f6", stroke: "#2563eb" },
    };

    const colors = severityColors[severity as keyof typeof severityColors] || severityColors.low;
    const iconEmoji = type.includes("Accident") ? "🚨" :
                     type.includes("Bouchon") ? "⚠️" :
                     type.includes("Travaux") ? "🚧" : "📢";

    // Utiliser encodeURIComponent au lieu de btoa pour supporter les emojis
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" opacity="0.9"/>
        <text x="24" y="32" font-size="24" text-anchor="middle">${iconEmoji}</text>
      </svg>
    `.trim();
    
    const encodedSvg = encodeURIComponent(svgString);

    return new IconClass({
      iconUrl: `data:image/svg+xml;charset=utf-8,${encodedSvg}`,
      iconSize: [48, 48],
      iconAnchor: [24, 48],
      popupAnchor: [0, -48],
    });
  };

  if (isLoading || !leafletComponents) {
    return (
      <div className="h-96 flex items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))] mx-auto mb-2"></div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Icon } = leafletComponents;

  const userLocationIcon = createUserLocationIcon(Icon);
  const destinationIcon = destinationLocation ? createDestinationIcon(Icon) : null;

  // Calculer les bounds pour ajuster la vue
  const allPoints: Array<[number, number]> = [[userLocation.lat, userLocation.lng]];
  if (destinationLocation) {
    allPoints.push([destinationLocation.lat, destinationLocation.lng]);
  }
  incidents.forEach((incident) => {
    allPoints.push([incident.lat, incident.lng]);
  });
  routes.forEach((route) => {
    route.polyline?.forEach((p) => {
      allPoints.push([p.lat, p.lng]);
    });
  });

  // Calculer le centre et les bounds
  const centerLat = allPoints.reduce((sum, [lat]) => sum + lat, 0) / allPoints.length;
  const centerLng = allPoints.reduce((sum, [, lng]) => sum + lng, 0) / allPoints.length;

  const MapCenterComponent = () => {
    const map = useMap();
    useEffect(() => {
      if (map && allPoints.length > 0) {
        const bounds = allPoints.map(([lat, lng]) => [lat, lng] as [number, number]);
        if (bounds.length > 1) {
          map.fitBounds(bounds as any, { padding: [50, 50] });
        } else {
          map.setView([centerLat, centerLng], 13);
        }
      }
    }, [map, centerLat, centerLng]);
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Carte du trafic
        </CardTitle>
        <CardDescription>
          Position: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
          <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterComponent />

            {/* Marqueur position utilisateur */}
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    Votre position
                  </h3>
                  <p className="text-xs text-gray-600">
                    {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>

            {/* Marqueur destination */}
            {destinationLocation && destinationIcon && (
              <Marker position={[destinationLocation.lat, destinationLocation.lng]} icon={destinationIcon}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-500" />
                      Destination
                    </h3>
                    <p className="text-xs text-gray-600">
                      {destinationLocation.lat.toFixed(4)}, {destinationLocation.lng.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Marqueurs incidents */}
            {incidents.map((incident) => {
              const incidentIcon = createIncidentIcon(Icon, incident.severity, incident.type);
              return (
                <Marker
                  key={incident.id}
                  position={[incident.lat, incident.lng]}
                  icon={incidentIcon}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-sm mb-1">
                        {incident.type}
                      </h3>
                      <p className="text-xs text-gray-600 mb-2">{incident.description}</p>
                      {incident.delay && (
                        <p className="text-xs text-gray-500">
                          Délai: ~{incident.delay} min
                        </p>
                      )}
                      {incident.distance && (
                        <p className="text-xs text-gray-500">
                          Distance: {incident.distance.toFixed(1)} km
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Itinéraires */}
            {routes.map((route, index) => {
              if (!route.polyline || route.polyline.length === 0) return null;
              
              const routeColors = ["#3b82f6", "#10b981", "#f59e0b"];
              const color = routeColors[index % routeColors.length];
              const positions = route.polyline.map((p) => [p.lat, p.lng] as [number, number]);

              return (
                <Polyline
                  key={`route-${index}`}
                  positions={positions}
                  pathOptions={{
                    color,
                    weight: 5,
                    opacity: 0.7,
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-sm mb-1">{route.name}</h3>
                      <p className="text-xs text-gray-600">{route.duration}</p>
                      <p className="text-xs text-gray-600">{route.distance}</p>
                    </div>
                  </Popup>
                </Polyline>
              );
            })}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
