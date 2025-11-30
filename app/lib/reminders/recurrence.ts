/**
 * Gestion des rappels récurrents
 */

export type RecurrenceType = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";

export interface RecurrenceRule {
  type: RecurrenceType;
  interval?: number; // Intervalle (ex: tous les 2 jours = interval: 2, type: "DAILY")
  daysOfWeek?: number[]; // Pour WEEKLY: [1,3,5] = lundi, mercredi, vendredi
  dayOfMonth?: number; // Pour MONTHLY: jour du mois (1-31)
  endDate?: Date; // Date de fin
  count?: number; // Nombre d'occurrences
  cronExpression?: string; // Expression cron personnalisée
}

/**
 * Calcule la prochaine date de récurrence
 */
export function calculateNextRecurrence(
  baseDate: Date,
  rule: RecurrenceRule
): Date | null {
  const nextDate = new Date(baseDate);
  const interval = rule.interval || 1;

  switch (rule.type) {
    case "DAILY":
      nextDate.setDate(nextDate.getDate() + interval);
      break;

    case "WEEKLY":
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        // Trouver le prochain jour de la semaine spécifié
        const currentDay = nextDate.getDay();
        const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b);
        const nextDay = sortedDays.find((day) => day > currentDay) || sortedDays[0];
        const daysToAdd = nextDay > currentDay ? nextDay - currentDay : 7 - currentDay + nextDay;
        nextDate.setDate(nextDate.getDate() + daysToAdd);
      } else {
        nextDate.setDate(nextDate.getDate() + 7 * interval);
      }
      break;

    case "MONTHLY":
      if (rule.dayOfMonth) {
        // Prochain mois avec le même jour
        nextDate.setMonth(nextDate.getMonth() + interval);
        // Ajuster si le jour n'existe pas dans le mois (ex: 31 février)
        const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(rule.dayOfMonth, maxDay));
      } else {
        // Même jour du mois suivant
        nextDate.setMonth(nextDate.getMonth() + interval);
      }
      break;

    case "YEARLY":
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;

    case "CUSTOM":
      // Pour les expressions cron, on utiliserait une bibliothèque comme node-cron
      // Pour l'instant, on retourne null (à implémenter)
      return null;

    default:
      return null;
  }

  // Vérifier la date de fin
  if (rule.endDate && nextDate > rule.endDate) {
    return null;
  }

  return nextDate;
}

/**
 * Parse une règle de récurrence depuis une string
 */
export function parseRecurrenceRule(ruleString: string): RecurrenceRule | null {
  try {
    // Format simple: "DAILY", "WEEKLY", "MONTHLY", "YEARLY"
    if (["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(ruleString)) {
      return { type: ruleString as RecurrenceType };
    }

    // Format avec interval: "DAILY:2" = tous les 2 jours
    const [type, intervalStr] = ruleString.split(":");
    if (["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(type)) {
      return {
        type: type as RecurrenceType,
        interval: intervalStr ? parseInt(intervalStr, 10) : 1,
      };
    }

    // Format JSON
    return JSON.parse(ruleString) as RecurrenceRule;
  } catch {
    return null;
  }
}

/**
 * Formate une règle de récurrence en string
 */
export function formatRecurrenceRule(rule: RecurrenceRule): string {
  if (rule.cronExpression) {
    return JSON.stringify(rule);
  }

  if (rule.interval && rule.interval > 1) {
    return `${rule.type}:${rule.interval}`;
  }

  return JSON.stringify(rule);
}


