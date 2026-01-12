"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { MapPin, RefreshCw, Loader2, Car } from "lucide-react";
import dynamic from "next/dynamic";

const TraficRoutierMap = dynamic(() => import("./TraficRoutierMap").then(mod => ({ default: mod.TraficRoutierMap })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
    </div>
  ),
});

interface TrafficRoute {
  name: string;
  duration: string;
  distance: string;
  durationSeconds: number;
  distanceMeters: number;
  traffic: string;
  status: "good" | "moderate" | "heavy" | "bad";
  details: string;
}

interface TrafficData {
  origin: string;
  destination: string;
  userLocation: { lat: number; lng: number } | null;
  destinationLocation: { lat: number; lng: number } | null;
  routes: TrafficRoute[];
  incidents: never[]; // Pas d'incidents simulés
  lastUpdate: string;
  source: string;
}

interface TraficRoutierProps {
  userLocation: { lat: number; lng: number } | null;
  onLocationChange?: (location: { lat: number; lng: number }) => void;
}

export function TraficRoutier({ userLocation, onLocationChange }: TraficRoutierProps) {
  const [destination, setDestination] = useState("");
  const [trafficData, setTrafficData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        if (onLocationChange) {
          onLocationChange(location);
        }
        fetchTrafficAroundLocation(location.lat, location.lng);
        setLocationLoading(false);
      },
      (err) => {
        setError("Erreur lors de la récupération de la position");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      }
    );
  };

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

  const refreshData = () => {
    if (userLocation) {
      if (destination.trim()) {
        searchRoute();
      } else {
        fetchTrafficAroundLocation(userLocation.lat, userLocation.lng);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Carte Routière - Temps réel */}
      {userLocation && (
        <TraficRoutierMap
          key={`road-map-${userLocation.lat.toFixed(4)}-${userLocation.lng.toFixed(4)}`}
          userLocation={userLocation}
          destinationLocation={trafficData?.destinationLocation || null}
          routes={trafficData?.routes || []}
        />
      )}

      {/* Contrôles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Contrôles
          </CardTitle>
          <CardDescription>
            Gérez votre position et votre destination
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
                  <MapPin className="h-4 w-4" />
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
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Itinéraires */}
      {trafficData && trafficData.routes && trafficData.routes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Itinéraires disponibles ({trafficData.routes.length})</CardTitle>
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
                      <h3 className="font-semibold text-[hsl(var(--foreground))]">
                        {route.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
                          <span>{route.duration}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
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
    </div>
  );
}
