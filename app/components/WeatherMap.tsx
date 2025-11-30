"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Loader2, MapPin, Thermometer, Droplets, Wind } from "lucide-react";
import type { WeatherForecast } from "@/app/lib/services/weather";

interface WeatherMapProps {
  latitude: number;
  longitude: number;
  weather?: WeatherForecast;
  className?: string;
}

// Composant pour centrer la carte
function MapCenter({ lat, lng, useMapHook }: { lat: number; lng: number; useMapHook: any }) {
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

    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]).then(([reactLeaflet, L]) => {
      // Corriger les icônes par défaut de Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
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
    }).catch((error) => {
      console.error("Erreur lors du chargement de Leaflet:", error);
      setIsLoading(false);
    });
  }, []);

  // Créer l'icône météo
  const createWeatherIcon = (temp: number, IconClass: any) => {
    let color = "#3b82f6";
    if (temp >= 25) color = "#ef4444";
    else if (temp >= 15) color = "#f59e0b";
    else if (temp >= 5) color = "#3b82f6";
    else color = "#60a5fa";

    return new IconClass({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2"/>
          <text x="16" y="21" font-family="Arial" font-size="12" font-weight="bold" fill="white" text-anchor="middle">${Math.round(temp)}°</text>
        </svg>
      `)}`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
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

  const { MapContainer, TileLayer, Marker, Popup, useMap, Icon } = leafletComponents;
  const currentTemp = weather?.current.temperature || 0;
  const icon = createWeatherIcon(currentTemp, Icon);

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
            <Marker position={[latitude, longitude]} icon={icon}>
              <Popup>
                <div className="p-2">
                  {weather ? (
                    <>
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
                    </>
                  ) : (
                    <p>Chargement des données météo...</p>
                  )}
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        {weather && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
              <Thermometer className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-xs text-zinc-500">Température</p>
                <p className="font-bold">{weather.current.temperature}°C</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
              <Droplets className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-zinc-500">Humidité</p>
                <p className="font-bold">{weather.current.humidity}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
              <Wind className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-xs text-zinc-500">Vent</p>
                <p className="font-bold">{weather.current.windSpeed} km/h</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
