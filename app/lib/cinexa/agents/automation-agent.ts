/**
 * Agent Automatisation
 * 
 * Responsabilités :
 * - Créer des règles d'automatisation
 * - Modifier des automatisations existantes
 * - Supprimer des automatisations
 * - Lister les automatisations
 * 
 * ⚠️ IMPORTANT : Aucune IA ici. Juste de la logique métier.
 */

import type { AgentInput, AgentOutput } from "../types";
import { createServerComponentClient } from "@/app/lib/supabase/server-client";

/**
 * Agent automatisation principal
 */
export async function automationAgent(input: AgentInput): Promise<AgentOutput> {
  const { action, parameters, userId } = input;

  try {
    switch (action) {
      case "create_rule":
        return await createAutomation(userId, parameters);
      
      case "update_rule":
        return await updateAutomation(userId, parameters);
      
      case "delete_rule":
        return await deleteAutomation(userId, parameters);
      
      case "list_rules":
        return await listAutomations(userId);
      
      default:
        return {
          success: false,
          error: `Action non supportée: ${action}`,
        };
    }
  } catch (error) {
    console.error("[Automation Agent] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Crée une automatisation
 */
async function createAutomation(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const { name, trigger, actions, conditions } = params;

  if (!name || !trigger || !actions) {
    return {
      success: false,
      error: "name, trigger et actions requis",
    };
  }

  const supabase = await createServerComponentClient();

  try {
    const { data, error } = await supabase
      .from("Routine")
      .insert({
        userId,
        name,
        triggerType: trigger.type,
        triggerValue: trigger.value,
        actions: actions,
        conditions: conditions || null,
        active: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      result: {
        routineId: data.id,
        name: data.name,
      },
      logs: [`Automatisation "${name}" créée`],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur création automatisation",
    };
  }
}

/**
 * Met à jour une automatisation
 */
async function updateAutomation(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const { routineId, updates } = params;

  if (!routineId || !updates) {
    return {
      success: false,
      error: "routineId et updates requis",
    };
  }

  const supabase = await createServerComponentClient();

  try {
    const { data, error } = await supabase
      .from("Routine")
      .update(updates)
      .eq("id", routineId)
      .eq("userId", userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      result: {
        routineId: data.id,
        name: data.name,
      },
      logs: [`Automatisation "${data.name}" mise à jour`],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur mise à jour automatisation",
    };
  }
}

/**
 * Supprime une automatisation
 */
async function deleteAutomation(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const { routineId } = params;

  if (!routineId) {
    return {
      success: false,
      error: "routineId requis",
    };
  }

  const supabase = await createServerComponentClient();

  try {
    const { error } = await supabase
      .from("Routine")
      .delete()
      .eq("id", routineId)
      .eq("userId", userId);

    if (error) {
      throw error;
    }

    return {
      success: true,
      logs: [`Automatisation supprimée`],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur suppression automatisation",
    };
  }
}

/**
 * Liste les automatisations
 */
async function listAutomations(userId: string): Promise<AgentOutput> {
  const supabase = await createServerComponentClient();

  try {
    const { data, error } = await supabase
      .from("Routine")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    if (error) {
      throw error;
    }

    return {
      success: true,
      result: {
        automations: data || [],
        count: data?.length || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur récupération automatisations",
    };
  }
}
