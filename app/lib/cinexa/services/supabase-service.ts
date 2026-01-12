/**
 * Service Supabase pour Cinexa
 * 
 * Responsabilités :
 * - Charger le contexte utilisateur
 * - Gérer la mémoire long terme
 * - Accéder aux données (devices, automations, calendar, etc.)
 * 
 * ⚠️ IMPORTANT : Toutes les données viennent de Supabase, jamais du localStorage
 */

import { createServerComponentClient } from "@/app/lib/supabase/server-client";
import type { CinexaUserContext, CinexaMemory } from "../types";

interface LoadContextOptions {
  includeDevices?: boolean;
  includeAutomations?: boolean;
  includeCalendar?: boolean;
  includeMemory?: boolean;
  maxMemoryTokens?: number;
}

/**
 * Charge le contexte utilisateur depuis Supabase
 */
export async function loadUserContext(
  userId: string,
  options: LoadContextOptions = {}
): Promise<CinexaUserContext> {
  const supabase = await createServerComponentClient();

  // 1. Charger le profil utilisateur
  const { data: profile, error: profileError } = await supabase
    .from("User")
    .select("id, email, name, firstName, lastName, preferences, workLat, workLng")
    .eq("id", userId)
    .single();

  if (profileError) {
    console.error("[Cinexa Supabase] Erreur chargement profil:", profileError);
  }

  const context: CinexaUserContext = {
    userId,
    profile: {
      name: profile?.name || profile?.firstName || profile?.email?.split("@")[0] || "Utilisateur",
      email: profile?.email || undefined,
      preferences: (profile?.preferences as Record<string, any>) || {},
      location: profile?.workLat && profile?.workLng
        ? { lat: profile.workLat, lng: profile.workLng }
        : undefined,
    },
  };

  // 2. Charger les devices si demandé
  if (options.includeDevices) {
    try {
      const { data: devices } = await supabase
        .from("Device")
        .select("*")
        .eq("userId", userId)
        .eq("online", true);

      context.devices = devices || [];
    } catch (error) {
      console.error("[Cinexa Supabase] Erreur chargement devices:", error);
      context.devices = [];
    }
  }

  // 3. Charger les automatisations si demandé
  if (options.includeAutomations) {
    try {
      const { data: automations } = await supabase
        .from("Routine")
        .select("*")
        .eq("userId", userId)
        .eq("active", true);

      context.automations = automations || [];
    } catch (error) {
      console.error("[Cinexa Supabase] Erreur chargement automations:", error);
      context.automations = [];
    }
  }

  // 4. Charger le calendrier si demandé
  if (options.includeCalendar) {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: calendar } = await supabase
        .from("CalendarEvent")
        .select("*")
        .eq("userId", userId)
        .gte("startTime", now.toISOString())
        .lte("startTime", tomorrow.toISOString())
        .order("startTime", { ascending: true })
        .limit(10);

      context.calendar = calendar || [];
    } catch (error) {
      console.error("[Cinexa Supabase] Erreur chargement calendar:", error);
      context.calendar = [];
    }
  }

  // 5. Charger la mémoire long terme si demandé
  if (options.includeMemory) {
    try {
      const { data: memories, error: memoryError } = await supabase
        .from("AgentMemory")
        .select("*")
        .eq("userId", userId)
        .order("timestamp", { ascending: false })
        .limit(10); // Limiter pour éviter les coûts

      if (memoryError) {
        console.error("[Cinexa Supabase] Erreur chargement mémoire:", memoryError);
        context.memory = [];
      } else {

      // Filtrer selon maxMemoryTokens si spécifié
      let selectedMemories = memories || [];
      if (options.maxMemoryTokens) {
        // Simplification : prendre les N plus récentes
        // En production, on pourrait faire un résumé intelligent
        selectedMemories = selectedMemories.slice(0, 5);
      }

        context.memory = selectedMemories.map((m: any) => ({
          id: m.id,
          userId: m.userId,
          summary: m.summary,
          timestamp: m.timestamp,
          intent: m.intent,
          agents: m.agents,
          result: m.result,
          tokens: m.tokens,
        }));
      }
    } catch (error) {
      console.error("[Cinexa Supabase] Erreur chargement mémoire:", error);
      context.memory = [];
    }
  }

  return context;
}

/**
 * Sauvegarde une entrée de mémoire long terme
 */
export async function saveMemory(userId: string, memory: Omit<CinexaMemory, "id" | "userId">): Promise<void> {
  const supabase = await createServerComponentClient();

  try {
    const { error } = await supabase
      .from("AgentMemory")
      .insert({
        userId,
        summary: memory.summary,
        timestamp: memory.timestamp || new Date().toISOString(),
        intent: memory.intent,
        agents: memory.agents,
        result: memory.result,
        tokens: memory.tokens,
      });

    if (error) {
      console.error("[Cinexa Supabase] Erreur sauvegarde mémoire:", error);
    }
  } catch (error) {
    console.error("[Cinexa Supabase] Erreur sauvegarde mémoire:", error);
  }
}

/**
 * Récupère les préférences utilisateur
 */
export async function getUserPreferences(userId: string): Promise<Record<string, any>> {
  const supabase = await createServerComponentClient();

  try {
    const { data } = await supabase
      .from("User")
      .select("preferences")
      .eq("id", userId)
      .single();

    return (data?.preferences as Record<string, any>) || {};
  } catch (error) {
    console.error("[Cinexa Supabase] Erreur chargement préférences:", error);
    return {};
  }
}
