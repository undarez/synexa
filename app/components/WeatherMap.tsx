"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Loader2, MapPin, Thermometer, Droplets, Wind } from "lucide-react";
import type { WeatherForecast } from "@/app/lib/services/weather";

interface WeatherMapProps {
  latitude: number;
  longitude: number;
  weather?: WeatherForecast;
  className?: string;
}

// Composant pour centrer la carte
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
      map.setView([lat, lng], 10);
    }
  }, [map, lat, lng]);
  return null;
}

export function WeatherMap({
  latitude,
  longitude,
  weather,
  className = "",
}: WeatherMapProps) {
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

  // Créer l'icône de position utilisateur (marqueur bleu avec point)
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

  // Créer l'icône météo (marqueur avec température)
  const createWeatherIcon = (temp: number, IconClass: any) => {
    let color = "#3b82f6";
    if (temp >= 25) color = "#ef4444";
    else if (temp >= 15) color = "#f59e0b";
    else if (temp >= 5) color = "#3b82f6";
    else color = "#60a5fa";

    return new IconClass({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="${color}" stroke="white" stroke-width="2"/>
          <text x="18" y="23" font-family="Arial" font-size="11" font-weight="bold" fill="white" text-anchor="middle">${Math.round(
            temp
          )}°</text>
        </svg>
      `)}`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });
  };

  if (isLoading || !leafletComponents || typeof window === "undefined") {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </CardContent>
      </Card>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, useMap, Icon } =
    leafletComponents;

  // Créer les icônes uniquement si Icon est disponible
  const currentTemp = weather?.current?.temperature || 0;
  const weatherIcon =
    weather && Icon ? createWeatherIcon(currentTemp, Icon) : null;
  const userLocationIcon = Icon ? createUserLocationIcon(Icon) : null;

  // Composant interne pour centrer la carte
  const MapCenterComponent = () => {
    const map = useMap();
    useEffect(() => {
      if (map) {
        map.setView([latitude, longitude], 10);
      }
    }, [map, latitude, longitude]);
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Carte météo
        </CardTitle>
        <CardDescription>
          Position: {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
          <MapContainer
            center={[latitude, longitude]}
            zoom={10}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterComponent />

            {/* Marqueur de position utilisateur (toujours visible) */}
            {userLocationIcon && (
              <Marker position={[latitude, longitude]} icon={userLocationIcon}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      Votre position
                    </h3>
                    <p className="text-xs text-gray-600">
                      {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Marqueur météo (si les données sont disponibles) */}
            {weather && weatherIcon && (
              <Marker position={[latitude, longitude]} icon={weatherIcon}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-lg mb-2">
                      {weather.current.temperature}°C
                    </h3>
                    <p className="text-sm mb-2 capitalize">
                      {weather.current.description}
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-3 w-3" />
                        <span>Humidité: {weather.current.humidity}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wind className="h-3 w-3" />
                        <span>Vent: {weather.current.windSpeed} km/h</span>
                      </div>
                      {weather.forecast.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="font-semibold">Demain:</p>
                          <p>
                            {weather.forecast[0].temperature.min}° -{" "}
                            {weather.forecast[0].temperature.max}°C
                          </p>
                          <p className="capitalize">
                            {weather.forecast[0].description}
                          </p>
                        </div>
                      )}
                    </div>
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
