/**
 * Service de suggestions intelligentes de regroupement pour les tâches
 * Analyse les patterns et suggère les meilleurs moyens de regrouper les tâches
 */

import prisma from "@/app/lib/prisma";
import type { TaskContext, TaskPriority, Task } from "@prisma/client";

export interface GroupingSuggestion {
  type: "priority" | "context" | "due" | "energy" | "duration";
  label: string;
  reason: string;
  confidence: number; // 0-1
  tasksCount: number;
}

/**
 * Génère des suggestions de regroupement intelligentes pour les tâches d'un utilisateur
 */
export async function getGroupingSuggestions(
  userId: string
): Promise<GroupingSuggestion[]> {
  const suggestions: GroupingSuggestion[] = [];
  
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      completed: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (tasks.length < 3) {
    return suggestions; // Pas assez de tâches pour suggérer un regroupement
  }

  // 1. Suggestion par priorité
  const priorityCounts: Record<TaskPriority, number> = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  tasks.forEach((t: Task) => {
    const priority = t.priority as TaskPriority;
    priorityCounts[priority]++;
  });
  
  const hasMultiplePriorities = Object.values(priorityCounts).filter(c => c > 0).length > 1;
  if (hasMultiplePriorities && priorityCounts.HIGH > 0) {
    suggestions.push({
      type: "priority",
      label: "Par priorité",
      reason: `${priorityCounts.HIGH} tâche${priorityCounts.HIGH > 1 ? "s" : ""} haute priorité à traiter en premier`,
      confidence: priorityCounts.HIGH >= 3 ? 0.9 : 0.7,
      tasksCount: tasks.length,
    });
  }

  // 2. Suggestion par contexte
  const contextCounts: Record<TaskContext, number> = {
    WORK: 0,
    PERSONAL: 0,
    SHOPPING: 0,
    HEALTH: 0,
    FINANCE: 0,
    HOME: 0,
    SOCIAL: 0,
    LEARNING: 0,
    OTHER: 0,
  };
  tasks.forEach((t: Task) => {
    const context = t.context as TaskContext;
    contextCounts[context]++;
  });
  
  const contextsWithMultipleTasks = Object.entries(contextCounts)
    .filter(([_, count]) => count >= 2)
    .map(([context]) => context);
  
  if (contextsWithMultipleTasks.length > 1) {
    const topContext = Object.entries(contextCounts)
      .sort(([, a], [, b]) => b - a)[0];
    
    suggestions.push({
      type: "context",
      label: "Par contexte",
      reason: `${topContext[1]} tâche${topContext[1] > 1 ? "s" : ""} dans le contexte "${getContextLabel(topContext[0] as TaskContext)}"`,
      confidence: topContext[1] >= 3 ? 0.8 : 0.6,
      tasksCount: tasks.length,
    });
  }

  // 3. Suggestion par date d'échéance
  const tasksWithDue = tasks.filter((t: Task) => t.due);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const overdueTasks = tasksWithDue.filter((t: Task) => t.due && new Date(t.due) < today);
  const todayTasks = tasksWithDue.filter((t: Task) => {
    const due = new Date(t.due!);
    due.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime();
  });
  const thisWeekTasks = tasksWithDue.filter((t: Task) => {
    const due = new Date(t.due!);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return due >= today && due <= weekFromNow;
  });

  if (overdueTasks.length > 0 || todayTasks.length > 0 || thisWeekTasks.length >= 3) {
    suggestions.push({
      type: "due",
      label: "Par date d'échéance",
      reason: `${overdueTasks.length > 0 ? `${overdueTasks.length} en retard, ` : ""}${todayTasks.length > 0 ? `${todayTasks.length} aujourd'hui, ` : ""}${thisWeekTasks.length} cette semaine`,
      confidence: overdueTasks.length > 0 ? 0.95 : todayTasks.length > 0 ? 0.85 : 0.7,
      tasksCount: tasksWithDue.length,
    });
  }

  // 4. Suggestion par niveau d'énergie
  const energyCounts: Record<string, number> = {};
  tasks.forEach((t: Task) => {
    if (t.energyLevel) {
      energyCounts[t.energyLevel] = (energyCounts[t.energyLevel] || 0) + 1;
    }
  });
  
  const hasMultipleEnergyLevels = Object.keys(energyCounts).length > 1;
  if (hasMultipleEnergyLevels) {
    suggestions.push({
      type: "energy",
      label: "Par niveau d'énergie",
      reason: "Groupez les tâches selon votre niveau d'énergie disponible",
      confidence: 0.6,
      tasksCount: tasks.filter((t: Task) => t.energyLevel).length,
    });
  }

  // 5. Suggestion par durée
  const tasksWithDuration = tasks.filter((t: Task) => t.estimatedDuration);
  const shortTasks = tasksWithDuration.filter((t: Task) => (t.estimatedDuration || 0) <= 15);
  const mediumTasks = tasksWithDuration.filter((t: Task) => (t.estimatedDuration || 0) > 15 && (t.estimatedDuration || 0) <= 60);
  const longTasks = tasksWithDuration.filter((t: Task) => (t.estimatedDuration || 0) > 60);

  if (shortTasks.length >= 2 || mediumTasks.length >= 2 || longTasks.length >= 2) {
    suggestions.push({
      type: "duration",
      label: "Par durée",
      reason: `${shortTasks.length} courtes (≤15min), ${mediumTasks.length} moyennes (15-60min), ${longTasks.length} longues (>60min)`,
      confidence: (shortTasks.length + mediumTasks.length + longTasks.length) >= 5 ? 0.7 : 0.5,
      tasksCount: tasksWithDuration.length,
    });
  }

  // Trier par confiance
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

function getContextLabel(context: TaskContext): string {
  const labels: Record<TaskContext, string> = {
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
  return labels[context];
}



