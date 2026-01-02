"use client";

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

interface Routine {
  id: string;
  name: string;
  triggerType: string;
}

interface RoutinesListProps {
  routines: Routine[];
}

export function RoutinesList({ routines }: RoutinesListProps) {
  if (routines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Automatisations actives</CardTitle>
          <CardDescription>Aucune automatisation active</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/routines">
            <Button variant="outline" className="w-full">
              Créer une automatisation
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const getTriggerLabel = (triggerType: string) => {
    const labels: Record<string, string> = {
      MANUAL: "Manuelle",
      SCHEDULE: "Programmée",
      VOICE: "Vocale",
      LOCATION: "Géolocalisation",
      SENSOR: "Capteur",
    };
    return labels[triggerType] || triggerType;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Automatisations actives</CardTitle>
            <CardDescription>{routines.length} automatisation{routines.length > 1 ? "s" : ""} active{routines.length > 1 ? "s" : ""}</CardDescription>
          </div>
          <Link href="/routines">
            <Button variant="ghost" size="sm">
              Voir tout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {routines.slice(0, 3).map((routine) => (
            <div
              key={routine.id}
              className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:bg-[hsl(var(--muted))]"
            >
              <Sparkles className="mt-0.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <div className="flex-1">
                <h3 className="font-medium text-[hsl(var(--foreground))]">
                  {routine.name}
                </h3>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  Déclencheur : {getTriggerLabel(routine.triggerType)}
                </p>
              </div>
            </div>
          ))}
          {routines.length > 3 && (
            <Link href="/routines">
              <Button variant="ghost" className="w-full">
                Voir {routines.length - 3} automatisation{routines.length - 3 > 1 ? "s" : ""} de plus
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
