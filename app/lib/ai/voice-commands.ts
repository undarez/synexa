/**
 * Parser de commandes vocales
 * Réutilise les parsers existants (event-parser, routine-parser)
 */

import { parseNaturalLanguageEvent } from "./event-parser";
import { parseNaturalLanguageRoutine } from "./routine-parser";

export type VoiceCommandType = "EVENT" | "ROUTINE" | "TASK" | "QUESTION" | "NEWS" | "CONVERSATION" | "UNKNOWN";

export interface ParsedVoiceCommand {
  type: VoiceCommandType;
  action: "CREATE" | "UPDATE" | "DELETE" | "LIST" | "WEATHER" | "NEWS" | "CONVERSATION" | "UNKNOWN";
  data?: any;
  confidence: number;
}

/**
 * Parse une commande vocale et détermine l'action à effectuer
 */
export async function parseVoiceCommand(
  text: string,
  userId: string
): Promise<ParsedVoiceCommand> {
  const lowerText = text.toLowerCase().trim();

  // Détecter le type de commande
  if (isConversationCommand(lowerText)) {
    return await parseConversationCommand(text);
  } else if (isQuestionCommand(lowerText)) {
    return await parseQuestionCommand(text);
  } else if (isEventCommand(lowerText)) {
    return await parseEventCommand(text, userId);
  } else if (isRoutineCommand(lowerText)) {
    return await parseRoutineCommand(text, userId);
  } else if (isTaskCommand(lowerText)) {
    return await parseTaskCommand(text);
  }

  return {
    type: "UNKNOWN",
    action: "UNKNOWN",
    confidence: 0,
  };
}

/**
 * Détecte si c'est une commande d'événement
 */
function isEventCommand(text: string): boolean {
  const eventKeywords = [
    "créer un événement",
    "créer un rendez-vous",
    "ajouter un événement",
    "ajouter un rendez-vous",
    "planifier",
    "réunion",
    "rendez-vous",
    "événement",
    "demain à",
    "lundi à",
    "à",
  ];

  return eventKeywords.some((keyword) => text.includes(keyword));
}

/**
 * Détecte si c'est une commande de routine
 */
function isRoutineCommand(text: string): boolean {
  const routineKeywords = [
    "créer une automatisation",
    "créer une routine",
    "quand je dis",
    "quand je rentre",
    "tous les matins",
    "tous les soirs",
    "automatisation",
    "routine",
  ];

  return routineKeywords.some((keyword) => text.includes(keyword));
}

/**
 * Détecte si c'est une commande de tâche
 */
function isTaskCommand(text: string): boolean {
  const taskKeywords = [
    "créer une tâche",
    "ajouter une tâche",
    "nouvelle tâche",
    "tâche",
    "todo",
  ];

  return taskKeywords.some((keyword) => text.includes(keyword));
}

/**
 * Détecte si c'est une conversation générale
 */
function isConversationCommand(text: string): boolean {
  // Si ça ne correspond à aucune commande spécifique, c'est probablement une conversation
  const specificCommands = [
    "créer",
    "ajouter",
    "planifier",
    "quand je",
    "tous les",
    "automatisation",
    "routine",
    "tâche",
    "todo",
    "quel temps",
    "météo",
    "actualités",
    "cherche",
    "recherche",
    "trouve",
  ];

  // Si le texte contient un point d'interrogation ou commence par une question
  const isQuestion = text.includes("?") || 
    text.match(/^(qu'est-ce|comment|pourquoi|où|quand|qui|quel|quelle|quels|quelles)/i);

  // Si c'est une question et ne correspond à aucune commande spécifique
  if (isQuestion && !specificCommands.some((cmd) => text.toLowerCase().includes(cmd))) {
    return true;
  }

  // Si c'est une phrase de conversation (pas une commande)
  if (text.length > 20 && !specificCommands.some((cmd) => text.toLowerCase().includes(cmd))) {
    return true;
  }

  return false;
}

/**
 * Parse une commande de conversation
 */
async function parseConversationCommand(text: string): Promise<ParsedVoiceCommand> {
  return {
    type: "CONVERSATION",
    action: "CONVERSATION",
    data: {
      message: text,
    },
    confidence: 0.8,
  };
}

/**
 * Détecte si c'est une question (météo, actualités, etc.)
 */
function isQuestionCommand(text: string): boolean {
  const questionKeywords = [
    // Météo
    "quel temps",
    "quelle température",
    "météo",
    "temps qu'il fait",
    "temps qu'il fera",
    "il fera",
    "il fait",
    "combien de degrés",
    "quelle est la température",
    // Actualités
    "actualités",
    "actualité",
    "nouvelles",
    "nouvelle",
    "news",
    "informations",
    "information",
    "quelles sont les",
    "qu'est-ce qui se passe",
    "ce qui se passe",
    "dernières nouvelles",
    "dernière nouvelle",
    "cherche",
    "recherche",
    "trouve",
    "trouver",
    "donne-moi",
    "donne moi",
    "montre-moi",
    "montre moi",
    "affiche",
    "afficher",
  ];

  return questionKeywords.some((keyword) => text.includes(keyword));
}

/**
 * Parse une question (météo, actualités, etc.)
 */
async function parseQuestionCommand(text: string): Promise<ParsedVoiceCommand> {
  const lowerText = text.toLowerCase();
  
  // Détecter le type de question
  if (lowerText.includes("temps") || lowerText.includes("météo") || lowerText.includes("température")) {
    return {
      type: "QUESTION",
      action: "WEATHER",
      data: {
        question: text,
        type: "weather",
      },
      confidence: 0.9,
    };
  }

  // Détecter les questions d'actualités
  if (
    lowerText.includes("actualités") ||
    lowerText.includes("actualité") ||
    lowerText.includes("nouvelles") ||
    lowerText.includes("nouvelle") ||
    lowerText.includes("news") ||
    lowerText.includes("informations") ||
    lowerText.includes("information") ||
    lowerText.includes("cherche") ||
    lowerText.includes("recherche") ||
    lowerText.includes("trouve") ||
    lowerText.includes("trouver") ||
    lowerText.includes("donne-moi") ||
    lowerText.includes("donne moi") ||
    lowerText.includes("montre-moi") ||
    lowerText.includes("montre moi") ||
    lowerText.includes("affiche") ||
    lowerText.includes("afficher") ||
    lowerText.includes("quelles sont les") ||
    lowerText.includes("qu'est-ce qui se passe") ||
    lowerText.includes("ce qui se passe")
  ) {
    // Extraire le sujet de recherche
    let searchQuery = text;
    
    // Nettoyer les mots de commande
    const commandWords = [
      "cherche",
      "recherche",
      "trouve",
      "trouver",
      "donne-moi",
      "donne moi",
      "montre-moi",
      "montre moi",
      "affiche",
      "afficher",
      "les actualités sur",
      "l'actualité sur",
      "les nouvelles sur",
      "la nouvelle sur",
      "les informations sur",
      "l'information sur",
      "quelles sont les actualités sur",
      "quelles sont les nouvelles sur",
      "qu'est-ce qui se passe avec",
      "ce qui se passe avec",
    ];

    for (const word of commandWords) {
      if (lowerText.includes(word)) {
        searchQuery = text.replace(new RegExp(word, "gi"), "").trim();
        break;
      }
    }

    // Si c'est juste "actualités" ou "nouvelles", chercher les actualités générales
    if (!searchQuery || searchQuery === text) {
      if (lowerText.includes("actualités") || lowerText.includes("nouvelles")) {
        searchQuery = "actualités générales";
      }
    }

    // Détecter la catégorie si mentionnée
    let category: string | undefined;
    const categories = [
      "technologie",
      "tech",
      "business",
      "santé",
      "sante",
      "health",
      "science",
      "sport",
      "sports",
      "divertissement",
      "entertainment",
      "politique",
      "politics",
    ];

    for (const cat of categories) {
      if (lowerText.includes(cat)) {
        category = cat;
        break;
      }
    }

    return {
      type: "QUESTION",
      action: "NEWS",
      data: {
        question: text,
        type: "news",
        query: searchQuery || "actualités",
        category: category,
      },
      confidence: 0.85,
    };
  }

  return {
    type: "QUESTION",
    action: "UNKNOWN",
    data: {
      question: text,
    },
    confidence: 0.5,
  };
}

/**
 * Parse une commande d'événement
 */
async function parseEventCommand(
  text: string,
  userId: string
): Promise<ParsedVoiceCommand> {
  try {
    // Nettoyer le texte (enlever les mots de commande)
    let cleanedText = text
      .replace(/^(créer|ajouter|planifier)\s+(un\s+)?(événement|rendez-vous|réunion)\s*/i, "")
      .trim();

    // Si le texte est vide après nettoyage, utiliser le texte original
    if (!cleanedText) {
      cleanedText = text;
    }

    // Utiliser le parser d'événements existant
    const parsedEvent = await parseNaturalLanguageEvent(cleanedText);

    return {
      type: "EVENT",
      action: "CREATE",
      data: parsedEvent,
      confidence: parsedEvent.confidence || 0.8,
    };
  } catch (error) {
    console.error("[Voice Commands] Erreur parsing événement:", error);
    return {
      type: "EVENT",
      action: "CREATE",
      confidence: 0.3,
    };
  }
}

/**
 * Parse une commande de routine
 */
async function parseRoutineCommand(
  text: string,
  userId: string
): Promise<ParsedVoiceCommand> {
  try {
    // Nettoyer le texte
    let cleanedText = text
      .replace(/^(créer|ajouter)\s+(une\s+)?(automatisation|routine)\s*/i, "")
      .trim();

    if (!cleanedText) {
      cleanedText = text;
    }

    // Utiliser le parser de routines existant
    const parsedRoutine = await parseNaturalLanguageRoutine(cleanedText, userId);

    return {
      type: "ROUTINE",
      action: "CREATE",
      data: parsedRoutine,
      confidence: parsedRoutine.confidence || 0.8,
    };
  } catch (error) {
    console.error("[Voice Commands] Erreur parsing routine:", error);
    return {
      type: "ROUTINE",
      action: "CREATE",
      confidence: 0.3,
    };
  }
}

/**
 * Parse une commande de tâche (basique pour l'instant)
 */
async function parseTaskCommand(text: string): Promise<ParsedVoiceCommand> {
  // Nettoyer le texte
  let cleanedText = text
    .replace(/^(créer|ajouter)\s+(une\s+)?(tâche|todo)\s*/i, "")
    .trim();

  if (!cleanedText) {
    cleanedText = text;
  }

  // Extraction basique du titre
  const title = cleanedText.split(/[.,;]/)[0].trim() || cleanedText;

  return {
    type: "TASK",
    action: "CREATE",
    data: {
      title,
      description: cleanedText,
    },
    confidence: 0.7,
  };
}

