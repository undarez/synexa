/**
 * Agent Calendrier
 * 
 * Responsabilités :
 * - Créer des événements
 * - Modifier des événements
 * - Supprimer des événements
 * - Lister les événements
 * 
 * ⚠️ IMPORTANT : Aucune IA ici. Juste de la logique métier.
 */

import type { AgentInput, AgentOutput } from "../types";
import { createServerComponentClient } from "@/app/lib/supabase/server-client";

/**
 * Agent calendrier principal
 */
export async function calendarAgent(input: AgentInput): Promise<AgentOutput> {
  const { action, parameters, userId } = input;

  try {
    switch (action) {
      case "create_event":
        return await createEvent(userId, parameters);
      
      case "update_event":
        return await updateEvent(userId, parameters);
      
      case "delete_event":
        return await deleteEvent(userId, parameters);
      
      case "list_events":
        return await listEvents(userId, parameters);
      
      default:
        return {
          success: false,
          error: `Action non supportée: ${action}`,
        };
    }
  } catch (error) {
    console.error("[Calendar Agent] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Crée un événement
 */
async function createEvent(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const { title, startTime, endTime, description, location } = params;

  if (!title || !startTime) {
    return {
      success: false,
      error: "title et startTime requis",
    };
  }

  const supabase = await createServerComponentClient();

  try {
    const { data, error } = await supabase
      .from("CalendarEvent")
      .insert({
        userId,
        title,
        startTime,
        endTime: endTime || startTime,
        description: description || null,
        location: location || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      result: {
        eventId: data.id,
        title: data.title,
      },
      logs: [`Événement "${title}" créé`],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur création événement",
    };
  }
}

/**
 * Met à jour un événement
 */
async function updateEvent(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const { eventId, updates } = params;

  if (!eventId || !updates) {
    return {
      success: false,
      error: "eventId et updates requis",
    };
  }

  const supabase = await createServerComponentClient();

  try {
    const { data, error } = await supabase
      .from("CalendarEvent")
      .update(updates)
      .eq("id", eventId)
      .eq("userId", userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      result: {
        eventId: data.id,
        title: data.title,
      },
      logs: [`Événement "${data.title}" mis à jour`],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur mise à jour événement",
    };
  }
}

/**
 * Supprime un événement
 */
async function deleteEvent(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const { eventId } = params;

  if (!eventId) {
    return {
      success: false,
      error: "eventId requis",
    };
  }

  const supabase = await createServerComponentClient();

  try {
    const { error } = await supabase
      .from("CalendarEvent")
      .delete()
      .eq("id", eventId)
      .eq("userId", userId);

    if (error) {
      throw error;
    }

    return {
      success: true,
      logs: [`Événement supprimé`],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur suppression événement",
    };
  }
}

/**
 * Liste les événements
 */
async function listEvents(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const { startDate, endDate, limit } = params;

  const supabase = await createServerComponentClient();

  try {
    let query = supabase
      .from("CalendarEvent")
      .select("*")
      .eq("userId", userId)
      .order("startTime", { ascending: true });

    if (startDate) {
      query = query.gte("startTime", startDate);
    }

    if (endDate) {
      query = query.lte("startTime", endDate);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return {
      success: true,
      result: {
        events: data || [],
        count: data?.length || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur récupération événements",
    };
  }
}
