"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CheckSquare2, ArrowRight, AlertCircle, Clock, Zap, Briefcase, ShoppingBag, Heart, Wallet, Home, Users, BookOpen, MoreHorizontal } from "lucide-react";
import type { Task, TaskPriority, TaskContext } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/app/lib/utils";

interface TasksListProps {
  tasks: Task[];
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
  HIGH: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-400",
  MEDIUM: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-400",
  LOW: "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-400",
};

export function TasksList({ tasks }: TasksListProps) {
  const activeTasks = tasks.filter(t => !t.completed);
  const highPriorityTasks = activeTasks.filter(t => t.priority === "HIGH");
  const overdueTasks = activeTasks.filter(t => t.due && new Date(t.due) < new Date());

  if (tasks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckSquare2 className="h-10 w-10 text-[hsl(var(--muted-foreground))]" />
            <div>
              <h3 className="font-semibold text-lg text-[hsl(var(--foreground))]">Tâches</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Aucune tâche en cours</p>
            </div>
          </div>
        </div>
        <Link href="/tasks">
          <Button variant="outline" className="w-full">
            Créer une tâche
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec statistiques */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <CheckSquare2 className="h-10 w-10 text-blue-500" />
            {highPriorityTasks.length > 0 && (
              <>
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
              </>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-[hsl(var(--foreground))]">Tâches</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {activeTasks.length} active{activeTasks.length > 1 ? "s" : ""}
              {highPriorityTasks.length > 0 && ` • ${highPriorityTasks.length} prioritaire${highPriorityTasks.length > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <Link href="/tasks">
          <Button variant="ghost" size="sm">
            Voir tout
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Alertes */}
      {overdueTasks.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-700 dark:text-red-400" />
            <p className="text-sm font-medium text-red-900 dark:text-red-300">
              {overdueTasks.length} tâche{overdueTasks.length > 1 ? "s" : ""} en retard
            </p>
          </div>
        </div>
      )}

      {/* Liste des tâches avec animations */}
      <div className="space-y-2">
        {activeTasks.slice(0, 5).map((task, index) => {
          const ContextIcon = contextIcons[task.context];
          const isOverdue = task.due && new Date(task.due) < new Date();
          
          return (
            <div
              key={task.id}
              className={cn(
                "group relative p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02] hover:shadow-md animate-in fade-in slide-in-from-bottom-4",
                isOverdue
                  ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                  : "border-[hsl(var(--border))] bg-[hsl(var(--card))] dark:bg-gradient-to-br dark:from-zinc-800/50 dark:to-blue-950/20",
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-3">
                <CheckSquare2 className={cn(
                  "mt-0.5 h-4 w-4 flex-shrink-0 transition-colors",
                  task.completed ? "text-green-500" : "text-[hsl(var(--muted-foreground))] group-hover:text-green-500"
                )} />
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    "font-medium text-sm line-clamp-1",
                    isOverdue ? "text-red-900 dark:text-red-400" : "text-[hsl(var(--foreground))]"
                  )}>
                    {task.title}
                  </h4>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {/* Badge Priorité */}
                    <Badge variant="outline" className={cn("text-xs px-1.5 py-0.5", priorityColors[task.priority])}>
                      <AlertCircle className="h-2.5 w-2.5 mr-1" />
                      {task.priority === "HIGH" ? "Haute" : task.priority === "MEDIUM" ? "Moyenne" : "Basse"}
                    </Badge>
                    {/* Badge Contexte */}
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      <ContextIcon className="h-2.5 w-2.5 mr-1" />
                      {contextLabels[task.context]}
                    </Badge>
                    {/* Durée */}
                    {task.estimatedDuration && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                        <Clock className="h-2.5 w-2.5 mr-1" />
                        {task.estimatedDuration}min
                      </Badge>
                    )}
                    {/* Date d'échéance */}
                    {task.due && (
                      <Badge variant="outline" className={cn(
                        "text-xs px-1.5 py-0.5",
                        isOverdue && "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"
                      )}>
                        {format(new Date(task.due), "dd/MM")}
                        {isOverdue && " ⚠️"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activeTasks.length > 5 && (
        <Link href="/tasks">
          <Button variant="outline" className="w-full">
            Voir {activeTasks.length - 5} tâche{activeTasks.length - 5 > 1 ? "s" : ""} de plus
          </Button>
        </Link>
      )}
    </div>
  );
}
