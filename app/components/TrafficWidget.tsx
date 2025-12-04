"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Navigation as NavigationIcon, AlertTriangle, Clock, MapPin, TrendingUp, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/app/lib/utils";
import { Badge } from "@/app/components/ui/badge";

export function TrafficWidget() {
  const { data: session } = useSession();
  const [traffic, setTraffic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ne pas attendre la session, charger immédiatement
    fetchTraffic();
  }, []);

  const fetchTraffic = async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      // Timeout de sécurité pour éviter un chargement infini
      timeoutId = setTimeout(() => {
        console.warn("Timeout géolocalisation trafic");
        setTraffic({ incidents: [] });
        setLoading(false);
      }, 8000);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (timeoutId) clearTimeout(timeoutId);
            fetchTrafficData(position.coords.latitude, position.coords.longitude);
          },
          () => {
            if (timeoutId) clearTimeout(timeoutId);
            // Pas de fallback pour le trafic, on affiche juste qu'il n'y a pas d'incidents
            setTraffic({ incidents: [] });
            setLoading(false);
          },
          { timeout: 5000, maximumAge: 60000 }
        );
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        setTraffic({ incidents: [] });
        setLoading(false);
      }
    } catch (error) {
      console.error("Erreur:", error);
      if (timeoutId) clearTimeout(timeoutId);
      setTraffic({ incidents: [] });
      setLoading(false);
    }
  };

  const fetchTrafficData = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`/api/traffic/around?lat=${lat}&lng=${lng}`);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      
      // L'API retourne { incidents: [...] }
      if (data.incidents && Array.isArray(data.incidents)) {
        setTraffic(data);
      } else {
        // Format alternatif ou pas d'incidents
        setTraffic({ incidents: [] });
      }
    } catch (error) {
      console.error("Erreur trafic:", error);
      setTraffic({ incidents: [] });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 animate-pulse" />
            <div>
              <h3 className="font-semibold text-lg">Trafic</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Analyse en cours...</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
        </div>
      </div>
    );
  }

  if (!traffic || !traffic.incidents || traffic.incidents.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-[hsl(var(--foreground))]">Trafic</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Circulation fluide</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Aucun incident détecté dans votre zone
            </p>
          </div>
        </div>
        <Link
          href="/traffic"
          className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gradient-to-r from-[hsl(var(--primary))] to-purple-600 text-white hover:from-[hsl(var(--primary))]/90 hover:to-purple-600/90 transition-all duration-200 hover:scale-105 text-sm font-medium"
        >
          <MapPin className="h-4 w-4" />
          Voir la carte complète
        </Link>
      </div>
    );
  }

  const highSeverityIncidents = traffic.incidents.filter((i: any) => i.severity === "high");
  const mediumSeverityIncidents = traffic.incidents.filter((i: any) => i.severity === "medium");
  const lowSeverityIncidents = traffic.incidents.filter((i: any) => i.severity === "low");

  const totalIncidents = traffic.incidents.length;
  const statusColor = totalIncidents > 5 ? "text-red-500" : totalIncidents > 2 ? "text-yellow-500" : "text-green-500";

  return (
    <div className="space-y-4">
      {/* En-tête avec statut animé */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <NavigationIcon className={cn("h-10 w-10", statusColor)} />
            <div className={cn("absolute -top-1 -right-1 h-3 w-3 rounded-full animate-ping", 
              totalIncidents > 5 ? "bg-red-500" : totalIncidents > 2 ? "bg-yellow-500" : "bg-green-500"
            )} />
            <div className={cn("absolute -top-1 -right-1 h-3 w-3 rounded-full",
              totalIncidents > 5 ? "bg-red-500" : totalIncidents > 2 ? "bg-yellow-500" : "bg-green-500"
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-[hsl(var(--foreground))]">Trafic</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {totalIncidents} incident{totalIncidents > 1 ? "s" : ""} détecté{totalIncidents > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Badge
          variant={totalIncidents > 5 ? "destructive" : totalIncidents > 2 ? "default" : "secondary"}
          className="animate-pulse"
        >
          {totalIncidents > 5 ? "Dense" : totalIncidents > 2 ? "Modéré" : "Fluide"}
        </Badge>
      </div>

      {/* Statistiques par sévérité avec animations */}
      <div className="grid grid-cols-3 gap-3">
        {highSeverityIncidents.length > 0 && (
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 border border-red-200 dark:border-red-900 hover:scale-105 transition-transform duration-200 animate-pulse">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Sévères</span>
            <span className="font-bold text-lg text-red-600 dark:text-red-400">
              {highSeverityIncidents.length}
            </span>
          </div>
        )}
        {mediumSeverityIncidents.length > 0 && (
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/20 dark:to-yellow-900/10 border border-yellow-200 dark:border-yellow-900 hover:scale-105 transition-transform duration-200">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Modérés</span>
            <span className="font-bold text-lg text-yellow-600 dark:text-yellow-400">
              {mediumSeverityIncidents.length}
            </span>
          </div>
        )}
        {lowSeverityIncidents.length > 0 && (
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border border-blue-200 dark:border-blue-900 hover:scale-105 transition-transform duration-200">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Légers</span>
            <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
              {lowSeverityIncidents.length}
            </span>
          </div>
        )}
      </div>

      {/* Liste des incidents récents */}
      {traffic.incidents.slice(0, 3).length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[hsl(var(--border))]">
          <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-2">Incidents récents</p>
          {traffic.incidents.slice(0, 3).map((incident: any, index: number) => (
            <div
              key={incident.id || index}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg transition-all duration-200 hover:scale-[1.02]",
                incident.severity === "high" 
                  ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                  : incident.severity === "medium"
                  ? "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900"
                  : "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900"
              )}
            >
              <AlertTriangle
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  incident.severity === "high" ? "text-red-500" :
                  incident.severity === "medium" ? "text-yellow-500" : "text-blue-500"
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">
                  {incident.type || "Incident"}
                </p>
                {incident.delay && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    +{incident.delay} min
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lien vers la carte */}
      <Link
        href="/traffic"
        className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gradient-to-r from-[hsl(var(--primary))] to-purple-600 text-white hover:from-[hsl(var(--primary))]/90 hover:to-purple-600/90 transition-all duration-200 hover:scale-105 text-sm font-medium"
      >
        <MapPin className="h-4 w-4" />
        Voir la carte complète
      </Link>
    </div>
  );
}



