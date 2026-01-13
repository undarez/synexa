/**
 * Service de gestion des quotas d'utilisation
 * 
 * Gère les limites d'utilisation selon le plan d'abonnement
 */

import { createServerComponentClient } from "@/app/lib/supabase/server-client";
import { getUserPlan, type SubscriptionPlan } from "./subscription-service";
import { getQuotaLimit, isQuotaUnlimited, isFeatureDisabled } from "./pricing-config";

export type QuotaType =
  | "devices"
  | "automations"
  | "voice_requests"
  | "storage_mb"
  | "history_days";

export interface UsageQuota {
  id: string;
  userId: string;
  quotaType: string;
  limit: number;
  used: number;
  period: string;
  resetAt: string;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
  isUnlimited: boolean;
}

/**
 * Récupère le quota d'utilisation d'un utilisateur
 */
export async function getUsageQuota(
  userId: string,
  quotaType: QuotaType
): Promise<UsageQuota | null> {
  try {
    const supabase = createServerComponentClient();
    const { data, error } = await supabase
      .from("UsageQuota")
      .select("*")
      .eq("userId", userId)
      .eq("quotaType", quotaType)
      .single();

    if (error || !data) {
      return null;
    }

    return data as UsageQuota;
  } catch (error) {
    console.error("[Quota Service] Erreur récupération quota:", error);
    return null;
  }
}

/**
 * Vérifie si un utilisateur peut effectuer une action selon son quota
 */
export async function checkUserQuota(
  userId: string,
  quotaType: QuotaType
): Promise<QuotaCheckResult> {
  try {
    // Obtenir le plan de l'utilisateur
    const plan = await getUserPlan(userId);

    // Obtenir la limite selon le plan
    const limit = getQuotaLimit(plan, quotaType);

    // Vérifier si c'est illimité
    if (isQuotaUnlimited(plan, quotaType)) {
      return {
        allowed: true,
        remaining: Infinity,
        limit: -1,
        used: 0,
        isUnlimited: true,
      };
    }

    // Vérifier si la fonctionnalité est désactivée
    if (isFeatureDisabled(plan, quotaType)) {
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        used: 0,
        isUnlimited: false,
      };
    }

    // Récupérer le quota actuel
    const quota = await getUsageQuota(userId, quotaType);

    // Si pas de quota, créer un nouveau avec la limite du plan
    if (!quota) {
      await initializeQuota(userId, quotaType, limit);
      return {
        allowed: true,
        remaining: limit,
        limit,
        used: 0,
        isUnlimited: false,
      };
    }

    // Vérifier si le quota doit être réinitialisé
    const resetAt = new Date(quota.resetAt);
    const now = new Date();
    if (now > resetAt) {
      await resetQuota(userId, quotaType, limit);
      return {
        allowed: true,
        remaining: limit,
        limit,
        used: 0,
        isUnlimited: false,
      };
    }

    const remaining = limit - quota.used;
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      limit,
      used: quota.used,
      isUnlimited: false,
    };
  } catch (error) {
    console.error("[Quota Service] Erreur vérification quota:", error);
    // En cas d'erreur, refuser par sécurité
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      used: 0,
      isUnlimited: false,
    };
  }
}

/**
 * Incrémente l'utilisation d'un quota
 */
export async function incrementQuota(
  userId: string,
  quotaType: QuotaType,
  amount: number = 1
): Promise<void> {
  try {
    const supabase = createServerComponentClient();
    const quota = await getUsageQuota(userId, quotaType);

    if (!quota) {
      // Créer le quota s'il n'existe pas
      const plan = await getUserPlan(userId);
      const limit = getQuotaLimit(plan, quotaType);
      await initializeQuota(userId, quotaType, limit);
      return;
    }

    // Vérifier si le quota doit être réinitialisé
    const resetAt = new Date(quota.resetAt);
    const now = new Date();
    if (now > resetAt) {
      const plan = await getUserPlan(userId);
      const limit = getQuotaLimit(plan, quotaType);
      await resetQuota(userId, quotaType, limit);
      return;
    }

    // Incrémenter l'utilisation
    await supabase
      .from("UsageQuota")
      .update({
        used: quota.used + amount,
        updatedAt: new Date().toISOString(),
      })
      .eq("userId", userId)
      .eq("quotaType", quotaType);
  } catch (error) {
    console.error("[Quota Service] Erreur incrémentation quota:", error);
  }
}

/**
 * Initialise un quota pour un utilisateur
 */
async function initializeQuota(
  userId: string,
  quotaType: QuotaType,
  limit: number
): Promise<void> {
  try {
    const supabase = createServerComponentClient();
    const now = new Date();
    const resetAt = new Date(now);
    resetAt.setMonth(resetAt.getMonth() + 1); // Réinitialisation mensuelle

    await supabase.from("UsageQuota").insert({
      id: crypto.randomUUID(),
      userId,
      quotaType,
      limit,
      used: 0,
      period: "monthly",
      resetAt: resetAt.toISOString(),
      metadata: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("[Quota Service] Erreur initialisation quota:", error);
  }
}

/**
 * Réinitialise un quota
 */
async function resetQuota(
  userId: string,
  quotaType: QuotaType,
  limit: number
): Promise<void> {
  try {
    const supabase = createServerComponentClient();
    const now = new Date();
    const resetAt = new Date(now);
    resetAt.setMonth(resetAt.getMonth() + 1);

    await supabase
      .from("UsageQuota")
      .update({
        used: 0,
        limit,
        resetAt: resetAt.toISOString(),
        updatedAt: now.toISOString(),
      })
      .eq("userId", userId)
      .eq("quotaType", quotaType);
  } catch (error) {
    console.error("[Quota Service] Erreur réinitialisation quota:", error);
  }
}
