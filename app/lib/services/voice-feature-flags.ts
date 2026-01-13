/**
 * Feature Flags pour la voix / Assistant vocal
 * 
 * Gère l'activation et les limites de la voix selon le plan d'abonnement
 */

import { getUserPlan, type SubscriptionPlan } from "./subscription-service";
import { hasFeature, isFeatureDisabled, type QuotaType } from "./pricing-config";
import { checkUserQuota, incrementQuota } from "./quota-service";

export type VoiceCommandType = "simple" | "complex" | "conversational";

/**
 * Vérifie si la voix est activée pour un utilisateur
 */
export async function isVoiceEnabled(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId);
  return hasFeature(plan, "voiceSimple") || hasFeature(plan, "voiceFull");
}

/**
 * Vérifie si l'assistant vocal complet est activé pour un utilisateur
 */
export async function isFullVoiceEnabled(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId);
  return hasFeature(plan, "voiceFull");
}

/**
 * Vérifie si un utilisateur peut effectuer une commande vocale
 */
export async function canUseVoice(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  remaining: number;
}> {
  const plan = await getUserPlan(userId);

  // Vérifier si la voix est désactivée pour ce plan
  if (isFeatureDisabled(plan, "voiceRequests")) {
    return {
      allowed: false,
      reason: "La voix n'est pas disponible avec le plan Free. Passez à Plus ou Pro.",
      remaining: 0,
    };
  }

  // Vérifier le quota
  const quota = await checkUserQuota(userId, "voice_requests");

  if (!quota.allowed) {
    return {
      allowed: false,
      reason: `Quota de requêtes vocales dépassé (${quota.used}/${quota.limit}). Passez à un plan supérieur.`,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: quota.remaining,
  };
}

/**
 * Enregistre l'utilisation d'une commande vocale
 */
export async function recordVoiceUsage(
  userId: string,
  commandType: VoiceCommandType = "simple"
): Promise<void> {
  // Vérifier si la voix est activée
  const enabled = await isVoiceEnabled(userId);
  if (!enabled) {
    return;
  }

  // Incrémenter le quota
  await incrementQuota(userId, "voice_requests", 1);

  // Log l'événement
  const { createEventLog } = await import("./event-logs-service");
  await createEventLog({
    userId,
    eventType: "voice_command",
    category: "voice",
    title: `Commande vocale: ${commandType}`,
    metadata: { commandType },
  });
}

/**
 * Vérifie si un type de commande vocale est autorisé
 */
export async function canUseVoiceCommandType(
  userId: string,
  commandType: VoiceCommandType
): Promise<boolean> {
  const plan = await getUserPlan(userId);

  // Commandes simples : disponibles avec PLUS et PRO
  if (commandType === "simple") {
    return hasFeature(plan, "voiceSimple");
  }

  // Commandes complexes et conversationnelles : uniquement PRO
  if (commandType === "complex" || commandType === "conversational") {
    return hasFeature(plan, "voiceFull");
  }

  return false;
}

/**
 * Obtient les informations sur les limites vocales d'un utilisateur
 */
export async function getVoiceLimits(userId: string): Promise<{
  enabled: boolean;
  fullVoice: boolean;
  quota: {
    limit: number;
    used: number;
    remaining: number;
    isUnlimited: boolean;
  };
  allowedCommandTypes: VoiceCommandType[];
}> {
  const plan = await getUserPlan(userId);
  const enabled = await isVoiceEnabled(userId);
  const fullVoice = await isFullVoiceEnabled(userId);
  const quota = await checkUserQuota(userId, "voice_requests");

  const allowedCommandTypes: VoiceCommandType[] = [];
  if (hasFeature(plan, "voiceSimple")) {
    allowedCommandTypes.push("simple");
  }
  if (hasFeature(plan, "voiceFull")) {
    allowedCommandTypes.push("complex", "conversational");
  }

  return {
    enabled,
    fullVoice,
    quota: {
      limit: quota.limit,
      used: quota.used,
      remaining: quota.remaining,
      isUnlimited: quota.isUnlimited,
    },
    allowedCommandTypes,
  };
}
