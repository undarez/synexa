"use client";

import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Loader2, MapPin } from "lucide-react";
import type { WeatherForecast } from "@/app/lib/services/weather";

interface WeatherMapEnhancedProps {
  latitude: number;
  longitude: number;
  weather?: WeatherForecast;
  className?: string;
}

export function WeatherMapEnhanced({
  latitude,
  longitude,
  weather,
  className = "",
}: WeatherMapEnhancedProps) {
  const [leafletComponents, setLeafletComponents] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    Promise.all([import("react-leaflet"), import("leaflet")])
      .then(([reactLeaflet, L]) => {
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

  const createUserLocationIcon = (IconClass: any) => {
    return new IconClass({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="#3b82f6" stroke="white" stroke-width="3" opacity="0.9"/>
          <circle cx="20" cy="20" r="8" fill="white"/>
          <circle cx="20" cy="20" r="4" fill="#3b82f6"/>
        </svg>
      `)}`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });
  };

  if (isLoading || !leafletComponents || typeof window === "undefined") {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
        </CardContent>
      </Card>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, useMap, Icon } = leafletComponents;
  const userLocationIcon = Icon ? createUserLocationIcon(Icon) : null;

  const MapCenterComponent = () => {
    const map = useMap();
    const hasCenteredRef = useRef(false);
    
    useEffect(() => {
      if (map && !hasCenteredRef.current) {
        mapInstanceRef.current = map;
        // Centrer sur la France uniquement au premier chargement
        map.setView([46.2, 2.2], 6);
        hasCenteredRef.current = true;
      }
    }, [map]);
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Carte météo interactive - France
            </CardTitle>
            <CardDescription>
              Visualisation de votre position sur la carte
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Carte */}
        <div className="relative h-[600px] w-full rounded-lg overflow-hidden border border-[hsl(var(--border))]">
          <MapContainer
            center={[46.2, 2.2]}
            zoom={6}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            zoomControl={true}
            dragging={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterComponent />

            {/* Marqueur de position */}
            {userLocationIcon && (
              <Marker position={[latitude, longitude]} icon={userLocationIcon}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      Votre position
                    </h3>
                    {weather && (
                      <>
                        <p className="text-sm font-semibold mb-1">
                          {weather.current.temperature}°C
                        </p>
                        <p className="text-xs text-gray-600 mb-1 capitalize">
                          {weather.current.description}
                        </p>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span>Vent: {weather.current.windSpeed} km/h</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Humidité: {weather.current.humidity}%</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
