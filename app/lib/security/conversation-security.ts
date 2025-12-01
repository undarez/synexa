/**
 * Sécurité pour les conversations avec l'IA
 */

import { filterContent, sanitizeMessage, containsSensitiveData } from "./content-filter";
import { logger } from "../logger";

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  sanitizedMessage?: string;
  severity?: "low" | "medium" | "high" | "critical";
}

/**
 * Vérifie la sécurité d'un message avant de l'envoyer à l'IA
 */
export function checkMessageSecurity(
  message: string,
  userId: string
): SecurityCheckResult {
  // 1. Filtrer le contenu inapproprié
  const contentFilter = filterContent(message);
  
  if (!contentFilter.isSafe) {
    logger.warn("Message bloqué par filtre de contenu", {
      userId,
      reason: contentFilter.reason,
      severity: contentFilter.severity,
    });
    
    return {
      allowed: false,
      reason: contentFilter.reason || "Message inapproprié",
      severity: contentFilter.severity,
    };
  }

  // 2. Vérifier les données sensibles
  if (containsSensitiveData(message)) {
    logger.warn("Données sensibles détectées dans le message", {
      userId,
    });
    
    // Nettoyer le message mais permettre la conversation
    const sanitized = sanitizeMessage(message);
    
    return {
      allowed: true,
      sanitizedMessage: sanitized,
      reason: "Données sensibles masquées",
      severity: "medium",
    };
  }

  // 3. Vérifier la longueur (protection contre les attaques)
  if (message.length > 5000) {
    logger.warn("Message trop long bloqué", {
      userId,
      length: message.length,
    });
    
    return {
      allowed: false,
      reason: "Message trop long",
      severity: "medium",
    };
  }

  // 4. Vérifier le taux de requêtes (rate limiting - à implémenter avec Redis en production)
  // Pour l'instant, on log juste
  logger.debug("Message sécurisé", {
    userId,
    messageLength: message.length,
  });

  return {
    allowed: true,
  };
}

/**
 * Vérifie la sécurité de la réponse de l'IA
 */
export function checkResponseSecurity(
  response: string,
  userId: string
): SecurityCheckResult {
  // Vérifier que la réponse ne contient pas de données sensibles
  if (containsSensitiveData(response)) {
    logger.warn("Réponse de l'IA contient des données sensibles", {
      userId,
    });
    
    const sanitized = sanitizeMessage(response);
    
    return {
      allowed: true,
      sanitizedMessage: sanitized,
      reason: "Données sensibles masquées dans la réponse",
      severity: "medium",
    };
  }

  // Vérifier la longueur de la réponse
  if (response.length > 10000) {
    logger.warn("Réponse de l'IA trop longue", {
      userId,
      length: response.length,
    });
    
    return {
      allowed: false,
      reason: "Réponse trop longue",
      severity: "low",
    };
  }

  return {
    allowed: true,
  };
}

/**
 * Nettoie une réponse avant de l'afficher
 */
export function sanitizeResponse(response: string): string {
  return sanitizeMessage(response);
}



