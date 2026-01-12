/**
 * Cinexa Core Agent - Orchestrateur principal
 * 
 * Responsabilités :
 * - Analyser l'intention utilisateur
 * - Charger le contexte depuis Supabase
 * - Décider quel(s) agent(s) appeler
 * - Superviser l'exécution
 * - Logger et mettre à jour la mémoire
 * 
 * ⚠️ IMPORTANT : Cinexa Core ne fait JAMAIS l'action lui-même.
 * Il orchestre uniquement.
 */

import type {
  CinexaIntent,
  CinexaPlan,
  CinexaUserContext,
  CinexaExecutionResult,
  AgentInput,
  AgentOutput,
  CinexaSource,
} from "./types";
import { loadUserContext } from "./services/supabase-service";
import { analyzeIntent, buildPlan } from "./services/grok-service";
import { executeAgent } from "./agents/registry";
import { logExecution, updateMemory } from "./services/memory-service";

/**
 * Point d'entrée principal du Cinexa Core Agent
 * 
 * @param userId - ID de l'utilisateur
 * @param message - Message de l'utilisateur
 * @param source - Source de la requête
 * @returns Résultat de l'exécution avec message utilisateur
 */
export async function handleUserMessage(
  userId: string,
  message: string,
  source: CinexaSource = "dashboard"
): Promise<CinexaExecutionResult> {
  const startTime = Date.now();

  try {
    // 1. Charger le contexte utilisateur depuis Supabase
    const context = await loadUserContext(userId, {
      includeDevices: true,
      includeAutomations: true,
      includeCalendar: true,
      includeMemory: true,
      maxMemoryTokens: 800, // Limiter la mémoire pour éviter les coûts
    });

    // 2. Analyser l'intention avec Grok
    const intent = await analyzeIntent({
      message,
      context,
      source,
    });

    if (!intent || intent.confidence < 0.5) {
      // Intention non claire, demander clarification
      return {
        intent: intent || {
          intent: "clarification_needed",
          confidence: 0,
          requiredAgents: [],
          requiredData: [],
        },
        plan: {
          intent: "clarification_needed",
          steps: [],
        },
        steps: [],
        totalDuration: Date.now() - startTime,
        success: false,
        userMessage: "Je n'ai pas bien compris votre demande. Pouvez-vous reformuler ?",
      };
    }

    // 3. Charger les données requises par l'intention
    const enrichedContext = await enrichContext(context, intent.requiredData);

    // 4. Construire le plan d'action avec Grok
    const plan = await buildPlan({
      intent,
      context: enrichedContext,
    });

    // 5. Exécuter le plan étape par étape
    const executionSteps = await executePlan(plan, enrichedContext);

    // 6. Logger l'exécution
    await logExecution({
      userId,
      intent,
      plan,
      steps: executionSteps,
      source,
      duration: Date.now() - startTime,
    });

    // 7. Mettre à jour la mémoire long terme (résumé)
    await updateMemory(userId, {
      intent: intent.intent,
      agents: intent.requiredAgents,
      summary: generateMemorySummary(intent, plan, executionSteps),
      result: executionSteps.every(s => s.output.success) ? "success" : "partial",
    });

    // 8. Formater la réponse utilisateur
    const userMessage = formatUserResponse(intent, plan, executionSteps);

    return {
      intent,
      plan,
      steps: executionSteps,
      totalDuration: Date.now() - startTime,
      success: executionSteps.every(s => s.output.success),
      userMessage,
    };
  } catch (error) {
    console.error("[Cinexa Core] Erreur:", error);
    
    return {
      intent: {
        intent: "error",
        confidence: 0,
        requiredAgents: [],
        requiredData: [],
      },
      plan: {
        intent: "error",
        steps: [],
      },
      steps: [],
      totalDuration: Date.now() - startTime,
      success: false,
      userMessage: "Une erreur est survenue. Veuillez réessayer.",
    };
  }
}

/**
 * Enrichit le contexte avec les données requises par l'intention
 */
async function enrichContext(
  context: CinexaUserContext,
  requiredData: string[]
): Promise<CinexaUserContext> {
  // Charger les données supplémentaires si nécessaire
  // Ex: devices, automations, calendar, etc.
  
  // Pour l'instant, retourner le contexte tel quel
  // Cette fonction sera étendue selon les besoins
  return context;
}

/**
 * Exécute un plan étape par étape
 */
async function executePlan(
  plan: CinexaPlan,
  context: CinexaUserContext
): Promise<Array<{ step: CinexaPlanStep; output: AgentOutput; duration: number }>> {
  const results: Array<{ step: CinexaPlanStep; output: AgentOutput; duration: number }> = [];

  for (const step of plan.steps) {
    const stepStartTime = Date.now();

    try {
      // Construire l'input pour l'agent
      const agentInput: AgentInput = {
        userId: context.userId,
        action: step.action,
        parameters: step.input,
        context,
        metadata: {
          source: "cinexa_core",
          timestamp: new Date().toISOString(),
        },
      };

      // Exécuter l'agent
      const output = await executeAgent(step.agent, agentInput);

      results.push({
        step,
        output,
        duration: Date.now() - stepStartTime,
      });

      // Si une étape échoue et qu'elle est critique, arrêter l'exécution
      if (!output.success && !output.requiresUserConfirmation) {
        console.warn(`[Cinexa Core] Étape échouée: ${step.agent}.${step.action}`);
        // Continuer ou arrêter selon la stratégie
      }
    } catch (error) {
      console.error(`[Cinexa Core] Erreur exécution étape ${step.agent}:`, error);
      
      results.push({
        step,
        output: {
          success: false,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        },
        duration: Date.now() - stepStartTime,
      });
    }
  }

  return results;
}

/**
 * Génère un résumé pour la mémoire long terme
 */
function generateMemorySummary(
  intent: CinexaIntent,
  plan: CinexaPlan,
  steps: Array<{ step: CinexaPlanStep; output: AgentOutput; duration: number }>
): string {
  const successCount = steps.filter(s => s.output.success).length;
  const totalCount = steps.length;
  
  return `Intent: ${intent.intent} | Agents: ${intent.requiredAgents.join(", ")} | Résultat: ${successCount}/${totalCount} succès`;
}

/**
 * Formate la réponse pour l'utilisateur
 */
function formatUserResponse(
  intent: CinexaIntent,
  plan: CinexaPlan,
  steps: Array<{ step: CinexaPlanStep; output: AgentOutput; duration: number }>
): string {
  const successSteps = steps.filter(s => s.output.success);
  const failedSteps = steps.filter(s => !s.output.success);

  if (failedSteps.length === 0) {
    // Toutes les étapes ont réussi
    return generateSuccessMessage(intent, successSteps);
  } else if (successSteps.length > 0) {
    // Succès partiel
    return `J'ai exécuté ${successSteps.length} action(s) avec succès. ${failedSteps.length} action(s) ont échoué.`;
  } else {
    // Toutes les étapes ont échoué
    return "Je n'ai pas pu exécuter votre demande. Veuillez réessayer ou vérifier vos permissions.";
  }
}

/**
 * Génère un message de succès selon l'intention
 */
function generateSuccessMessage(
  intent: CinexaIntent,
  steps: Array<{ step: CinexaPlanStep; output: AgentOutput; duration: number }>
): string {
  // Messages personnalisés selon l'intention
  switch (intent.intent) {
    case "control_device":
      return "✅ Action exécutée avec succès.";
    case "create_automation":
      return "✅ Automatisation créée avec succès.";
    case "check_calendar":
      return "📅 Voici vos événements à venir.";
    default:
      return "✅ Votre demande a été traitée avec succès.";
  }
}
