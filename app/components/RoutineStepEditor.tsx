"use client";

import { useState } from "react";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Card, CardContent } from "@/app/components/ui/card";
import { RoutineActionType } from "@prisma/client";

export interface RoutineStep {
  id?: string;
  actionType: RoutineActionType;
  payload?: Record<string, unknown> | null;
  deviceId?: string | null;
  delaySeconds?: number | null;
  order: number;
}

interface RoutineStepEditorProps {
  steps: RoutineStep[];
  onChange: (steps: RoutineStep[]) => void;
  devices?: Array<{ id: string; name: string }>;
}

export function RoutineStepEditor({
  steps,
  onChange,
  devices = [],
}: RoutineStepEditorProps) {
  const addStep = () => {
    const newStep: RoutineStep = {
      actionType: RoutineActionType.NOTIFICATION,
      payload: {},
      order: steps.length,
    };
    onChange([...steps, newStep]);
  };

  const updateStep = (index: number, updates: Partial<RoutineStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    onChange(newSteps);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Réorganiser les ordres
    onChange(newSteps.map((step, i) => ({ ...step, order: i })));
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [
      newSteps[targetIndex],
      newSteps[index],
    ];
    // Réorganiser les ordres
    onChange(newSteps.map((step, i) => ({ ...step, order: i })));
  };

  const getActionLabel = (actionType: RoutineActionType) => {
    const labels: Record<RoutineActionType, string> = {
      DEVICE_COMMAND: "Commande appareil",
      NOTIFICATION: "Notification",
      TASK_CREATE: "Créer une tâche",
      MEDIA_PLAY: "Lire média",
      CUSTOM: "Action personnalisée",
    };
    return labels[actionType] || actionType;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Étapes de la routine</Label>
        <Button type="button" variant="outline" size="sm" onClick={addStep}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une étape
        </Button>
      </div>

      {steps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-zinc-500">
            Aucune étape. Cliquez sur "Ajouter une étape" pour commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveStep(index, "up")}
                      disabled={index === 0}
                    >
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveStep(index, "down")}
                      disabled={index === steps.length - 1}
                    >
                      <GripVertical className="h-4 w-4 -rotate-90" />
                    </Button>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="grid gap-2">
                      <Label>Type d'action</Label>
                      <Select
                        value={step.actionType}
                        onValueChange={(value) =>
                          updateStep(index, {
                            actionType: value as RoutineActionType,
                            payload: {},
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(RoutineActionType).map((action) => (
                            <SelectItem key={action} value={action}>
                              {getActionLabel(action)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {step.actionType === RoutineActionType.DEVICE_COMMAND && (
                      <div className="grid gap-2">
                        <Label>Appareil</Label>
                        <Select
                          value={step.deviceId || "none"}
                          onValueChange={(value) =>
                            updateStep(index, { deviceId: value === "none" ? null : value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un appareil" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucun</SelectItem>
                            {devices.map((device) => (
                              <SelectItem key={device.id} value={device.id}>
                                {device.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {(step.actionType === RoutineActionType.NOTIFICATION ||
                      step.actionType === RoutineActionType.TASK_CREATE) && (
                      <div className="grid gap-2">
                        <Label>
                          {step.actionType === RoutineActionType.NOTIFICATION
                            ? "Message"
                            : "Titre de la tâche"}
                        </Label>
                        <Input
                          value={
                            (step.payload as { message?: string; title?: string })
                              ?.message ||
                            (step.payload as { message?: string; title?: string })
                              ?.title ||
                            ""
                          }
                          onChange={(e) =>
                            updateStep(index, {
                              payload: {
                                ...step.payload,
                                [step.actionType === RoutineActionType.NOTIFICATION
                                  ? "message"
                                  : "title"]: e.target.value,
                              },
                            })
                          }
                          placeholder={
                            step.actionType === RoutineActionType.NOTIFICATION
                              ? "Message de notification"
                              : "Titre de la tâche"
                          }
                        />
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label>Délai avant cette étape (secondes)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={step.delaySeconds || 0}
                        onChange={(e) =>
                          updateStep(index, {
                            delaySeconds: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStep(index)}
                    className="mt-2 text-red-500 hover:text-red-700 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

