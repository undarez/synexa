/**
 * Filtre de contenu pour détecter les messages inappropriés
 */

export interface ContentFilterResult {
  isSafe: boolean;
  reason?: string;
  severity: "low" | "medium" | "high" | "critical";
}

/**
 * Liste de mots interdits (insultes, contenus inappropriés)
 */
const FORBIDDEN_WORDS = [
  // Insultes courantes (liste non exhaustive, à adapter)
  "connard", "salope", "pute", "merde", "putain", "enculé", "fdp", "tg", "ntm",
  // Contenu violent
  "tuer", "violence", "agression", "meurtre",
  // Contenu sexuel explicite
  "sexe", "porno", "xxx",
  // Autres
  "hack", "pirater", "cracker", "exploit",
];

/**
 * Patterns de messages inappropriés
 */
const INAPPROPRIATE_PATTERNS = [
  /(fais|crée|génère|donne).*(mot de passe|password|secret|clé)/i,
  /(montre|donne|envoie).*(données|informations).*(personnelles|privées)/i,
  /(supprime|efface|détruis).*(données|fichiers|base)/i,
  /(accède|connecte).*(compte|système|serveur)/i,
];

/**
 * Filtre le contenu d'un message
 */
export function filterContent(message: string): ContentFilterResult {
  const lowerMessage = message.toLowerCase().trim();

  // Vérifier les mots interdits
  for (const word of FORBIDDEN_WORDS) {
    if (lowerMessage.includes(word.toLowerCase())) {
      return {
        isSafe: false,
        reason: "Contenu inapproprié détecté",
        severity: "high",
      };
    }
  }

  // Vérifier les patterns inappropriés
  for (const pattern of INAPPROPRIATE_PATTERNS) {
    if (pattern.test(message)) {
      return {
        isSafe: false,
        reason: "Demande suspecte détectée",
        severity: "critical",
      };
    }
  }

  // Vérifier la longueur excessive (possible spam)
  if (message.length > 2000) {
    return {
      isSafe: false,
      reason: "Message trop long",
      severity: "medium",
    };
  }

  // Vérifier les caractères répétitifs (possible spam)
  if (/(.)\1{10,}/.test(message)) {
    return {
      isSafe: false,
      reason: "Message suspect",
      severity: "medium",
    };
  }

  return {
    isSafe: true,
    severity: "low",
  };
}

/**
 * Nettoie un message des données sensibles potentielles
 */
export function sanitizeMessage(message: string): string {
  // Supprimer les emails
  let cleaned = message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_MASQUÉ]");
  
  // Supprimer les numéros de téléphone
  cleaned = cleaned.replace(/(\+33|0)[1-9]([.\s-]?\d{2}){4}/g, "[TÉLÉPHONE_MASQUÉ]");
  
  // Supprimer les numéros de carte bancaire (pattern simplifié)
  cleaned = cleaned.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[CARTE_MASQUÉE]");
  
  // Supprimer les mots de passe potentiels (mots suivis de ":" et d'un mot)
  cleaned = cleaned.replace(/(password|mot de passe|mdp|secret|clé):\s*\S+/gi, "$1: [MASQUÉ]");
  
  return cleaned;
}

/**
 * Détecte si un message contient des données sensibles
 */
export function containsSensitiveData(message: string): boolean {
  // Détecter les emails
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(message)) {
    return true;
  }
  
  // Détecter les numéros de téléphone
  if (/(\+33|0)[1-9]([.\s-]?\d{2}){4}/.test(message)) {
    return true;
  }
  
  // Détecter les numéros de carte bancaire
  if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(message)) {
    return true;
  }
  
  // Détecter les mots de passe
  if (/(password|mot de passe|mdp|secret|clé):\s*\S+/i.test(message)) {
    return true;
  }
  
  return false;
}


