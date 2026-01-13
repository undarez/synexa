/**
 * Service de gestion des abonnements
 * 
 * Gère les abonnements utilisateurs, la création, la mise à jour et la vérification
 */

import { createServerComponentClient } from "@/app/lib/supabase/server-client";
import type { SubscriptionPlan, SubscriptionStatus } from "./pricing-config";

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Récupère l'abonnement d'un utilisateur
 */
export async function getUserSubscription(
  userId: string
): Promise<Subscription | null> {
  try {
    const supabase = createServerComponentClient();
    const { data, error } = await supabase
      .from("Subscription")
      .select("*")
      .eq("userId", userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Subscription;
  } catch (error) {
    console.error("[Subscription Service] Erreur récupération abonnement:", error);
    return null;
  }
}

/**
 * Crée un abonnement FREE par défaut pour un nouvel utilisateur
 */
export async function createFreeSubscription(
  userId: string
): Promise<Subscription> {
  try {
    const supabase = createServerComponentClient();
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription: Omit<Subscription, "id" | "createdAt" | "updatedAt"> = {
      userId,
      plan: "FREE",
      status: "ACTIVE",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      trialEnd: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      metadata: null,
    };

    const { data, error } = await supabase
      .from("Subscription")
      .insert({
        id: crypto.randomUUID(),
        ...subscription,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Erreur création abonnement: ${error?.message || "Unknown error"}`);
    }

    return data as Subscription;
  } catch (error) {
    console.error("[Subscription Service] Erreur création abonnement:", error);
    throw error;
  }
}

/**
 * Met à jour le plan d'un utilisateur
 */
export async function updateSubscriptionPlan(
  userId: string,
  newPlan: SubscriptionPlan
): Promise<Subscription> {
  try {
    const supabase = createServerComponentClient();
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { data, error } = await supabase
      .from("Subscription")
      .update({
        plan: newPlan,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        updatedAt: now.toISOString(),
      })
      .eq("userId", userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Erreur mise à jour abonnement: ${error?.message || "Unknown error"}`);
    }

    return data as Subscription;
  } catch (error) {
    console.error("[Subscription Service] Erreur mise à jour abonnement:", error);
    throw error;
  }
}

/**
 * Vérifie si un utilisateur a un abonnement actif
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  return subscription?.status === "ACTIVE" || subscription?.status === "TRIALING";
}

/**
 * Obtient le plan actuel d'un utilisateur (FREE par défaut)
 */
export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
  const subscription = await getUserSubscription(userId);
  return subscription?.plan || "FREE";
}
