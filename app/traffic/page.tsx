"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/app/lib/auth/mock-client";
import { Navigation } from "@/app/components/Navigation";
import { Loader2, Car, Train } from "lucide-react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";

// Charger les composants uniquement côté client
const TraficRoutier = dynamic(() => import("@/app/components/TraficRoutier").then(mod => ({ default: mod.TraficRoutier })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
    </div>
  ),
});

const TraficFerroviaire = dynamic(() => import("@/app/components/TraficFerroviaire").then(mod => ({ default: mod.TraficFerroviaire })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
    </div>
  ),
});

export default function TrafficPage() {
  const { data: session, status } = useSession();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"road" | "railway">("road");

  // Initialiser automatiquement la position au chargement pour la carte routière
  useEffect(() => {
    if (status === "authenticated" && !userLocation) {
      // Essayer de récupérer depuis le profil
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
            setUserLocation({ lat: workLat, lng: workLng });
            return;
          }

          // Sinon, utiliser la géolocalisation
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setUserLocation({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                });
              },
              () => {
                // En cas d'erreur, utiliser Paris par défaut
                setUserLocation({ lat: 48.8566, lng: 2.3522 });
              },
              {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 60000,
              }
            );
          } else {
            // Pas de géolocalisation, utiliser Paris par défaut
            setUserLocation({ lat: 48.8566, lng: 2.3522 });
          }
        })
        .catch(() => {
          // En cas d'erreur, utiliser Paris par défaut
          setUserLocation({ lat: 48.8566, lng: 2.3522 });
        });
    }
  }, [status, userLocation]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center" suppressHydrationWarning>
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]" suppressHydrationWarning>
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">
            Trafic en Temps Réel
          </h1>
          <p className="mt-2 text-[hsl(var(--muted-foreground))]">
            Consultez le trafic routier et ferroviaire, retards des trains autour de vous
          </p>
        </div>

        <div className="space-y-6">
          {/* Onglets Trafic Routier / Ferroviaire */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "road" | "railway")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="road" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Trafic Routier
              </TabsTrigger>
              <TabsTrigger value="railway" className="flex items-center gap-2">
                <Train className="h-4 w-4" />
                Trafic Ferroviaire
              </TabsTrigger>
            </TabsList>

            {/* Onglet Trafic Routier */}
            <TabsContent value="road" className="space-y-6">
              <TraficRoutier 
                userLocation={userLocation}
                onLocationChange={(location) => setUserLocation(location)}
              />
            </TabsContent>

            {/* Onglet Trafic Ferroviaire */}
            <TabsContent value="railway" className="space-y-6">
              <TraficFerroviaire />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
