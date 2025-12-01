"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Navigation as NavigationIcon, AlertTriangle, Clock } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export function TrafficWidget() {
  const { data: session } = useSession();
  const [traffic, setTraffic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchTraffic();
    }
  }, [session]);

  const fetchTraffic = async () => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            fetchTrafficData(position.coords.latitude, position.coords.longitude);
          },
          () => {
            setLoading(false);
          }
        );
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Erreur:", error);
      setLoading(false);
    }
  };

  const fetchTrafficData = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`/api/traffic/around?lat=${lat}&lng=${lng}`);
      const data = await response.json();
      setTraffic(data);
    } catch (error) {
      console.error("Erreur trafic:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <NavigationIcon className="h-5 w-5" />
            Trafic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  if (!traffic || !traffic.incidents || traffic.incidents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <NavigationIcon className="h-5 w-5" />
            Trafic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
              Aucun incident de trafic détecté
            </p>
            <Link href="/traffic" className="text-xs text-[hsl(var(--primary))] hover:underline">
              Voir la carte complète →
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const highSeverityIncidents = traffic.incidents.filter((i: any) => i.severity === "high").length;
  const mediumSeverityIncidents = traffic.incidents.filter((i: any) => i.severity === "medium").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NavigationIcon className="h-5 w-5" />
          Trafic
        </CardTitle>
        <CardDescription>
          {traffic.incidents.length} incident{traffic.incidents.length > 1 ? "s" : ""} détecté{traffic.incidents.length > 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {highSeverityIncidents > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="font-medium text-red-600 dark:text-red-400">
                {highSeverityIncidents} incident{highSeverityIncidents > 1 ? "s" : ""} sévère{highSeverityIncidents > 1 ? "s" : ""}
              </span>
            </div>
          )}
          {mediumSeverityIncidents > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-yellow-600 dark:text-yellow-400">
                {mediumSeverityIncidents} incident{mediumSeverityIncidents > 1 ? "s" : ""} modéré{mediumSeverityIncidents > 1 ? "s" : ""}
              </span>
            </div>
          )}
          <Link href="/traffic" className="text-xs text-[hsl(var(--primary))] hover:underline mt-2 block">
            Voir la carte complète →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

