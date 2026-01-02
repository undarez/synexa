"use client";

import { useState, useEffect } from "react";
import { Cloud, Droplets, Wind, Thermometer, Sun, CloudRain, Snowflake, SunDim } from "lucide-react";
import { cn } from "@/app/lib/utils";

export function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      timeoutId = setTimeout(() => {
        fetchWeatherData(48.8566, 2.3522);
      }, 8000);

      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = await response.json();
          let lat = data.profile?.workLat;
          let lng = data.profile?.workLng;

          if (lat && lng) {
            if (timeoutId) clearTimeout(timeoutId);
            fetchWeatherData(lat, lng);
            return;
          }
        }
      } catch (profileError) {
        console.warn("Impossible de récupérer le profil:", profileError);
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (timeoutId) clearTimeout(timeoutId);
            fetchWeatherData(position.coords.latitude, position.coords.longitude);
          },
          () => {
            if (timeoutId) clearTimeout(timeoutId);
            fetchWeatherData(48.8566, 2.3522);
          },
          { timeout: 5000, maximumAge: 60000 }
        );
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        fetchWeatherData(48.8566, 2.3522);
      }
    } catch (error) {
      console.error("Erreur:", error);
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const fetchWeatherData = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lng}`);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.success && data.weather) {
        setWeather(data.weather);
      } else if (data.weather) {
        setWeather(data.weather);
      } else {
        throw new Error("Format de données invalide");
      }
    } catch (error) {
      console.error("Erreur météo:", error);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">🌤️ Météo</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
        </div>
      </div>
    );
  }

  if (!weather || !weather.current) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">🌤️ Météo</h3>
        <p className="text-sm text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
          Données indisponibles
        </p>
      </div>
    );
  }

  const temp = typeof weather.current.temperature === "object" 
    ? (weather.current.temperature as any)?.max || (weather.current.temperature as any)?.min || 0
    : weather.current.temperature || 0;
  
  // Couleur selon la température (info pour normal, warning pour froid/chaud)
  const tempColor = temp >= 25 ? "text-[hsl(var(--warning))]" : temp <= 5 ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--info))]";

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">🌤️ Météo</h3>

      {/* Température principale */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <span className="text-sm text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] mb-1">
            Température
          </span>
          <span className={cn("text-3xl font-bold", tempColor)}>
            {temp}°C
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] mb-1">
            Ressenti
          </span>
          <span className={cn("text-3xl font-bold", tempColor)}>
            {weather.current.feelsLike || temp}°C
          </span>
        </div>
      </div>

      {/* Détails avec badges */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <span className="bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] rounded-lg px-3 py-1.5 text-center font-medium">
          Humidité {weather.current.humidity}%
        </span>
        <span className="bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] rounded-lg px-3 py-1.5 text-center font-medium">
          Vent {weather.current.windSpeed} km/h
        </span>
        <span className={cn(
          "rounded-lg px-3 py-1.5 text-center font-medium",
          temp <= 5 ? "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" : "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]"
        )}>
          {temp <= 5 ? "Froid" : "Normal"}
        </span>
      </div>
    </div>
  );
}
