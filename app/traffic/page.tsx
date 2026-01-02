"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Navigation } from "@/app/components/Navigation";
import { 
  MapPin, 
  Navigation as NavigationIcon, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  Route,
  Loader2,
  TrendingUp,
  Car,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import dynamic from "next/dynamic";

// Charger TrafficMap uniquement côté client
const TrafficMap = dynamic(() => import("@/app/components/TrafficMap").then(mod => ({ default: mod.TrafficMap })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
    </div>
  ),
});

interface TrafficIncident {
  id: string;
  type: string;
  severity: "low" | "medium" | "high";
  lat: number;
  lng: number;
  description: string;
  delay?: number; // en minutes
  distance?: number; // en km
}

interface TrafficRoute {
  name: string;
  duration: string;
  distance: string;
  durationSeconds: number;
  distanceMeters: number;
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
  incidents: TrafficIncident[];
  lastUpdate: string;
  source: string;
}

export default function TrafficPage() {
  const { data: session, status } = useSession();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState("");
  const [trafficData, setTrafficData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtenir la position automatiquement au chargement
  useEffect(() => {
    if (status === "authenticated" && !userLocation && !locationLoading) {
      // Timeout de sécurité pour éviter un chargement infini
      let timeoutId: NodeJS.Timeout | null = null;
      
      timeoutId = setTimeout(() => {
        console.warn("Timeout géolocalisation, utilisation de Paris par défaut");
        const defaultLocation = { lat: 48.8566, lng: 2.3522 }; // Paris
        setUserLocation(defaultLocation);
        setLocationLoading(false);
        fetchTrafficAroundLocation(defaultLocation.lat, defaultLocation.lng);
      }, 8000);

      // Essayer d'abord de récupérer depuis le profil
      fetch("/api/profile")
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw new Error("Profil non disponible");
        })
        .then((data) => {
          const workLat = data.profile?.workLat;
          const workLng = data.profile?.workLng;
          
          if (workLat && workLng) {
            if (timeoutId) clearTimeout(timeoutId);
            const profileLocation = { lat: workLat, lng: workLng };
            setUserLocation(profileLocation);
            setLocationLoading(false);
            fetchTrafficAroundLocation(profileLocation.lat, profileLocation.lng);
            return;
          }
          
          // Sinon, utiliser la géolocalisation du navigateur
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                if (timeoutId) clearTimeout(timeoutId);
                const { latitude, longitude } = position.coords;
                const geoLocation = { lat: latitude, lng: longitude };
                setUserLocation(geoLocation);
                setLocationLoading(false);
                fetchTrafficAroundLocation(geoLocation.lat, geoLocation.lng);
              },
              () => {
                // En cas d'erreur, utiliser Paris par défaut
                if (timeoutId) clearTimeout(timeoutId);
                const defaultLocation = { lat: 48.8566, lng: 2.3522 };
                setUserLocation(defaultLocation);
                setLocationLoading(false);
                fetchTrafficAroundLocation(defaultLocation.lat, defaultLocation.lng);
              },
              {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 60000,
              }
            );
          } else {
            // Géolocalisation non supportée, utiliser Paris
            if (timeoutId) clearTimeout(timeoutId);
            const defaultLocation = { lat: 48.8566, lng: 2.3522 };
            setUserLocation(defaultLocation);
            setLocationLoading(false);
            fetchTrafficAroundLocation(defaultLocation.lat, defaultLocation.lng);
          }
        })
        .catch(() => {
          // En cas d'erreur, utiliser la géolocalisation du navigateur
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                if (timeoutId) clearTimeout(timeoutId);
                const { latitude, longitude } = position.coords;
                const geoLocation = { lat: latitude, lng: longitude };
                setUserLocation(geoLocation);
                setLocationLoading(false);
                fetchTrafficAroundLocation(geoLocation.lat, geoLocation.lng);
              },
              () => {
                if (timeoutId) clearTimeout(timeoutId);
                const defaultLocation = { lat: 48.8566, lng: 2.3522 };
                setUserLocation(defaultLocation);
                setLocationLoading(false);
                fetchTrafficAroundLocation(defaultLocation.lat, defaultLocation.lng);
              },
              {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 60000,
              }
            );
          } else {
            if (timeoutId) clearTimeout(timeoutId);
            const defaultLocation = { lat: 48.8566, lng: 2.3522 };
            setUserLocation(defaultLocation);
            setLocationLoading(false);
            fetchTrafficAroundLocation(defaultLocation.lat, defaultLocation.lng);
          }
        });
    }
  }, [status]);

  // Obtenir la position actuelle
  const getCurrentLocation = () => {
    setLocationLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationLoading(false);
        // Charger automatiquement les données de trafic autour de la position
        fetchTrafficAroundLocation(latitude, longitude);
      },
      (err) => {
        // Gérer l'erreur silencieusement sans polluer la console
        setError("Impossible d'obtenir votre position. Vérifiez les permissions de géolocalisation.");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Récupérer les données de trafic autour de la position
  const fetchTrafficAroundLocation = async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/traffic/around?lat=${lat}&lng=${lng}`);
      
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des données de trafic");
      }

      const data = await response.json();
      setTrafficData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  // Rechercher un itinéraire vers une destination
  const searchRoute = async () => {
    if (!userLocation) {
      setError("Veuillez d'abord obtenir votre position actuelle");
      return;
    }

    if (!destination.trim()) {
      setError("Veuillez saisir une destination");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: userLocation.lat.toString(),
        lng: userLocation.lng.toString(),
        destination: destination.trim(),
      });

      const response = await fetch(`/api/traffic?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération de l'itinéraire");
      }

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setTrafficData(null);
        return;
      }
      
      setTrafficData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  // Actualiser les données
  const refreshData = () => {
    if (userLocation) {
      if (destination.trim()) {
        searchRoute();
      } else {
        fetchTrafficAroundLocation(userLocation.lat, userLocation.lng);
      }
    }
  };

  // Obtenir l'icône de sévérité
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "medium":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  // Obtenir la couleur de statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600 dark:text-green-400";
      case "moderate":
        return "text-yellow-600 dark:text-yellow-400";
      case "heavy":
        return "text-orange-600 dark:text-orange-400";
      case "bad":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
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
            Trafic Routier en Temps Réel
          </h1>
          <p className="mt-2 text-[hsl(var(--muted-foreground))]">
            Consultez les conditions de trafic, accidents et bouchons autour de vous
          </p>
        </div>

        <div className="space-y-6">
          {/* Contrôles */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Obtenez votre position pour voir les données de trafic en temps réel
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
                  <div className="flex gap-2">
                    <Input
                      id="destination"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          searchRoute();
                        }
                      }}
                      placeholder="Ex: Travail, Adresse..."
                      disabled={loading}
                      className="flex-1"
                    />
                    <Button
                      onClick={searchRoute}
                      disabled={!userLocation || !destination.trim() || loading}
                      variant="outline"
                    >
                      <NavigationIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={refreshData}
                  disabled={!userLocation || loading}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Actualiser
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

          {/* Carte */}
          {userLocation && (
            <div key={`traffic-map-${userLocation.lat}-${userLocation.lng}`}>
              <TrafficMap
                userLocation={userLocation}
                destinationLocation={trafficData?.destinationLocation || null}
                routes={trafficData?.routes || []}
                incidents={trafficData?.incidents || []}
              />
            </div>
          )}

          {/* Incidents de trafic */}
          {trafficData && trafficData.incidents && trafficData.incidents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Incidents de trafic ({trafficData.incidents.length})
                </CardTitle>
                <CardDescription>
                  Incidents en temps réel détectés autour de votre position (données TomTom)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trafficData.incidents.map((incident) => (
                    <div
                      key={incident.id}
                      className={`rounded-lg border p-4 ${
                        incident.severity === "high"
                          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                          : incident.severity === "medium"
                          ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20"
                          : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(incident.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[hsl(var(--foreground))]">
                              {incident.type}
                            </p>
                            <span
                              className={`text-xs font-medium ${
                                incident.severity === "high"
                                  ? "text-red-600 dark:text-red-400"
                                  : incident.severity === "medium"
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              {incident.severity === "high"
                                ? "Sévère"
                                : incident.severity === "medium"
                                ? "Modéré"
                                : "Faible"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                            {incident.description}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-[hsl(var(--muted-foreground))]">
                            {incident.delay && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Délai: ~{incident.delay} min</span>
                              </div>
                            )}
                            {incident.distance && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{incident.distance.toFixed(1)} km</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Itinéraires */}
          {trafficData && trafficData.routes && trafficData.routes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <NavigationIcon className="h-5 w-5" />
                  Itinéraires disponibles ({trafficData.routes.length})
                </CardTitle>
                <CardDescription>
                  Itinéraires calculés vers votre destination
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trafficData.routes.map((route, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-all hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-[hsl(var(--foreground))]">
                              {route.name}
                            </h3>
                            <span className={`text-xs font-medium ${getStatusColor(route.status)}`}>
                              {route.traffic}
                            </span>
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
              </CardContent>
            </Card>
          )}

          {/* Message si aucun incident trouvé */}
          {userLocation && trafficData && trafficData.incidents && trafficData.incidents.length === 0 && !loading && (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  Aucun incident de trafic détecté
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Les routes sont fluides dans votre zone. Données mises à jour en temps réel.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Message si pas de données */}
          {userLocation && !trafficData && !loading && (
            <Card>
              <CardContent className="py-12 text-center">
                <Car className="mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))] mb-4" />
                <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  Chargement des données de trafic...
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Les données sont mises à jour en temps réel depuis l'API TomTom
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
