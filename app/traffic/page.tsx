"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { TrafficMap } from "@/app/components/TrafficMap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Loader2, MapPin, Navigation as NavigationIcon, RefreshCw, AlertCircle, CheckCircle2, Clock, Route, ExternalLink } from "lucide-react";

interface TrafficRoute {
  name: string;
  duration: string;
  distance: string;
  traffic: string;
  status: "good" | "moderate" | "heavy" | "bad";
  details: string;
  polyline?: Array<{ lat: number; lng: number }>;
}

interface TrafficData {
  origin: string;
  destination: string;
  userLocation: { lat: number; lng: number } | null;
  destinationLocation: { lat: number; lng: number } | null;
  routes: TrafficRoute[];
  lastUpdate: string;
}

export default function TrafficPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [trafficData, setTrafficData] = useState<TrafficData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState("");
  const [customDestination, setCustomDestination] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/?error=auth_required&redirect=/traffic");
      return;
    }
  }, [status, router]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }

    setLocationLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(location);
        setLocationLoading(false);
        // Charger automatiquement le trafic et ouvrir Waze
        await fetchTraffic(location.lat, location.lng);
      },
      (err) => {
        setError(`Erreur de géolocalisation: ${err.message}`);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const fetchTraffic = async (lat?: number, lng?: number) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (lat && lng) {
        params.append("lat", lat.toString());
        params.append("lng", lng.toString());
      }
      if (customDestination || destination) {
        params.append("destination", customDestination || destination);
      }

      const response = await fetch(`/api/traffic?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des données de trafic");
      }

      const data = await response.json();
      setTrafficData(data);
      
      // Mettre à jour la position utilisateur si fournie
      if (data.userLocation) {
        setUserLocation(data.userLocation);
      }

      // Si on a des liens Waze, ouvrir automatiquement Waze
      if (data.wazeLinks?.route) {
        // Ouvrir Waze directement pour la navigation
        console.log("[Traffic] Ouverture de Waze:", data.wazeLinks.route);
        setTimeout(() => {
          const wazeWindow = window.open(data.wazeLinks.route, "_blank");
          if (!wazeWindow) {
            setError("Impossible d'ouvrir Waze. Vérifiez que les popups ne sont pas bloquées.");
          }
        }, 300);
      } else {
        console.warn("[Traffic] Pas de liens Waze dans la réponse:", data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!userLocation) {
      setError("Veuillez d'abord obtenir votre position actuelle");
      return;
    }
    fetchTraffic(userLocation.lat, userLocation.lng);
  };

  const openWaze = () => {
    if (!userLocation) {
      setError("Veuillez d'abord obtenir votre position actuelle");
      return;
    }
    
    // Si on a déjà des données de trafic avec des liens Waze, les utiliser
    if (trafficData?.wazeLinks) {
      window.open(trafficData.wazeLinks.route, "_blank");
      return;
    }
    
    // Sinon, récupérer les données de trafic d'abord (qui ouvrira Waze automatiquement)
    fetchTraffic(userLocation.lat, userLocation.lng);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600 dark:text-green-400";
      case "moderate":
        return "text-yellow-600 dark:text-yellow-400";
      case "heavy":
      case "bad":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-[hsl(var(--muted-foreground))]";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "moderate":
        return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case "heavy":
      case "bad":
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return null;
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">
            Informations Trafic
          </h1>
          <p className="mt-2 text-[hsl(var(--muted-foreground))]">
            Consultez le trafic en temps réel basé sur votre position actuelle avec Waze
          </p>
        </div>

        <div className="space-y-6">
          {/* Contrôles */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Obtenez votre position et ouvrez Waze pour la navigation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  onClick={getCurrentLocation}
                  disabled={locationLoading || loading}
                  className="flex-1"
                >
                  {locationLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Localisation...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Obtenir ma position
                    </>
                  )}
                </Button>

                <div className="flex-1">
                  <Label htmlFor="destination">Destination (optionnel)</Label>
                  <Input
                    id="destination"
                    value={customDestination}
                    onChange={(e) => setCustomDestination(e.target.value)}
                    placeholder="Ex: Travail, Domicile, Adresse..."
                    disabled={loading}
                  />
                </div>

                <Button
                  onClick={openWaze}
                  disabled={!userLocation || loading}
                  variant="default"
                  className="flex-1"
                >
                  <NavigationIcon className="mr-2 h-4 w-4" />
                  Ouvrir Waze
                </Button>
              </div>

              {userLocation && (
                <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-3">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    📍 Position actuelle
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Carte et itinéraires */}
          {trafficData && userLocation && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Route className="h-5 w-5" />
                        Carte du trafic
                      </CardTitle>
                      <CardDescription>
                        {trafficData.origin} → {trafficData.destination}
                        {trafficData.source && (
                          <span className="ml-2 text-xs">
                            ({trafficData.source === "google" ? "Google Maps" : trafficData.source === "waze" ? "Waze" : "Simulation"})
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    {trafficData.wazeLinks && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(trafficData.wazeLinks!.route, "_blank")}
                        className="flex items-center gap-2"
                      >
                        <NavigationIcon className="h-4 w-4" />
                        Waze
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <TrafficMap
                    userLocation={userLocation}
                    routes={trafficData.routes}
                  />
                </CardContent>
              </Card>

              {/* Liste des itinéraires */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <NavigationIcon className="h-5 w-5" />
                    Itinéraires disponibles
                  </CardTitle>
                  <CardDescription>
                    {trafficData.routes.length} itinéraire{trafficData.routes.length > 1 ? "s" : ""} disponible{trafficData.routes.length > 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {trafficData.routes.map((route, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-all hover:shadow-soft hover:border-[hsl(var(--primary))]/20"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-[hsl(var(--foreground))]">
                                {route.name}
                              </h3>
                              {getStatusIcon(route.status)}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                              <div className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
                                <Clock className="h-4 w-4" />
                                <span>{route.duration}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
                                <Route className="h-4 w-4" />
                                <span>{route.distance}</span>
                              </div>
                              <span className={`font-medium ${getStatusColor(route.status)}`}>
                                {route.traffic}
                              </span>
                            </div>
                            {route.details && (
                              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                                {route.details}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Liens Waze */}
                  {trafficData.wazeLinks && (
                    <div className="mt-6 space-y-3">
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => window.open(trafficData.wazeLinks!.route, "_blank")}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <NavigationIcon className="h-4 w-4" />
                          Ouvrir la navigation dans Waze
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(trafficData.wazeLinks!.destination, "_blank")}
                          className="flex items-center gap-2"
                        >
                          <MapPin className="h-4 w-4" />
                          Voir la destination dans Waze
                        </Button>
                      </div>
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          <strong>💡 Option Waze (gratuite) :</strong> Cliquez sur les boutons ci-dessus pour ouvrir Waze et obtenir des informations de trafic en temps réel directement depuis l'application.
                        </p>
                        {trafficData.source === "simulation" && (
                          <p className="mt-2 text-xs text-blue-600 dark:text-blue-500">
                            💡 <strong>Astuce :</strong> Configurez GOOGLE_MAPS_API_KEY pour des données de trafic précises directement dans Synexa, ou utilisez Waze pour la navigation.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">
                    Dernière mise à jour: {new Date(trafficData.lastUpdate).toLocaleString("fr-FR")}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!trafficData && !loading && (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))]" />
                <p className="mt-4 text-[hsl(var(--muted-foreground))]">
                  Cliquez sur "Obtenir ma position" pour commencer
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

