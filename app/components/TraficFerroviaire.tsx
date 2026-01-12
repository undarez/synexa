"use client";

import { Train } from "lucide-react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

const MapFerroviaire = dynamic(() => import("./MapFerroviaire").then(mod => ({ default: mod.MapFerroviaire })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
    </div>
  ),
});

interface TraficFerroviaireProps {
  refreshInterval?: number; // en millisecondes, défaut: 60000 (60 secondes)
}

export function TraficFerroviaire({ refreshInterval = 60000 }: TraficFerroviaireProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Train className="h-5 w-5 text-blue-500" />
            Trains & RER en Temps Réel
          </CardTitle>
          <CardDescription>
            Visualisez les trains et RER en circulation en France avec leurs informations en temps réel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Sélectionnez une gare de départ et/ou d'arrivée pour filtrer les trains affichés sur la carte.
            Les données sont mises à jour automatiquement toutes les {refreshInterval / 1000} secondes.
          </p>
        </CardContent>
      </Card>

      {/* Carte Ferroviaire avec trains en temps réel */}
      <div className="relative w-full">
        <MapFerroviaire refreshInterval={refreshInterval} />
      </div>
    </div>
  );
}
