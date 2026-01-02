/**
 * Service de suggestions proactives de Synexa
 * Génère des suggestions contextuelles basées sur les patterns, l'heure, et les données utilisateur
 */

import prisma from "@/app/lib/prisma";
import { analyzeRecentPatterns } from "@/app/lib/learning/tracker";
import { detectPatterns } from "@/app/lib/learning/patterns";
import { getPersonalizedRecommendations } from "@/app/lib/learning/recommendations";

export interface ProactiveSuggestion {
  id: string;
  type: "task" | "event" | "routine" | "reminder" | "optimization" | "insight";
  title: string;
  message: string; // Message de Synexa pour présenter la suggestion
  priority: "high" | "medium" | "low";
  confidence: number;
  action?: {
    type: string;
    data: any;
  };
  context: {
    reason: string;
    basedOn: string[]; // Sur quoi se base cette suggestion
  };
  timestamp: Date;
}

/**
 * Génère des suggestions proactives pour l'utilisateur
 * Analyse le contexte actuel (heure, tâches, patterns) pour proposer des actions
 */
export async function generateProactiveSuggestions(
  userId: string
): Promise<ProactiveSuggestion[]> {
  try {
    const suggestions: ProactiveSuggestion[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // 1. Analyser les tâches en retard
    const overdueTasks = await prisma.task.findMany({
      where: {
        userId,
        completed: false,
        due: {
          lt: now,
        },
      },
      orderBy: {
        priority: "desc",
      },
      take: 5,
    });

    if (overdueTasks.length > 0) {
      const highPriorityOverdue = overdueTasks.filter((t) => t.priority === "HIGH");
      if (highPriorityOverdue.length > 0) {
        suggestions.push({
          id: `overdue-${highPriorityOverdue[0].id}`,
          type: "task",
          title: "Tâche importante en retard",
          message: `Je remarque que vous avez ${highPriorityOverdue.length} tâche${highPriorityOverdue.length > 1 ? "s" : ""} importante${highPriorityOverdue.length > 1 ? "s" : ""} en retard. Souhaitez-vous que je vous aide à les planifier ?`,
          priority: "high",
          confidence: 0.95,
          action: {
            type: "view_tasks",
            data: { filter: "overdue", priority: "HIGH" },
          },
          context: {
            reason: `${highPriorityOverdue.length} tâche(s) haute priorité en retard`,
            basedOn: ["Tâches en retard", "Priorité"],
          },
          timestamp: now,
        });
      }
    }

    // 2. Analyser les tâches du jour qui ne sont pas complétées
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayTasks = await prisma.task.findMany({
      where: {
        userId,
        completed: false,
        due: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

      if (todayTasks.length > 0) {
      const completionRate = todayTasks.filter((t) => t.completed).length / todayTasks.length;
      if (completionRate < 0.5 && currentHour >= 14) {
        suggestions.push({
          id: `today-tasks-${now.toISOString()}`,
          type: "task",
          title: "Tâches du jour à compléter",
          message: `Il vous reste ${todayTasks.length} tâche${todayTasks.length > 1 ? "s" : ""} à faire aujourd'hui. Voulez-vous que je vous aide à les organiser ?`,
          priority: "medium",
          confidence: 0.8,
          action: {
            type: "view_tasks",
            data: { filter: "today" },
          },
          context: {
            reason: `${todayTasks.length} tâche(s) restante(s) aujourd'hui`,
            basedOn: ["Tâches du jour", "Heure actuelle"],
          },
          timestamp: now,
        });
      }
    }

    // 3. Suggestions basées sur les patterns d'heures préférées
    const patterns = await detectPatterns(userId);
    const preferredHoursPattern = patterns.find((p) => p.pattern === "preferred_hours");
    
    if (preferredHoursPattern) {
      const metadata = preferredHoursPattern.metadata as any;
      const preferredHours = metadata.hours || [];
      
      if (preferredHours.length > 0 && !preferredHours.includes(currentHour)) {
        const nextPreferredHour = preferredHours.find((h: number) => h > currentHour) || preferredHours[0];
        const hoursUntil = nextPreferredHour > currentHour 
          ? nextPreferredHour - currentHour 
          : (24 - currentHour) + nextPreferredHour;
        
        if (hoursUntil <= 2) {
          suggestions.push({
            id: `preferred-hours-${now.toISOString()}`,
            type: "optimization",
            title: "Heure optimale pour vos tâches",
            message: `D'après vos habitudes, vous êtes généralement plus productif autour de ${nextPreferredHour}h. C'est dans ${hoursUntil} heure${hoursUntil > 1 ? "s" : ""}. Souhaitez-vous que je prépare vos tâches pour cette période ?`,
            priority: "medium",
            confidence: preferredHoursPattern.confidence,
            action: {
              type: "prepare_tasks",
              data: { preferredHour: nextPreferredHour },
            },
            context: {
              reason: `Heure optimale dans ${hoursUntil}h`,
              basedOn: ["Patterns d'activité", "Heures préférées"],
            },
            timestamp: now,
          });
        }
      }
    }

    // 4. Routines suggérées selon l'heure
    const routines = await prisma.routine.findMany({
      where: {
        userId,
        active: true,
      },
      include: {
        logs: {
          orderBy: { executedAt: "desc" },
          take: 10,
        },
      },
    });

      for (const routine of routines) {
      if (routine.logs.length >= 3) {
        const executionHours = routine.logs.map((log) => new Date(log.executedAt).getHours());
        const mostCommonHour = executionHours.reduce(
          (a, b, _, arr) => (arr.filter((v) => v === a).length >= arr.filter((v) => v === b).length ? a : b),
          executionHours[0]
        );

        // Vérifier si c'est le bon moment pour exécuter la routine
        if (Math.abs(currentHour - mostCommonHour) <= 1) {
          const lastExecution = routine.logs[0]?.executedAt;
          const daysSinceLastExecution = lastExecution
            ? Math.floor((now.getTime() - new Date(lastExecution).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          if (daysSinceLastExecution >= 1) {
            suggestions.push({
              id: `routine-${routine.id}-${now.toISOString()}`,
              type: "routine",
              title: `Exécuter "${routine.name}"`,
              message: `C'est généralement l'heure où vous exécutez votre routine "${routine.name}". Voulez-vous l'exécuter maintenant ?`,
              priority: "medium",
              confidence: 0.75,
              action: {
                type: "execute_routine",
                data: { routineId: routine.id },
              },
              context: {
                reason: `Routine habituellement exécutée à ${mostCommonHour}h`,
                basedOn: ["Patterns d'exécution", "Heure actuelle"],
              },
              timestamp: now,
            });
          }
        }
      }
    }

    // 5. Tâches récurrentes suggérées
    const recurringTaskPatterns = patterns.filter((p) => p.pattern.startsWith("recurring_task:"));
    
      for (const pattern of recurringTaskPatterns) {
      const metadata = pattern.metadata as any;
      if (metadata && metadata.count >= 3) {
        // Vérifier si cette tâche a déjà été créée récemment
        const recentTasks = await prisma.task.findMany({
          where: {
            userId,
            title: {
              contains: metadata.title,
              mode: "insensitive",
            },
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 derniers jours
            },
          },
        });

        if (recentTasks.length === 0) {
          suggestions.push({
            id: `recurring-${pattern.pattern}-${now.toISOString()}`,
            type: "task",
            title: `Créer "${metadata.title}"`,
            message: `Vous créez régulièrement la tâche "${metadata.title}". Souhaitez-vous la créer maintenant ?`,
            priority: "high",
            confidence: pattern.confidence,
            action: {
              type: "create_task",
              data: {
                title: metadata.title,
                context: metadata.preferredContext || "PERSONAL",
                priority: metadata.preferredPriority || "MEDIUM",
                estimatedDuration: metadata.averageDuration || null,
              },
            },
            context: {
              reason: `Créée ${metadata.count} fois récemment`,
              basedOn: ["Tâches récurrentes", "Patterns d'utilisation"],
            },
            timestamp: now,
          });
        }
      }
    }

    // 6. Insights et optimisations
    const recentPatterns = await analyzeRecentPatterns(userId, 7);
    
    if (recentPatterns.completionRate < 0.6 && recentPatterns.completionRate > 0) {
      suggestions.push({
        id: `insight-completion-${now.toISOString()}`,
        type: "insight",
        title: "Insight sur votre productivité",
        message: `J'ai remarqué que vous complétez ${Math.round(recentPatterns.completionRate * 100)}% de vos tâches. Voulez-vous que je vous suggère des moyens d'améliorer cela ?`,
        priority: "low",
        confidence: 0.7,
        action: {
          type: "view_insights",
          data: { metric: "completion_rate" },
        },
        context: {
          reason: `Taux de complétion: ${Math.round(recentPatterns.completionRate * 100)}%`,
          basedOn: ["Analyse des 7 derniers jours"],
        },
        timestamp: now,
      });
    }

    // 7. Événements à venir (dans les 2 prochaines heures)
    try {
      const upcomingEvents = await prisma.calendarEvent.findMany({
        where: {
          userId,
          start: {
            gte: now,
            lte: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 heures
          },
        },
        orderBy: {
          start: "asc",
        },
        take: 3,
      });

      if (upcomingEvents.length > 0) {
        const nextEvent = upcomingEvents[0];
        const minutesUntil = Math.floor((new Date(nextEvent.start).getTime() - now.getTime()) / (1000 * 60));
        
        if (minutesUntil <= 60 && minutesUntil > 0) {
          suggestions.push({
            id: `upcoming-event-${nextEvent.id}`,
            type: "event",
            title: `Événement à venir: ${nextEvent.title}`,
            message: `Vous avez "${nextEvent.title}" dans ${minutesUntil} minute${minutesUntil > 1 ? "s" : ""}. Souhaitez-vous que je vous prépare un rappel ?`,
            priority: "high",
            confidence: 0.9,
            action: {
              type: "view_event",
              data: { eventId: nextEvent.id },
            },
            context: {
              reason: `Événement dans ${minutesUntil} minutes`,
              basedOn: ["Calendrier", "Heure actuelle"],
            },
            timestamp: now,
          });
        }
      }
    } catch (error) {
      // Ignorer silencieusement les erreurs de récupération d'événements
      // pour ne pas bloquer les autres suggestions
    }

    // Trier par priorité et confiance
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
  } catch (error) {
    // En cas d'erreur, retourner un tableau vide plutôt que de planter
    // Les erreurs sont loggées par l'API
    return [];
  }
}

/**
 * Génère un message conversationnel de Synexa pour présenter une suggestion
 */
export function generateSuggestionMessage(suggestion: ProactiveSuggestion): string {
  return suggestion.message;
}



