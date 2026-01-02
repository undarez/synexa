"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Loader2, Cloud, Droplets, Wind, Thermometer, Sun, CloudRain, CloudSnow, MapPin, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";

// Charger WeatherMapEnhanced uniquement côté client
const WeatherMapEnhanced = dynamic(() => import("@/app/components/WeatherMapEnhanced").then(mod => ({ default: mod.WeatherMapEnhanced })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
    </div>
  ),
});

interface WeatherData {
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    description: string;
    icon?: string;
  };
  forecast: Array<{
    date: string;
    temperature: {
      min: number;
      max: number;
    };
    description: string;
    icon?: string;
  }>;
  location?: {
    name?: string;
    lat: number;
    lon: number;
  };
}

export default function WeatherPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/?error=auth_required&redirect=/weather");
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchUserLocation();
    }
  }, [status]);

  useEffect(() => {
    if (userLocation) {
      fetchWeather();
      // Actualiser toutes les 5 minutes
      const interval = setInterval(fetchWeather, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [userLocation]);

  const fetchUserLocation = async () => {
    try {
      // Essayer de récupérer la position depuis le profil
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        if (data.profile?.workLat && data.profile?.workLng) {
          setUserLocation({
            lat: data.profile.workLat,
            lng: data.profile.workLng,
          });
          return;
        }
        // Essayer aussi homeAddress si disponible
        if (data.profile?.homeAddress) {
          // On pourrait géocoder l'adresse, mais pour l'instant on utilise une position par défaut
        }
      }

      // Sinon, utiliser la géolocalisation du navigateur
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            // Si la géolocalisation est refusée, utiliser une position par défaut (Paris)
            // L'utilisateur pourra toujours changer manuellement
            // Gérer l'erreur silencieusement sans polluer la console
            setUserLocation({
              lat: 48.8566, // Paris par défaut
              lng: 2.3522,
            });
            setError("Géolocalisation refusée. Affichage de la météo pour Paris. Vous pouvez autoriser la géolocalisation dans les paramètres de votre navigateur.");
            setLoading(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        // Si la géolocalisation n'est pas supportée, utiliser Paris par défaut
        setUserLocation({
          lat: 48.8566,
          lng: 2.3522,
        });
        setError("La géolocalisation n'est pas supportée. Affichage de la météo pour Paris.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Erreur récupération position:", err);
      // En cas d'erreur, utiliser Paris par défaut
      setUserLocation({
        lat: 48.8566,
        lng: 2.3522,
      });
      setError("Erreur lors de la récupération de votre position. Affichage de la météo pour Paris.");
      setLoading(false);
    }
  };

  const fetchWeather = async () => {
    if (!userLocation) {
      console.warn("Pas de position disponible pour récupérer la météo");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("Récupération météo pour:", userLocation);

      const response = await fetch(
        `/api/weather?lat=${userLocation.lat}&lon=${userLocation.lng}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de la récupération de la météo");
      }

      const data = await response.json();
      console.log("Données météo reçues:", data);
      
      // Vérifier que les données sont bien présentes
      if (!data.weather || !data.weather.current) {
        console.error("Données météo invalides:", data);
        throw new Error("Données météo invalides");
      }

      // Adapter les données au format attendu
      const weatherData: WeatherData = {
        current: {
          temperature: data.weather.current.temperature || 0,
          humidity: data.weather.current.humidity || 0,
          windSpeed: data.weather.current.windSpeed || 0,
          description: data.weather.current.description || "Données non disponibles",
          icon: data.weather.current.icon,
        },
        forecast: (data.weather.forecast || []).map((f: any) => ({
          date: f.date,
          temperature: typeof f.temperature === 'object' ? f.temperature : { min: f.temperature - 2, max: f.temperature + 2 },
          description: f.description || "Données non disponibles",
          icon: f.icon,
        })),
        location: {
          name: userLocation.lat === 48.8566 && userLocation.lng === 2.3522 ? "Paris (par défaut)" : "Votre position",
          lat: userLocation.lat,
          lon: userLocation.lng,
        },
      };
      console.log("Données météo formatées:", weatherData);
      setWeather(weatherData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Erreur fetchWeather:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue lors de la récupération de la météo");
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (description: string, temp: number) => {
    const desc = description.toLowerCase();
    if (desc.includes("pluie") || desc.includes("rain")) return CloudRain;
    if (desc.includes("neige") || desc.includes("snow")) return CloudSnow;
    if (desc.includes("nuage") || desc.includes("cloud")) return Cloud;
    if (temp >= 25) return Sun;
    return Cloud;
  };

  const getWeatherColor = (temp: number) => {
    if (temp >= 30) return "text-red-500";
    if (temp >= 25) return "text-orange-500";
    if (temp >= 15) return "text-yellow-500";
    if (temp >= 5) return "text-blue-500";
    return "text-cyan-500";
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">
              Météo en temps réel
            </h1>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">
              Consultez les conditions météorologiques actuelles et les prévisions
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchWeather}
            disabled={loading || !userLocation}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {weather && (
          <>
            {/* Carte météo interactive avec animations */}
            {userLocation && (
              <div className="mb-6">
                <WeatherMapEnhanced
                  latitude={userLocation.lat}
                  longitude={userLocation.lng}
                  weather={weather ? {
                    current: weather.current,
                    forecast: weather.forecast,
                  } : undefined}
                />
              </div>
            )}

            {/* Conditions actuelles */}
            <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Température</CardTitle>
                  <Thermometer className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    <span className={getWeatherColor(weather.current.temperature)}>
                      {Math.round(weather.current.temperature)}°C
                    </span>
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    {weather.current.description}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Humidité</CardTitle>
                  <Droplets className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-[hsl(var(--foreground))]">
                    {weather.current.humidity}%
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    Taux d'humidité
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-500/10 to-slate-500/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vent</CardTitle>
                  <Wind className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-[hsl(var(--foreground))]">
                    {Math.round(weather.current.windSpeed)} km/h
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    Vitesse du vent
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Localisation</CardTitle>
                  <MapPin className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {weather.location?.name || "Votre position"}
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    {weather.location?.lat.toFixed(4) || userLocation?.lat.toFixed(4)}, {weather.location?.lon.toFixed(4) || userLocation?.lng.toFixed(4)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Prévisions */}
            <Card>
              <CardHeader>
                <CardTitle>Prévisions sur 5 jours</CardTitle>
                <CardDescription>
                  {lastUpdate && `Dernière mise à jour : ${lastUpdate.toLocaleTimeString("fr-FR")}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-5">
                  {weather.forecast.map((day, index) => {
                    const Icon = getWeatherIcon(day.description, day.temperature);
                    const date = new Date(day.date);
                    const isToday = index === 0;

                    return (
                      <div
                        key={index}
                        className={`rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-all hover:shadow-lg ${
                          isToday ? "ring-2 ring-[hsl(var(--primary))]" : ""
                        }`}
                      >
                        <div className="text-center">
                          <p className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">
                            {isToday
                              ? "Aujourd'hui"
                              : date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}
                          </p>
                          <div className="mb-3 flex justify-center">
                            <Icon className={`h-12 w-12 ${getWeatherColor(day.temperature)}`} />
                          </div>
                          <p className="text-2xl font-bold text-[hsl(var(--foreground))] mb-1">
                            <span className={getWeatherColor(day.temperature.max || day.temperature)}>
                              {Math.round(day.temperature.max || day.temperature)}°
                            </span>
                            {day.temperature.min && (
                              <span className={`text-sm ml-1 ${getWeatherColor(day.temperature.min)}`}>
                                / {Math.round(day.temperature.min)}°
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {day.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

