/**
 * Configuration des plans d'abonnement
 * 
 * Définit les limites et fonctionnalités pour chaque plan
 */

export type SubscriptionPlan = "FREE" | "PLUS" | "PRO";
export type SubscriptionStatus = "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIALING";

export interface PlanLimits {
  devices: number; // -1 = illimité
  automations: number; // -1 = illimité
  voiceRequests: number; // -1 = illimité, 0 = désactivé
  storageMB: number; // -1 = illimité
  historyDays: number; // -1 = illimité
}

export interface PlanFeatures {
  basicDomotique: boolean;
  advancedAutomations: boolean;
  securityBasic: boolean;
  securityAdvanced: boolean;
  iaText: boolean;
  iaConversational: boolean;
  voiceSimple: boolean; // Commandes vocales simples
  voiceFull: boolean; // Assistant vocal complet
  routines: boolean;
  intelligentRoutines: boolean;
  calendar: boolean;
  reminders: boolean;
  weather: boolean;
  traffic: boolean;
  energyConsumption: boolean;
  finance: boolean;
  premiumConnectors: boolean;
  priorityExecution: boolean;
  supportPriority: boolean;
  supportPremium: boolean;
}

export interface PlanConfig {
  name: string;
  description: string;
  price: number;
  pricePeriod: "month" | "year";
  limits: PlanLimits;
  features: PlanFeatures;
  color: string;
  popular?: boolean;
}

export const PRICING_PLANS: Record<SubscriptionPlan, PlanConfig> = {
  FREE: {
    name: "Free",
    description: "Découverte - Parfait pour commencer",
    price: 0,
    pricePeriod: "month",
    limits: {
      devices: 3,
      automations: 3,
      voiceRequests: 0, // Désactivé
      storageMB: 100,
      historyDays: 7,
    },
    features: {
      basicDomotique: true,
      advancedAutomations: false,
      securityBasic: false,
      securityAdvanced: false,
      iaText: true,
      iaConversational: false,
      voiceSimple: false,
      voiceFull: false,
      routines: false,
      intelligentRoutines: false,
      calendar: true,
      reminders: true,
      weather: true,
      traffic: true,
      energyConsumption: false,
      finance: false,
      premiumConnectors: false,
      priorityExecution: false,
      supportPriority: false,
      supportPremium: false,
    },
    color: "green",
  },
  PLUS: {
    name: "Plus",
    description: "Assistant personnel - Pour une maison connectée",
    price: 9.99,
    pricePeriod: "month",
    limits: {
      devices: 15,
      automations: 20,
      voiceRequests: 500, // Par mois
      storageMB: 1000,
      historyDays: 90,
    },
    features: {
      basicDomotique: true,
      advancedAutomations: true,
      securityBasic: true,
      securityAdvanced: false,
      iaText: true,
      iaConversational: true,
      voiceSimple: true,
      voiceFull: false,
      routines: true,
      intelligentRoutines: true,
      calendar: true,
      reminders: true,
      weather: true,
      traffic: true,
      energyConsumption: true,
      finance: false,
      premiumConnectors: false,
      priorityExecution: false,
      supportPriority: true,
      supportPremium: false,
    },
    color: "blue",
    popular: true,
  },
  PRO: {
    name: "Pro",
    description: "Contrôle total - Pour les utilisateurs avancés",
    price: 19.99,
    pricePeriod: "month",
    limits: {
      devices: -1, // Illimité
      automations: -1, // Illimité
      voiceRequests: -1, // Illimité
      storageMB: 10000,
      historyDays: -1, // Illimité
    },
    features: {
      basicDomotique: true,
      advancedAutomations: true,
      securityBasic: true,
      securityAdvanced: true,
      iaText: true,
      iaConversational: true,
      voiceSimple: true,
      voiceFull: true,
      routines: true,
      intelligentRoutines: true,
      calendar: true,
      reminders: true,
      weather: true,
      traffic: true,
      energyConsumption: true,
      finance: true,
      premiumConnectors: true,
      priorityExecution: true,
      supportPriority: true,
      supportPremium: true,
    },
    color: "purple",
  },
};

/**
 * Obtient la configuration d'un plan
 */
export function getPlanConfig(plan: SubscriptionPlan): PlanConfig {
  return PRICING_PLANS[plan];
}

/**
 * Vérifie si une fonctionnalité est disponible pour un plan
 */
export function hasFeature(plan: SubscriptionPlan, feature: keyof PlanFeatures): boolean {
  return PRICING_PLANS[plan].features[feature];
}

/**
 * Obtient la limite d'un quota pour un plan
 */
export function getQuotaLimit(
  plan: SubscriptionPlan,
  quotaType: keyof PlanLimits
): number {
  return PRICING_PLANS[plan].limits[quotaType];
}

/**
 * Vérifie si un quota est illimité
 */
export function isQuotaUnlimited(plan: SubscriptionPlan, quotaType: keyof PlanLimits): boolean {
  return getQuotaLimit(plan, quotaType) === -1;
}

/**
 * Vérifie si une fonctionnalité est désactivée (limite = 0)
 */
export function isFeatureDisabled(plan: SubscriptionPlan, quotaType: keyof PlanLimits): boolean {
  return getQuotaLimit(plan, quotaType) === 0;
}
