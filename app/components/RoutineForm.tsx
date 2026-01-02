"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { RoutineStepEditor, type RoutineStep } from "@/app/components/RoutineStepEditor";
import { NaturalLanguageRoutineInput } from "@/app/components/NaturalLanguageRoutineInput";
import { RoutineTriggerType } from "@prisma/client";
import type { Routine } from "@prisma/client";
import type { ParsedRoutine } from "@/app/lib/ai/routine-parser";

interface RoutineFormProps {
  routine?: Routine & { steps?: Array<{ id: string; order: number; actionType: string; payload?: unknown; deviceId?: string | null; delaySeconds?: number | null }> } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  devices?: Array<{ id: string; name: string }>;
}

export function RoutineForm({
  routine,
  open,
  onOpenChange,
  onSuccess,
  devices = [],
}: RoutineFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [triggerType, setTriggerType] = useState<RoutineTriggerType>(
    RoutineTriggerType.MANUAL
  );
  const [triggerData, setTriggerData] = useState<Record<string, unknown>>({});
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useNaturalLanguage, setUseNaturalLanguage] = useState(false);

  useEffect(() => {
    if (routine) {
      setName(routine.name);
      setDescription(routine.description || "");
      setActive(routine.active);
      setTriggerType(routine.triggerType);
      setTriggerData((routine.triggerData as Record<string, unknown>) || {});
      setSteps(
        (routine.steps || []).map((step) => ({
          id: step.id,
          actionType: step.actionType as any,
          payload: (step.payload as Record<string, unknown>) || {},
          deviceId: step.deviceId || null,
          delaySeconds: step.delaySeconds || null,
          order: step.order,
        }))
      );
    } else {
      setName("");
      setDescription("");
      setActive(true);
      setTriggerType(RoutineTriggerType.MANUAL);
      setTriggerData({});
      setSteps([]);
      setUseNaturalLanguage(false);
    }
  }, [routine, open]);

  const handleNaturalLanguageParse = (parsed: ParsedRoutine) => {
    // Remplir le formulaire avec les données parsées
    setName(parsed.name);
    setDescription(parsed.description || "");
    setTriggerType(parsed.triggerType);
    setTriggerData(parsed.triggerData || {});
    setSteps(
      parsed.steps.map((step) => ({
        actionType: step.actionType,
        payload: step.payload || {},
        deviceId: step.deviceId || null,
        delaySeconds: step.delaySeconds || null,
        order: step.order,
      }))
    );
    
    // Basculer vers le mode formulaire pour permettre les modifications
    setUseNaturalLanguage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!name.trim()) {
        throw new Error("Le nom est requis");
      }

      // Si c'est un template (id === "template"), créer une nouvelle routine
      const isTemplate = routine?.id === "template";
      const url = routine && !isTemplate ? `/api/routines/${routine.id}` : "/api/routines";
      const method = routine && !isTemplate ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          active,
          triggerType,
          triggerData: Object.keys(triggerData).length > 0 ? triggerData : null,
          steps: steps.map((step) => ({
            actionType: step.actionType,
            payload: step.payload || null,
            deviceId: step.deviceId || null,
            delaySeconds: step.delaySeconds || null,
            order: step.order,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la sauvegarde");
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const getTriggerLabel = (trigger: RoutineTriggerType) => {
    const labels: Record<RoutineTriggerType, string> = {
      MANUAL: "Manuel",
      SCHEDULE: "Programmé",
      VOICE: "Vocale",
      LOCATION: "Géolocalisation",
      SENSOR: "Capteur",
    };
    return labels[trigger] || trigger;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {routine ? "Modifier l'automatisation" : "Nouvelle automatisation"}
          </DialogTitle>
          <DialogDescription>
            {routine
              ? "Modifiez les détails de votre automatisation."
              : "Créez une nouvelle automatisation pour exécuter plusieurs actions automatiquement."}
          </DialogDescription>
        </DialogHeader>
        
        {!routine && (
          <div className="flex gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
            <Button
              type="button"
              variant={!useNaturalLanguage ? "default" : "outline"}
              size="sm"
              onClick={() => setUseNaturalLanguage(false)}
            >
              Formulaire
            </Button>
            <Button
              type="button"
              variant={useNaturalLanguage ? "default" : "outline"}
              size="sm"
              onClick={() => setUseNaturalLanguage(true)}
            >
              ✨ Langage naturel
            </Button>
          </div>
        )}

        {!routine && useNaturalLanguage ? (
          <div className="py-4">
            <NaturalLanguageRoutineInput
              onParse={handleNaturalLanguageParse}
              onCancel={() => setUseNaturalLanguage(false)}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Réveil matin, Départ travail..."
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de la routine..."
                rows={2}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="triggerType">Type de déclencheur</Label>
              <Select
                value={triggerType}
                onValueChange={(value) =>
                  setTriggerType(value as RoutineTriggerType)
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(RoutineTriggerType).map((trigger) => (
                    <SelectItem key={trigger} value={trigger}>
                      {getTriggerLabel(trigger)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {triggerType === RoutineTriggerType.SCHEDULE && (
              <div className="grid gap-2">
                <Label htmlFor="scheduleTime">Heure (HH:mm)</Label>
                <Input
                  id="scheduleTime"
                  type="time"
                  value={(triggerData.time as string) || ""}
                  onChange={(e) =>
                    setTriggerData({ ...triggerData, time: e.target.value })
                  }
                  disabled={loading}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <Label htmlFor="active" className="cursor-pointer">
                Routine active
              </Label>
            </div>

            <RoutineStepEditor
              steps={steps}
              onChange={setSteps}
              devices={devices}
            />

              {error && (
                <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
              )}
            </div>
            <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Enregistrement..." : routine ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

