"use client";

import { format } from "date-fns";
import { Play, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { RoutineTriggerType } from "@prisma/client";
import type { Routine } from "@prisma/client";

interface RoutineItemProps {
  routine: Routine & {
    steps?: Array<{
      id: string;
      order: number;
      actionType: string;
    }>;
  };
  onEdit: (routine: Routine) => void;
  onDelete: (routineId: string) => void;
  onToggleActive: (routineId: string, active: boolean) => void;
  onExecute: (routineId: string) => void;
}

export function RoutineItem({
  routine,
  onEdit,
  onDelete,
  onToggleActive,
  onExecute,
}: RoutineItemProps) {
  const getTriggerLabel = (triggerType: RoutineTriggerType) => {
    const labels: Record<RoutineTriggerType, string> = {
      MANUAL: "Manuel",
      SCHEDULE: "Programmé",
      VOICE: "Vocale",
      LOCATION: "Géolocalisation",
      SENSOR: "Capteur",
    };
    return labels[triggerType] || triggerType;
  };

  return (
    <Card
      className={
        routine.active
          ? "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
          : "border-[hsl(var(--border))] bg-[hsl(var(--muted))] opacity-75"
      }
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {routine.name}
              {routine.active ? (
                <span className="text-xs font-normal text-[hsl(var(--success))]">
                  ● Active
                </span>
              ) : (
                <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">
                  ● Inactive
                </span>
              )}
            </CardTitle>
            {routine.description && (
              <CardDescription className="mt-1">
                {routine.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
            <span>Déclencheur : {getTriggerLabel(routine.triggerType)}</span>
          </div>

          {routine.steps && routine.steps.length > 0 && (
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              <span>{routine.steps.length} étape{routine.steps.length > 1 ? "s" : ""}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleActive(routine.id, !routine.active)}
            >
              {routine.active ? (
                <>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Désactiver
                </>
              ) : (
                <>
                  <Power className="mr-2 h-4 w-4" />
                  Activer
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExecute(routine.id)}
              disabled={!routine.active}
            >
              <Play className="mr-2 h-4 w-4" />
              Exécuter
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(routine)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(routine.id)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}




