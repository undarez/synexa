/**
 * Service de gestion des logs d'événements
 * 
 * Gère l'historique des événements selon le plan d'abonnement
 */

import { createServerComponentClient } from "@/app/lib/supabase/server-client";
import { getUserPlan } from "./subscription-service";
import { getQuotaLimit } from "./pricing-config";

export type EventCategory =
  | "domotique"
  | "automation"
  | "security"
  | "system"
  | "voice"
  | "calendar"
  | "finance"
  | "other";

export type EventType =
  | "device_action"
  | "device_state_change"
  | "automation_triggered"
  | "automation_completed"
  | "security_alert"
  | "security_event"
  | "voice_command"
  | "voice_response"
  | "system_error"
  | "system_info"
  | "calendar_event"
  | "reminder_sent"
  | "other";

export interface EventLog {
  id: string;
  userId: string;
  eventType: EventType;
  category: EventCategory;
  title: string;
  description: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface CreateEventLogParams {
  userId: string;
  eventType: EventType;
  category: EventCategory;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Crée un log d'événement
 */
export async function createEventLog(
  params: CreateEventLogParams
): Promise<EventLog> {
  try {
    const supabase = createServerComponentClient();
    const now = new Date();

    const { data, error } = await supabase
      .from("EventLog")
      .insert({
        id: crypto.randomUUID(),
        userId: params.userId,
        eventType: params.eventType,
        category: params.category,
        title: params.title,
        description: params.description || null,
        metadata: params.metadata || null,
        createdAt: now.toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Erreur création log: ${error?.message || "Unknown error"}`);
    }

    return data as EventLog;
  } catch (error) {
    console.error("[Event Logs Service] Erreur création log:", error);
    throw error;
  }
}

/**
 * Récupère les logs d'événements d'un utilisateur avec filtrage par date selon le plan
 */
export async function getUserEventLogs(
  userId: string,
  options?: {
    category?: EventCategory;
    eventType?: EventType;
    limit?: number;
    offset?: number;
  }
): Promise<EventLog[]> {
  try {
    const supabase = createServerComponentClient();
    const plan = await getUserPlan(userId);
    const historyDays = getQuotaLimit(plan, "historyDays");

    // Calculer la date de début selon le plan
    let startDate: Date | null = null;
    if (historyDays !== -1) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - historyDays);
    }

    let query = supabase
      .from("EventLog")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    // Filtrer par date si nécessaire
    if (startDate) {
      query = query.gte("createdAt", startDate.toISOString());
    }

    // Filtrer par catégorie si spécifiée
    if (options?.category) {
      query = query.eq("category", options.category);
    }

    // Filtrer par type si spécifié
    if (options?.eventType) {
      query = query.eq("eventType", options.eventType);
    }

    // Limiter les résultats
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    // Offset pour la pagination
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erreur récupération logs: ${error.message}`);
    }

    return (data || []) as EventLog[];
  } catch (error) {
    console.error("[Event Logs Service] Erreur récupération logs:", error);
    return [];
  }
}

/**
 * Supprime les logs d'événements plus anciens que la période autorisée
 * (À appeler périodiquement, par exemple via un cron job)
 */
export async function cleanupOldEventLogs(userId: string): Promise<number> {
  try {
    const supabase = createServerComponentClient();
    const plan = await getUserPlan(userId);
    const historyDays = getQuotaLimit(plan, "historyDays");

    // Si l'historique est illimité, ne rien supprimer
    if (historyDays === -1) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - historyDays);

    const { data, error } = await supabase
      .from("EventLog")
      .delete()
      .eq("userId", userId)
      .lt("createdAt", cutoffDate.toISOString())
      .select();

    if (error) {
      throw new Error(`Erreur nettoyage logs: ${error.message}`);
    }

    return data?.length || 0;
  } catch (error) {
    console.error("[Event Logs Service] Erreur nettoyage logs:", error);
    return 0;
  }
}

/**
 * Compte le nombre de logs d'événements d'un utilisateur
 */
export async function countUserEventLogs(
  userId: string,
  category?: EventCategory
): Promise<number> {
  try {
    const supabase = createServerComponentClient();
    const plan = await getUserPlan(userId);
    const historyDays = getQuotaLimit(plan, "historyDays");

    let query = supabase
      .from("EventLog")
      .select("id", { count: "exact", head: true })
      .eq("userId", userId);

    // Filtrer par date selon le plan
    if (historyDays !== -1) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - historyDays);
      query = query.gte("createdAt", startDate.toISOString());
    }

    // Filtrer par catégorie si spécifiée
    if (category) {
      query = query.eq("category", category);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Erreur comptage logs: ${error.message}`);
    }

    return count || 0;
  } catch (error) {
    console.error("[Event Logs Service] Erreur comptage logs:", error);
    return 0;
  }
}
