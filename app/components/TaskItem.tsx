"use client";

import { format } from "date-fns";
import { Pencil, Trash2, CheckCircle2, Clock, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { Task, TaskPriority, TaskContext, EnergyLevel } from "@prisma/client";
import { Briefcase, ShoppingBag, Heart, Wallet, Home, Users, BookOpen, MoreHorizontal } from "lucide-react";

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
}

const contextIcons: Record<TaskContext, any> = {
  WORK: Briefcase,
  PERSONAL: Heart,
  SHOPPING: ShoppingBag,
  HEALTH: Heart,
  FINANCE: Wallet,
  HOME: Home,
  SOCIAL: Users,
  LEARNING: BookOpen,
  OTHER: MoreHorizontal,
};

const contextLabels: Record<TaskContext, string> = {
  WORK: "Travail",
  PERSONAL: "Personnel",
  SHOPPING: "Courses",
  HEALTH: "Santé",
  FINANCE: "Finance",
  HOME: "Maison",
  SOCIAL: "Social",
  LEARNING: "Apprentissage",
  OTHER: "Autre",
};

const priorityColors: Record<TaskPriority, string> = {
  HIGH: "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]",
  MEDIUM: "bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]",
  LOW: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
};

const priorityLabels: Record<TaskPriority, string> = {
  HIGH: "Haute",
  MEDIUM: "Moyenne",
  LOW: "Basse",
};

export function TaskItem({ task, onEdit, onDelete, onToggleComplete }: TaskItemProps) {
  const isOverdue = task.due && new Date(task.due) < new Date() && !task.completed && !isToday(new Date(task.due));
  const ContextIcon = contextIcons[task.context];

  const handleToggleComplete = async () => {
    if (onToggleComplete) {
      await onToggleComplete(task.id, !task.completed);
    }
  };

  return (
    <div
      className={`flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-[hsl(var(--muted))] ${
        task.completed
          ? "border-[hsl(var(--border))] bg-[hsl(var(--muted))] opacity-60"
          : isOverdue
          ? "border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/10"
          : "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
      }`}
    >
      {onToggleComplete && (
        <button
          onClick={handleToggleComplete}
          className="mt-1 flex-shrink-0"
          aria-label={task.completed ? "Marquer comme non complétée" : "Marquer comme complétée"}
        >
          <CheckCircle2
            className={`h-5 w-5 ${
              task.completed
                ? "text-[hsl(var(--success))]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--success))]"
            }`}
          />
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3
              className={`font-medium ${
                task.completed
                  ? "line-through text-[hsl(var(--muted-foreground))]"
                  : isOverdue
                  ? "text-[hsl(var(--destructive))]"
                  : "text-[hsl(var(--foreground))]"
              }`}
            >
              {task.title}
            </h3>
            {task.description && (
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))] line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* Badge Priorité */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}
          >
            <AlertCircle className="h-3 w-3" />
            {priorityLabels[task.priority]}
          </span>

          {/* Badge Contexte */}
          <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--foreground))]">
            <ContextIcon className="h-3 w-3" />
            {contextLabels[task.context]}
          </span>

          {/* Durée estimée */}
          {task.estimatedDuration && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--primary))]/10 px-2 py-0.5 text-xs font-medium text-[hsl(var(--primary))]">
              <Clock className="h-3 w-3" />
              {task.estimatedDuration} min
            </span>
          )}

          {/* Niveau d'énergie */}
          {task.energyLevel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--accent))]/10 px-2 py-0.5 text-xs font-medium text-[hsl(var(--accent))]">
              <Zap className="h-3 w-3" />
              {task.energyLevel === "HIGH" ? "Élevé" : task.energyLevel === "MEDIUM" ? "Moyen" : "Faible"}
            </span>
          )}

          {/* Date d'échéance */}
          {task.due && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                isOverdue
                  ? "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]"
                  : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
              }`}
            >
              📅 {format(new Date(task.due), "PPP")}
              {isOverdue && " (En retard)"}
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(task)}
          className="h-8 w-8"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(task.id)}
          className="h-8 w-8 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
