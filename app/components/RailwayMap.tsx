"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Train } from "lucide-react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

interface RailwayMapProps {
  userLocation: { lat: number; lng: number };
}

// Charger RailTrafficMapFixed dynamiquement côté client uniquement
// Version corrigée et simplifiée pour éviter les erreurs de container
const RailTrafficMapDynamic = dynamic(
  () => import("./RailTrafficMapFixed").then((mod) => ({ default: mod.RailTrafficMapFixed })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    ),
  }
);

/**
 * Wrapper pour la carte ferroviaire
 * Responsabilité : Fournir l'UI wrapper (Card) et charger le composant de carte isolé
 */
export function RailwayMap({ userLocation }: RailwayMapProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Train className="h-5 w-5 text-blue-500" />
          Réseau Ferroviaire & Retards
        </CardTitle>
        <CardDescription>
          Lignes ferroviaires et retards des trains en temps réel sur le réseau français
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RailTrafficMapDynamic userLocation={userLocation} />
      </CardContent>
    </Card>
  );
}
