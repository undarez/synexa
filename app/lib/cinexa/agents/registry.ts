/**
 * Registre des agents spécialisés
 * 
 * Centralise l'exécution des agents et garantit la cohérence
 */

import type { AgentInput, AgentOutput, AgentConfig } from "../types";
import { domoticAgent } from "./domotic-agent";
import { automationAgent } from "./automation-agent";
import { calendarAgent } from "./calendar-agent";
import { securityAgent } from "./security-agent";
import { financeAgent } from "./finance-agent";

/**
 * Registre des agents disponibles
 */
const agentRegistry = new Map<string, (input: AgentInput) => Promise<AgentOutput>>([
  ["domotic_agent", domoticAgent],
  ["automation_agent", automationAgent],
  ["calendar_agent", calendarAgent],
  ["security_agent", securityAgent],
  ["finance_agent", financeAgent],
]);

/**
 * Configuration des agents
 */
export const agentConfigs: Map<string, AgentConfig> = new Map([
  [
    "domotic_agent",
    {
      name: "Domotic Agent",
      description: "Contrôle des devices domotiques (lumières, prises, etc.)",
      capabilities: ["turn_on", "turn_off", "set_value", "get_status"],
      requiredPermissions: ["domotique:control"],
      maxExecutionTime: 10,
    },
  ],
  [
    "automation_agent",
    {
      name: "Automation Agent",
      description: "Création et gestion d'automatisations",
      capabilities: ["create_rule", "update_rule", "delete_rule", "list_rules"],
      requiredPermissions: ["automation:manage"],
      maxExecutionTime: 15,
    },
  ],
  [
    "calendar_agent",
    {
      name: "Calendar Agent",
      description: "Gestion du calendrier et événements",
      capabilities: ["create_event", "update_event", "delete_event", "list_events"],
      requiredPermissions: ["calendar:manage"],
      maxExecutionTime: 10,
    },
  ],
  [
    "security_agent",
    {
      name: "Security Agent",
      description: "Sécurité et monitoring",
      capabilities: ["check_security", "log_event", "alert"],
      requiredPermissions: ["security:read"],
      maxExecutionTime: 5,
    },
  ],
  [
    "finance_agent",
    {
      name: "Finance Agent",
      description: "Gestion financière",
      capabilities: ["add_expense", "add_income", "get_summary"],
      requiredPermissions: ["finance:manage"],
      maxExecutionTime: 10,
    },
  ],
]);

/**
 * Exécute un agent spécialisé
 */
export async function executeAgent(
  agentName: string,
  input: AgentInput
): Promise<AgentOutput> {
  const agent = agentRegistry.get(agentName);

  if (!agent) {
    return {
      success: false,
      error: `Agent inconnu: ${agentName}`,
    };
  }

  // Vérifier les permissions
  const config = agentConfigs.get(agentName);
  if (config?.requiredPermissions) {
    // TODO: Implémenter la vérification des permissions
    // const hasPermissions = await checkPermissions(input.userId, config.requiredPermissions);
    // if (!hasPermissions) {
    //   return { success: false, error: "Permissions insuffisantes" };
    // }
  }

  // Exécuter l'agent avec timeout
  const timeout = config?.maxExecutionTime || 30;
  
  try {
    const result = await Promise.race([
      agent(input),
      new Promise<AgentOutput>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), timeout * 1000)
      ),
    ]);

    return result;
  } catch (error) {
    console.error(`[Agent Registry] Erreur exécution ${agentName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Liste tous les agents disponibles
 */
export function listAgents(): string[] {
  return Array.from(agentRegistry.keys());
}

/**
 * Obtient la configuration d'un agent
 */
export function getAgentConfig(agentName: string): AgentConfig | undefined {
  return agentConfigs.get(agentName);
}
