/**
 * Agent Sécurité
 * 
 * Responsabilités :
 * - Vérifier l'état de sécurité
 * - Logger des événements de sécurité
 * - Générer des alertes
 * 
 * ⚠️ IMPORTANT : Aucune IA ici. Juste de la logique métier.
 */

import type { AgentInput, AgentOutput } from "../types";
import { createServerComponentClient } from "@/app/lib/supabase/server-client";

/**
 * Agent sécurité principal
 */
export async function securityAgent(input: AgentInput): Promise<AgentOutput> {
  const { action, parameters, userId } = input;

  try {
    switch (action) {
      case "check_security":
        return await checkSecurity(userId);
      
      case "log_event":
        return await logSecurityEvent(userId, parameters);
      
      case "alert":
        return await createSecurityAlert(userId, parameters);
      
      default:
        return {
          success: false,
          error: `Action non supportée: ${action}`,
        };
    }
  } catch (error) {
    console.error("[Security Agent] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Vérifie l'état de sécurité
 */
async function checkSecurity(userId: string): Promise<AgentOutput> {
  const supabase = await createServerComponentClient();

  try {
    // Récupérer les devices de sécurité
    const { data: securityDevices } = await supabase
      .from("SecurityDevice")
      .select("*")
      .eq("userId", userId)
      .eq("active", true);

    // Récupérer les événements récents
    const { data: recentEvents } = await supabase
      .from("SecurityLog")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .limit(10);

    const allDevicesOnline = securityDevices?.every((d: any) => d.online) ?? true;
    const hasRecentAlerts = recentEvents?.some((e: any) => e.severity === "high") ?? false;

    return {
      success: true,
      result: {
        status: allDevicesOnline && !hasRecentAlerts ? "secure" : "warning",
        devicesOnline: allDevicesOnline,
        hasRecentAlerts,
        deviceCount: securityDevices?.length || 0,
        recentEventsCount: recentEvents?.length || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur vérification sécurité",
    };
  }
}

/**
 * Log un événement de sécurité
 */
async function logSecurityEvent(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const { event, severity, details } = params;

  if (!event) {
    return {
      success: false,
      error: "event requis",
    };
  }

  const supabase = await createServerComponentClient();

  try {
    const { data, error } = await supabase
      .from("SecurityLog")
      .insert({
        userId,
        eventType: event,
        severity: severity || "info",
        details: details || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      result: {
        logId: data.id,
        event: data.event,
      },
      logs: [`Événement de sécurité loggé: ${event}`],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur logging événement",
    };
  }
}

/**
 * Crée une alerte de sécurité
 */
async function createSecurityAlert(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const { message, severity } = params;

  if (!message) {
    return {
      success: false,
      error: "message requis",
    };
  }

  // Logger l'alerte
  const logResult = await logSecurityEvent(userId, {
    event: "security_alert",
    severity: severity || "high",
    details: { message },
  });

  if (!logResult.success) {
    return logResult;
  }

  // TODO: Envoyer une notification push/email si nécessaire

  return {
    success: true,
    result: {
      alert: message,
      severity: severity || "high",
    },
    logs: [`Alerte de sécurité: ${message}`],
  };
}
