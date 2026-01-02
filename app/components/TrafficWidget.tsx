"use client";

import { useState, useEffect } from "react";
import { Navigation as NavigationIcon, AlertTriangle, MapPin, TrendingUp, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/app/lib/utils";
import { Badge } from "@/app/components/ui/badge";

export function TrafficWidget() {
  const [traffic, setTraffic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTraffic();
  }, []);

  const fetchTraffic = async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      timeoutId = setTimeout(() => {
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
      
      if (data.incidents && Array.isArray(data.incidents)) {
        setTraffic(data);
      } else {
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
        <h3 className="text-lg font-semibold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">🚗 Trafic</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
        </div>
      </div>
    );
  }

  if (!traffic || !traffic.incidents || traffic.incidents.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">🚗 Trafic</h3>
        <div className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] rounded-xl p-4 text-sm font-medium">
          <CheckCircle2 className="h-5 w-5 inline mr-2" />
          Aucun incident détecté dans votre zone
          <p className="text-xs mt-1 opacity-75">Données en temps réel</p>
        </div>
        <Link
          href="/traffic"
          className="flex items-center justify-center gap-2 w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white py-2.5 rounded-xl transition duration-180 text-sm font-medium"
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">🚗 Trafic</h3>

      {/* Statistiques par sévérité */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {highSeverityIncidents.length > 0 && (
          <div className="bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))] rounded-xl p-3">
            <div className="text-xl font-bold">{highSeverityIncidents.length}</div>
            <div className="text-xs font-medium">Sévère</div>
          </div>
        )}
        {mediumSeverityIncidents.length > 0 && (
          <div className="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] rounded-xl p-3">
            <div className="text-xl font-bold">{mediumSeverityIncidents.length}</div>
            <div className="text-xs font-medium">Modéré</div>
          </div>
        )}
        {lowSeverityIncidents.length > 0 && (
          <div className="bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] rounded-xl p-3">
            <div className="text-xl font-bold">{lowSeverityIncidents.length}</div>
            <div className="text-xs font-medium">Léger</div>
          </div>
        )}
      </div>

      {/* Liste des incidents récents */}
      {traffic.incidents.slice(0, 3).length > 0 && (
        <ul className="space-y-2 text-sm">
          {traffic.incidents.slice(0, 3).map((incident: any, index: number) => (
            <li
              key={incident.id || index}
              className="bg-[hsl(var(--surface-alt))] dark:bg-[hsl(var(--surface-alt))] rounded-lg px-3 py-2 text-[hsl(var(--text))] dark:text-[hsl(var(--text))]"
            >
              {incident.severity === "high" && "🚧 "}
              {incident.severity === "medium" && "🚗 "}
              {incident.severity === "low" && "⚠️ "}
              {incident.type || "Incident"}
              {incident.delay && ` – +${incident.delay} min`}
            </li>
          ))}
        </ul>
      )}

      {/* Lien vers la carte */}
      <Link
        href="/traffic"
        className="flex items-center justify-center gap-2 w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white py-2.5 rounded-xl transition duration-180 text-sm font-medium"
      >
        <MapPin className="h-4 w-4" />
        Voir la carte complète
      </Link>
    </div>
  );
}
