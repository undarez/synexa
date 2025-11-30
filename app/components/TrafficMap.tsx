"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Import dynamique pour éviter les erreurs SSR avec Leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

interface TrafficMapProps {
  userLocation: { lat: number; lng: number };
  routes?: Array<{
    name: string;
    duration: string;
    distance: string;
    traffic: string;
    status: string;
    details: string;
    polyline?: Array<{ lat: number; lng: number }>;
  }>;
}

export function TrafficMap({ userLocation, routes = [] }: TrafficMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fix pour les icônes Leaflet
    if (typeof window !== "undefined") {
      import("leaflet").then((L) => {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });
      });
    }
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800">
        <p className="text-sm text-zinc-500">Chargement de la carte...</p>
      </div>
    );
  }

  const colors = ["#3b82f6", "#10b981", "#f59e0b"];

  return (
    <div className="rounded-lg border border-zinc-200 overflow-hidden dark:border-zinc-800">
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={13}
        style={{ height: "400px", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Marqueur position utilisateur */}
        <Marker position={[userLocation.lat, userLocation.lng]}>
          <Popup>
            <div className="text-sm">
              <p className="font-medium">📍 Votre position</p>
              <p className="text-xs text-zinc-500">
                {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Itinéraires */}
        {routes.map((route, idx) => {
          if (!route.polyline || route.polyline.length === 0) return null;
          
          const routeColor = colors[idx % colors.length];
          
          return (
            <Polyline
              key={idx}
              positions={route.polyline.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: routeColor, weight: 4, opacity: 0.7 }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-medium">{route.name}</p>
                  <p className="text-xs">{route.duration} • {route.distance}</p>
                  <p className="text-xs text-zinc-500">{route.traffic}</p>
                  <p className="text-xs text-zinc-400">{route.details}</p>
                </div>
              </Popup>
            </Polyline>
          );
        })}
      </MapContainer>
    </div>
  );
}
