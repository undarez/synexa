"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Cloud, Droplets, Wind, Thermometer, Sun, CloudRain, Snowflake, SunDim } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/app/lib/utils";

export function WeatherWidget() {
  const { data: session } = useSession();
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ne pas attendre la session, charger immédiatement
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      // Timeout de sécurité pour éviter un chargement infini
      timeoutId = setTimeout(() => {
        console.warn("Timeout géolocalisation, utilisation de Paris par défaut");
        fetchWeatherData(48.8566, 2.3522);
      }, 8000);

      // Récupérer la position depuis le profil ou géolocalisation
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

      // Utiliser géolocalisation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (timeoutId) clearTimeout(timeoutId);
            fetchWeatherData(position.coords.latitude, position.coords.longitude);
          },
          () => {
            if (timeoutId) clearTimeout(timeoutId);
            // Fallback Paris
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
      
      // L'API retourne { success: true, weather: {...} }
      if (data.success && data.weather) {
        setWeather(data.weather);
      } else if (data.weather) {
        // Format alternatif
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

  // Fonction pour obtenir l'icône météo selon la description
  const getWeatherIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes("soleil") || desc.includes("sun") || desc.includes("clear")) {
      return <Sun className="h-8 w-8 text-yellow-500 animate-pulse" />;
    } else if (desc.includes("pluie") || desc.includes("rain")) {
      return <CloudRain className="h-8 w-8 text-blue-500 animate-bounce" />;
    } else if (desc.includes("neige") || desc.includes("snow")) {
      return <Snowflake className="h-8 w-8 text-blue-300 animate-pulse" />;
    } else if (desc.includes("nuage") || desc.includes("cloud")) {
      return <Cloud className="h-8 w-8 text-gray-400 animate-pulse" />;
    }
    return <SunDim className="h-8 w-8 text-yellow-400" />;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 animate-pulse" />
            <div>
              <h3 className="font-semibold text-lg">Météo</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Chargement...</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
        </div>
      </div>
    );
  }

  if (!weather || !weather.current) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cloud className="h-10 w-10 text-[hsl(var(--muted-foreground))]" />
            <div>
              <h3 className="font-semibold text-lg">Météo</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Données indisponibles</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Gérer le cas où temperature peut être un objet {min, max} ou un nombre
  const temp = typeof weather.current.temperature === "object" 
    ? (weather.current.temperature as any)?.max || (weather.current.temperature as any)?.min || 0
    : weather.current.temperature || 0;
  const tempColor = temp >= 25 ? "text-red-500" : temp >= 15 ? "text-orange-500" : "text-blue-500";

  return (
    <div className="space-y-4">
      {/* En-tête avec icône animée */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            {getWeatherIcon(weather.current.description || "")}
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-[hsl(var(--foreground))]">Météo</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] capitalize">
              {weather.current.description || "Conditions actuelles"}
            </p>
          </div>
        </div>
      </div>

      {/* Température principale avec animation */}
      <div className="relative">
        <div className={cn("text-5xl font-bold transition-all duration-500", tempColor)}>
          {temp}°C
        </div>
        <div className="absolute top-0 right-0 text-sm text-[hsl(var(--muted-foreground))]">
          {weather.location?.lat ? `${weather.location.lat.toFixed(2)}°` : ""}
        </div>
      </div>

      {/* Détails avec animations */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[hsl(var(--border))]">
        <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 hover:scale-105 transition-transform duration-200">
          <Droplets className="h-5 w-5 text-blue-500 animate-pulse" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Humidité</span>
          <span className="font-bold text-sm">{weather.current.humidity}%</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-950/20 dark:to-gray-900/10 hover:scale-105 transition-transform duration-200">
          <Wind className="h-5 w-5 text-gray-500 animate-spin" style={{ animationDuration: "3s" }} />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Vent</span>
          <span className="font-bold text-sm">{weather.current.windSpeed} km/h</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 hover:scale-105 transition-transform duration-200">
          <Thermometer className="h-5 w-5 text-purple-500" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Ressenti</span>
          <span className="font-bold text-sm">{weather.current.feelsLike || temp}°C</span>
        </div>
      </div>

      {/* Prévisions si disponibles */}
      {weather.forecast && weather.forecast.length > 0 && (
        <div className="pt-4 border-t border-[hsl(var(--border))]">
          <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-2">Prévisions</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {weather.forecast.slice(0, 3).map((forecast: any, index: number) => (
              <div
                key={index}
                className="flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg bg-gradient-to-br from-white/50 to-purple-50/30 dark:from-zinc-800/50 dark:to-purple-950/20 min-w-[60px] hover:scale-110 transition-transform duration-200"
              >
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {forecast.time || `J+${index + 1}`}
                </span>
                <span className="text-sm font-bold">
                  {typeof forecast.temperature === "object"
                    ? `${(forecast.temperature as any)?.min || ""}°/${(forecast.temperature as any)?.max || ""}°`
                    : `${forecast.temperature || 0}°C`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



