"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Cloud, Droplets, Wind, Thermometer } from "lucide-react";
import { useSession } from "next-auth/react";

export function WeatherWidget() {
  const { data: session } = useSession();
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchWeather();
    }
  }, [session]);

  const fetchWeather = async () => {
    try {
      // Récupérer la position depuis le profil ou géolocalisation
      const response = await fetch("/api/profile");
      const data = await response.json();
      
      let lat = data.profile?.workLat;
      let lng = data.profile?.workLng;

      if (!lat || !lng) {
        // Utiliser géolocalisation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              fetchWeatherData(position.coords.latitude, position.coords.longitude);
            },
            () => {
              // Fallback Paris
              fetchWeatherData(48.8566, 2.3522);
            }
          );
        } else {
          fetchWeatherData(48.8566, 2.3522);
        }
      } else {
        fetchWeatherData(lat, lng);
      }
    } catch (error) {
      console.error("Erreur:", error);
      setLoading(false);
    }
  };

  const fetchWeatherData = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
      const data = await response.json();
      setWeather(data);
    } catch (error) {
      console.error("Erreur météo:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Météo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  if (!weather || !weather.current) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Météo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-sm text-[hsl(var(--muted-foreground))]">
            Aucune donnée météo disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Météo
        </CardTitle>
        <CardDescription>
          {weather.current.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-red-500" />
              <span className="text-sm">Température</span>
            </div>
            <span className="font-bold text-lg">{weather.current.temperature}°C</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Humidité</span>
            </div>
            <span className="font-semibold">{weather.current.humidity}%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Vent</span>
            </div>
            <span className="font-semibold">{weather.current.windSpeed} km/h</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

