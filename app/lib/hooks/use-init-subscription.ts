/**
 * Hook pour initialiser un abonnement FREE lors de l'inscription
 * 
 * À appeler après la création d'un compte utilisateur
 */

import { createFreeSubscription } from "@/app/lib/services/subscription-service";
import { initializeQuota } from "@/app/lib/services/quota-service";

/**
 * Initialise un abonnement FREE et les quotas pour un nouvel utilisateur
 */
export async function initUserSubscription(userId: string): Promise<void> {
  try {
    // Créer l'abonnement FREE
    await createFreeSubscription(userId);

    // Initialiser les quotas par défaut
    // Les quotas seront créés à la demande lors de la première vérification
    // Mais on peut pré-initialiser les principaux
    console.log(`[Init Subscription] Abonnement FREE créé pour l'utilisateur ${userId}`);
  } catch (error) {
    console.error("[Init Subscription] Erreur initialisation abonnement:", error);
    // Ne pas faire échouer l'inscription si l'initialisation de l'abonnement échoue
    // L'utilisateur pourra toujours utiliser l'application avec les limites par défaut
  }
}
