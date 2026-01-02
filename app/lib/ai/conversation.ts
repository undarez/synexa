/**
 * Système de conversation avec IA
 * Utilise Groq pour des réponses intelligentes
 */

import Groq from "groq-sdk";
import { 
  getSynexaSystemPrompt, 
  needsRedirect, 
  getSynexaRedirectMessage,
  formatSynexaResponse 
} from "./synexa-personality";

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ConversationContext {
  messages: ConversationMessage[];
  userId?: string;
  sessionId?: string;
  userHabits?: string[];
  userPreferences?: Record<string, any>;
  recentActivity?: string[];
}

/**
 * Génère une réponse conversationnelle avec contexte
 */
export async function generateConversationResponse(
  userMessage: string,
  context?: ConversationContext,
  forTTS: boolean = false
): Promise<{
  response: string;
  needsWebSearch?: boolean;
  searchQuery?: string;
  needsServiceSearch?: boolean;
  serviceQuery?: string;
  needsPriceSearch?: boolean;
  priceQuery?: string;
}> {
  // Si Groq n'est pas configuré, utiliser un fallback
  if (!groq) {
    return generateFallbackResponse(userMessage, context);
  }

  try {
    // Vérifier si une redirection est nécessaire (médical, juridique, financier)
    const redirectType = needsRedirect(userMessage);
    if (redirectType) {
      return {
        response: getSynexaRedirectMessage(redirectType),
        needsWebSearch: false,
        needsServiceSearch: false,
        needsPriceSearch: false,
      };
    }

    // Générer le prompt système avec la personnalité complète de Synexa
    // Utiliser la version TTS si c'est pour la synthèse vocale
    const systemPrompt = getSynexaSystemPrompt(
      {
        userHabits: context?.userHabits,
        userPreferences: context?.userPreferences,
        recentActivity: context?.recentActivity,
      },
      forTTS
    );

    // Construire l'historique de conversation
    const messages: ConversationMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    // Ajouter l'historique si disponible
    if (context?.messages) {
      messages.push(...context.messages.slice(-10)); // Garder les 10 derniers messages
    }

    // Ajouter le message de l'utilisateur
    messages.push({
      role: "user",
      content: userMessage,
    });

    // Analyser le message pour détecter les besoins
    const needsWebSearch = detectWebSearchNeeds(userMessage);
    const needsServiceSearch = detectServiceSearchNeeds(userMessage);
    const needsPriceSearch = detectPriceSearchNeeds(userMessage);

    // Générer la réponse avec Groq
    // Utiliser un modèle actuel (llama-3.1-8b-instant est rapide et gratuit)
    const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    
    const completion = await groq.chat.completions.create({
      messages: messages as any,
      model: model,
      temperature: 0.7,
      max_tokens: 500,
    });

    let response = completion.choices[0]?.message?.content || "";
    
    // Formater la réponse pour respecter le style de Synexa
    // Utiliser le formatage TTS si c'est pour la synthèse vocale
    response = formatSynexaResponse(response, forTTS);

    return {
      response,
      needsWebSearch,
      searchQuery: needsWebSearch ? extractSearchQuery(userMessage) : undefined,
      needsServiceSearch,
      serviceQuery: needsServiceSearch ? extractServiceQuery(userMessage) : undefined,
      needsPriceSearch,
      priceQuery: needsPriceSearch ? extractPriceQuery(userMessage) : undefined,
    };
  } catch (error) {
    console.error("[Conversation] Erreur Groq:", error);
    return generateFallbackResponse(userMessage, context);
  }
}

/**
 * Récupère le contexte utilisateur pour enrichir les réponses de Synexa
 */
export async function getUserContextForSynexa(userId: string): Promise<{
  userHabits?: string[];
  userPreferences?: Record<string, any>;
  recentActivity?: string[];
}> {
  try {
    // Importer dynamiquement pour éviter les dépendances circulaires
    const { detectPatterns } = await import("@/app/lib/learning/patterns");
    const { getRecentActivities } = await import("@/app/lib/learning/tracker");
    
    // Récupérer les patterns détectés (habitudes)
    const patterns = await detectPatterns(userId);
    const userHabits = patterns
      .slice(0, 5) // Limiter à 5 habitudes principales
      .map(p => `${p.pattern} (${p.confidence > 0.7 ? 'fréquent' : 'occasionnel'})`);

    // Récupérer les activités récentes
    const recentActivities = await getRecentActivities(userId, 7); // 7 derniers jours
    const recentActivity = recentActivities
      .slice(0, 5) // Limiter à 5 activités récentes
      .map(a => a.activityType);

    return {
      userHabits,
      recentActivity,
      // Les préférences peuvent être ajoutées plus tard depuis la base de données
      userPreferences: {},
    };
  } catch (error) {
    console.error("[Conversation] Erreur lors de la récupération du contexte:", error);
    return {};
  }
}

/**
 * Détecte si une recherche web est nécessaire
 */
function detectWebSearchNeeds(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const searchKeywords = [
    "prix",
    "coût",
    "combien coûte",
    "cherche",
    "recherche",
    "trouve",
    "information sur",
    "qu'est-ce que",
    "c'est quoi",
    "définition",
    "actualité",
    "nouvelle",
    "dernière",
    "récent",
  ];

  return searchKeywords.some((keyword) => lowerMessage.includes(keyword));
}

/**
 * Détecte si une recherche de service est nécessaire
 */
function detectServiceSearchNeeds(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const serviceKeywords = [
    "service",
    "professionnel",
    "entreprise",
    "magasin",
    "restaurant",
    "médecin",
    "dentiste",
    "plombier",
    "électricien",
    "réparateur",
    "où trouver",
    "adresse de",
    "téléphone de",
  ];

  return serviceKeywords.some((keyword) => lowerMessage.includes(keyword));
}

/**
 * Détecte si une recherche de prix est nécessaire
 */
function detectPriceSearchNeeds(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const priceKeywords = [
    "prix",
    "coût",
    "combien coûte",
    "tarif",
    "acheter",
    "vendre",
    "comparer",
    "moins cher",
    "bon marché",
  ];

  return priceKeywords.some((keyword) => lowerMessage.includes(keyword));
}

/**
 * Extrait la requête de recherche du message
 */
function extractSearchQuery(message: string): string {
  // Nettoyer les mots de commande
  const cleaned = message
    .replace(/^(cherche|recherche|trouve|donne-moi|montre-moi|affiche)\s+/i, "")
    .replace(/\s+(prix|coût|tarif|information|sur|concernant)\s+/gi, " ")
    .trim();

  return cleaned || message;
}

/**
 * Extrait la requête de service du message
 */
function extractServiceQuery(message: string): string {
  const cleaned = message
    .replace(/^(où trouver|trouve|cherche)\s+/i, "")
    .replace(/\s+(service|professionnel|entreprise|magasin|restaurant|médecin|dentiste|plombier|électricien|réparateur)\s*/gi, "")
    .trim();

  return cleaned || message;
}

/**
 * Extrait la requête de prix du message
 */
function extractPriceQuery(message: string): string {
  const cleaned = message
    .replace(/^(combien coûte|prix de|coût de|tarif de)\s+/i, "")
    .replace(/\s+(prix|coût|tarif)\s*/gi, "")
    .trim();

  return cleaned || message;
}

/**
 * Réponse de fallback si Groq n'est pas disponible
 */
function generateFallbackResponse(
  message: string,
  context?: ConversationContext
): {
  response: string;
  needsWebSearch?: boolean;
  searchQuery?: string;
  needsServiceSearch?: boolean;
  serviceQuery?: string;
  needsPriceSearch?: boolean;
  priceQuery?: string;
} {
  const lowerMessage = message.toLowerCase();

  // Détecter les besoins
  const needsWebSearch = detectWebSearchNeeds(lowerMessage);
  const needsServiceSearch = detectServiceSearchNeeds(lowerMessage);
  const needsPriceSearch = detectPriceSearchNeeds(lowerMessage);

  let response = "";

  if (needsPriceSearch) {
    response = `D'accord, je vais rechercher le prix de "${extractPriceQuery(message)}" pour toi.`;
  } else if (needsServiceSearch) {
    response = `Je vais rechercher des services pour "${extractServiceQuery(message)}".`;
  } else if (needsWebSearch) {
    response = `Je vais rechercher des informations sur "${extractSearchQuery(message)}" pour toi.`;
  } else {
    response = "D'accord, je comprends ta demande. Pour des réponses plus précises, configure GROQ_API_KEY dans ton .env. En attendant, je peux t'aider avec tes calendriers, tâches et rappels. Que veux-tu faire ?";
  }

  return {
    response,
    needsWebSearch,
    searchQuery: needsWebSearch ? extractSearchQuery(message) : undefined,
    needsServiceSearch,
    serviceQuery: needsServiceSearch ? extractServiceQuery(message) : undefined,
    needsPriceSearch,
    priceQuery: needsPriceSearch ? extractPriceQuery(message) : undefined,
  };
}

