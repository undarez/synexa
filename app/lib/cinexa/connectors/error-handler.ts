/**
 * Error Handler - Gestion centralisée des erreurs et retries
 * 
 * Responsabilités :
 * - Gérer les retries avec backoff exponentiel
 * - Logger les erreurs de manière structurée
 * - Fournir des messages d'erreur clairs pour l'utilisateur
 * - Informer Grok pour reformulation si nécessaire
 * 
 * ⚠️ IMPORTANT : Cette logique est centralisée ici, pas dans les agents ni les connectors.
 */

import { createServerComponentClient } from "@/app/lib/supabase/server-client";

/**
 * Options de retry
 */
export interface RetryOptions {
  maxRetries?: number; // Nombre maximum de tentatives (défaut: 3)
  initialDelay?: number; // Délai initial en ms (défaut: 1000)
  maxDelay?: number; // Délai maximum en ms (défaut: 10000)
  backoff?: "exponential" | "linear" | "fixed"; // Type de backoff
  retryable?: (error: any) => boolean; // Fonction pour déterminer si l'erreur est retryable
}

/**
 * Résultat d'une exécution avec retry
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: string;
  attempts: number;
  logs: string[];
}

/**
 * Exécute une fonction avec retry automatique
 * 
 * @param fn - Fonction à exécuter (retourne une Promise)
 * @param options - Options de retry
 * @returns Résultat de l'exécution
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoff = "exponential",
    retryable = (error) => {
      // Par défaut, retry sur les erreurs réseau/timeout
      const errorMessage = error?.message || String(error);
      return (
        errorMessage.includes("timeout") ||
        errorMessage.includes("network") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("ETIMEDOUT")
      );
    },
  } = options;

  const logs: string[] = [];
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      
      if (attempt > 0) {
        logs.push(`Succès après ${attempt} tentative(s)`);
      }

      return {
        success: true,
        result,
        attempts: attempt + 1,
        logs,
      };
    } catch (error) {
      lastError = error;

      // Vérifier si l'erreur est retryable
      if (!retryable(error)) {
        logs.push(`Erreur non retryable: ${getErrorMessage(error)}`);
        break;
      }

      // Si ce n'est pas la dernière tentative, attendre avant de retry
      if (attempt < maxRetries) {
        const delay = calculateBackoff(attempt, initialDelay, maxDelay, backoff);
        logs.push(
          `Tentative ${attempt + 1}/${maxRetries + 1} échouée, retry dans ${delay}ms...`
        );
        await sleep(delay);
      } else {
        logs.push(`Toutes les tentatives ont échoué (${maxRetries + 1} tentatives)`);
      }
    }
  }

  // Toutes les tentatives ont échoué
  const errorMessage = getErrorMessage(lastError);

  // Logger l'erreur dans Supabase
  await logErrorToSupabase({
    error: errorMessage,
    attempts: maxRetries + 1,
    logs,
  });

  return {
    success: false,
    error: errorMessage,
    attempts: maxRetries + 1,
    logs,
  };
}

/**
 * Calcule le délai de backoff selon la stratégie
 */
function calculateBackoff(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  strategy: "exponential" | "linear" | "fixed"
): number {
  switch (strategy) {
    case "exponential":
      return Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
    case "linear":
      return Math.min(initialDelay * (attempt + 1), maxDelay);
    case "fixed":
      return initialDelay;
    default:
      return initialDelay;
  }
}

/**
 * Extrait un message d'erreur lisible
 */
function getErrorMessage(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error?.error) {
    return String(error.error);
  }
  return "Erreur inconnue";
}

/**
 * Attend un certain nombre de millisecondes
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Log une erreur dans Supabase pour analyse ultérieure
 */
async function logErrorToSupabase(log: {
  error: string;
  attempts: number;
  logs: string[];
}): Promise<void> {
  try {
    const supabase = await createServerComponentClient();

    // TODO: Créer une table ErrorLog dans Supabase si nécessaire
    // Pour l'instant, on log juste dans la console
    console.error("[Error Handler] Erreur loggée:", {
      error: log.error,
      attempts: log.attempts,
      logs: log.logs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Ne pas faire échouer si le logging échoue
    console.error("[Error Handler] Erreur logging Supabase:", error);
  }
}

/**
 * Génère un message d'erreur clair pour l'utilisateur
 */
export function formatUserErrorMessage(
  error: string,
  deviceName?: string,
  action?: string
): string {
  // Messages d'erreur user-friendly
  if (error.includes("timeout") || error.includes("ETIMEDOUT")) {
    return deviceName
      ? `Le device "${deviceName}" ne répond pas. Vérifiez qu'il est en ligne.`
      : "Le device ne répond pas. Vérifiez qu'il est en ligne.";
  }

  if (error.includes("network") || error.includes("ECONNREFUSED")) {
    return "Problème de connexion réseau. Vérifiez votre connexion Internet.";
  }

  if (error.includes("permission") || error.includes("unauthorized")) {
    return "Vous n'avez pas la permission d'effectuer cette action.";
  }

  if (error.includes("not found") || error.includes("404")) {
    return deviceName
      ? `Le device "${deviceName}" n'a pas été trouvé.`
      : "Device non trouvé.";
  }

  // Message générique
  return deviceName && action
    ? `Impossible d'${action} le device "${deviceName}". Veuillez réessayer.`
    : "Une erreur est survenue. Veuillez réessayer.";
}

/**
 * Détermine si une erreur doit être signalée à Grok pour reformulation
 */
export function shouldInformGrok(error: string): boolean {
  // Informer Grok si l'erreur suggère une reformulation de la commande
  const grokRelevantErrors = [
    "not found",
    "invalid",
    "unsupported",
    "permission",
    "unauthorized",
  ];

  return grokRelevantErrors.some((keyword) =>
    error.toLowerCase().includes(keyword)
  );
}
