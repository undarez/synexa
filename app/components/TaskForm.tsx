"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
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
import type { Task, TaskPriority, TaskContext, EnergyLevel } from "@prisma/client";
import { AlertCircle, Clock, Zap, Briefcase, ShoppingBag, Heart, Wallet, Home, Users, BookOpen, MoreHorizontal } from "lucide-react";

interface TaskFormProps {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const priorityLabels: Record<TaskPriority, string> = {
  HIGH: "Haute",
  MEDIUM: "Moyenne",
  LOW: "Basse",
};

const contextLabels: Record<TaskContext, { label: string; icon: any }> = {
  WORK: { label: "Travail", icon: Briefcase },
  PERSONAL: { label: "Personnel", icon: Heart },
  SHOPPING: { label: "Courses", icon: ShoppingBag },
  HEALTH: { label: "Santé", icon: Heart },
  FINANCE: { label: "Finance", icon: Wallet },
  HOME: { label: "Maison", icon: Home },
  SOCIAL: { label: "Social", icon: Users },
  LEARNING: { label: "Apprentissage", icon: BookOpen },
  OTHER: { label: "Autre", icon: MoreHorizontal },
};

const energyLabels: Record<EnergyLevel, string> = {
  HIGH: "Élevé",
  MEDIUM: "Moyen",
  LOW: "Faible",
};

export function TaskForm({ task, open, onOpenChange, onSuccess }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || "MEDIUM");
  const [context, setContext] = useState<TaskContext>(task?.context || "PERSONAL");
  const [estimatedDuration, setEstimatedDuration] = useState(
    task?.estimatedDuration?.toString() || ""
  );
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(
    task?.energyLevel || null
  );
  const [due, setDue] = useState(
    task?.due ? format(new Date(task.due), "yyyy-MM-dd") : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialiser le formulaire quand la tâche change
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setContext(task.context);
      setEstimatedDuration(task.estimatedDuration?.toString() || "");
      setEnergyLevel(task.energyLevel);
      setDue(task.due ? format(new Date(task.due), "yyyy-MM-dd") : "");
    } else {
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setContext("PERSONAL");
      setEstimatedDuration("");
      setEnergyLevel(null);
      setDue("");
    }
  }, [task, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = task
        ? `/api/tasks/${task.id}`
        : "/api/tasks";
      const method = task ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          priority,
          context,
          estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
          energyLevel,
          due: due || null,
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

  const ContextIcon = contextLabels[context].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Modifier la tâche" : "Nouvelle tâche"}</DialogTitle>
          <DialogDescription>
            {task
              ? "Modifiez les détails de votre tâche."
              : "Créez une nouvelle tâche avec priorité, contexte et durée estimée."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Faire les courses"
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
                placeholder="Détails supplémentaires..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Priorité
                </Label>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as TaskPriority)}
                  disabled={loading}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Haute
                      </span>
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        Moyenne
                      </span>
                    </SelectItem>
                    <SelectItem value="LOW">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Basse
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="context" className="flex items-center gap-2">
                  <ContextIcon className="h-4 w-4" />
                  Contexte
                </Label>
                <Select
                  value={context}
                  onValueChange={(value) => setContext(value as TaskContext)}
                  disabled={loading}
                >
                  <SelectTrigger id="context">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(contextLabels).map(([value, { label, icon: Icon }]) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="estimatedDuration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Durée (min)
                </Label>
                <Input
                  id="estimatedDuration"
                  type="number"
                  min="1"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  placeholder="Ex: 30"
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="energyLevel" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Énergie requise
                </Label>
                <Select
                  value={energyLevel || ""}
                  onValueChange={(value) => setEnergyLevel(value || null)}
                  disabled={loading}
                >
                  <SelectTrigger id="energyLevel">
                    <SelectValue placeholder="Optionnel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun</SelectItem>
                    <SelectItem value="HIGH">Élevé</SelectItem>
                    <SelectItem value="MEDIUM">Moyen</SelectItem>
                    <SelectItem value="LOW">Faible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="due">Date d'échéance</Label>
              <Input
                id="due"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                disabled={loading}
              />
            </div>

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
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Enregistrement..." : task ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
