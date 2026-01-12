/**
 * Service de mémoire pour Cinexa
 * 
 * Responsabilités :
 * - Logger les exécutions
 * - Mettre à jour la mémoire long terme
 * - Gérer les résumés pour éviter les coûts
 */

import { saveMemory } from "./supabase-service";
import type { CinexaIntent, CinexaPlan, CinexaMemory, CinexaSource } from "../types";
import type { AgentOutput } from "../types";

interface ExecutionLog {
  userId: string;
  intent: CinexaIntent;
  plan: CinexaPlan;
  steps: Array<{
    step: any;
    output: AgentOutput;
    duration: number;
  }>;
  source: CinexaSource;
  duration: number;
}

/**
 * Log une exécution complète
 */
export async function logExecution(log: ExecutionLog): Promise<void> {
  try {
    // TODO: Implémenter la table ExecutionLog dans Supabase si nécessaire
    // Pour l'instant, on log juste dans la console
    console.log("[Cinexa Memory] Exécution loggée:", {
      userId: log.userId,
      intent: log.intent.intent,
      agents: log.intent.requiredAgents,
      duration: log.duration,
      success: log.steps.every(s => s.output.success),
    });
  } catch (error) {
    console.error("[Cinexa Memory] Erreur logging:", error);
  }
}

/**
 * Met à jour la mémoire long terme avec un résumé
 */
export async function updateMemory(
  userId: string,
  memory: Omit<CinexaMemory, "id" | "userId">
): Promise<void> {
  try {
    await saveMemory(userId, {
      ...memory,
      timestamp: memory.timestamp || new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cinexa Memory] Erreur mise à jour mémoire:", error);
  }
}

/**
 * Génère un résumé intelligent d'une exécution
 * (pour économiser les tokens dans les prochaines requêtes)
 */
export function summarizeExecution(
  intent: CinexaIntent,
  plan: CinexaPlan,
  steps: Array<{ step: any; output: AgentOutput; duration: number }>
): string {
  const successCount = steps.filter(s => s.output.success).length;
  const totalCount = steps.length;
  
  return `Intent: ${intent.intent} | Agents: ${intent.requiredAgents.join(", ")} | Résultat: ${successCount}/${totalCount} succès`;
}
