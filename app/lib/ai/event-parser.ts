import Groq from "groq-sdk";

// Initialiser Groq (gratuit avec limites généreuses)
// Alternative: Hugging Face, Together AI, ou améliorer le parser regex
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export interface ParsedEvent {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  attendees?: string[];
  confidence: number; // 0-1
}

/**
 * Parse un texte en langage naturel pour créer un événement
 * 
 * Exemples:
 * - "Réunion demain à 14h avec Jean"
 * - "Dentiste lundi prochain à 10h30"
 * - "Anniversaire de Marie le 15 décembre"
 * - "Conférence à Paris demain de 9h à 17h"
 */
export async function parseNaturalLanguageEvent(
  text: string,
  referenceDate: Date = new Date()
): Promise<ParsedEvent> {
  // Nettoyer le texte
  const cleanedText = text.trim();

  if (!cleanedText) {
    throw new Error("Le texte est vide");
  }

  // Si Groq est disponible, utiliser l'IA (gratuit)
  if (groq) {
    try {
      return await parseWithAI(cleanedText, referenceDate);
    } catch (error) {
      console.error("[Event Parser] Erreur Groq, fallback sur regex:", error);
      // Fallback sur regex si Groq échoue
      return parseWithRegex(cleanedText, referenceDate);
    }
  }

  // Sinon, utiliser le parser regex
  return parseWithRegex(cleanedText, referenceDate);
}

/**
 * Parse avec Groq (gratuit et rapide)
 */
async function parseWithAI(
  text: string,
  referenceDate: Date
): Promise<ParsedEvent> {
  if (!groq) {
    throw new Error("Groq non configuré");
  }

  const systemPrompt = `Tu es un assistant qui parse du texte en français pour créer des événements de calendrier.
Tu dois extraire:
- Le titre de l'événement
- La date et l'heure de début (par rapport à la date de référence: ${referenceDate.toISOString()})
- La date et l'heure de fin (si mentionnée, sinon estimer 1h après le début)
- Le lieu (si mentionné)
- La description (si mentionnée)
- Les participants (si mentionnés)
- Si c'est un événement toute la journée (allDay)

Réponds UNIQUEMENT avec un JSON valide dans ce format:
{
  "title": "Titre de l'événement",
  "description": "Description optionnelle",
  "location": "Lieu optionnel",
  "start": "2024-12-01T14:00:00Z",
  "end": "2024-12-01T15:00:00Z",
  "allDay": false,
  "attendees": ["nom1", "nom2"],
  "confidence": 0.9
}

Dates en ISO 8601 UTC. Si l'heure n'est pas mentionnée, utilise 9h par défaut.`;

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant", // Gratuit et rapide
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Réponse Groq vide");
  }

  const parsed = JSON.parse(content);
  
  return {
    title: parsed.title,
    description: parsed.description,
    location: parsed.location,
    start: new Date(parsed.start),
    end: new Date(parsed.end),
    allDay: parsed.allDay || false,
    attendees: parsed.attendees,
    confidence: parsed.confidence || 0.8,
  };
}

/**
 * Parse avec regex (fallback, moins précis mais fonctionne sans API)
 */
function parseWithRegex(text: string, referenceDate: Date): ParsedEvent {
  // Extraire le titre (tout le texte sauf les dates/heures)
  let title = text;
  
  // Patterns pour les dates/heures
  const timePattern = /(\d{1,2})h(?:(\d{2}))?/gi;
  const datePattern = /(demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|aujourd'hui|hier|\d{1,2}\/\d{1,2}|\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre))/gi;
  
  // Extraire l'heure
  const timeMatch = text.match(timePattern);
  let hour = 9; // Par défaut 9h
  let minute = 0;
  
  if (timeMatch) {
    const firstTime = timeMatch[0];
    const hourMatch = firstTime.match(/(\d{1,2})h/);
    if (hourMatch) {
      hour = parseInt(hourMatch[1], 10);
      const minuteMatch = firstTime.match(/h(\d{2})/);
      if (minuteMatch) {
        minute = parseInt(minuteMatch[1], 10);
      }
    }
    // Retirer l'heure du titre
    title = title.replace(timePattern, "").trim();
  }
  
  // Calculer la date
  let startDate = new Date(referenceDate);
  startDate.setHours(hour, minute, 0, 0);
  
  // Gérer les jours relatifs
  const lowerText = text.toLowerCase();
  if (lowerText.includes("demain")) {
    startDate.setDate(startDate.getDate() + 1);
    title = title.replace(/demain/gi, "").trim();
  } else if (lowerText.includes("après-demain")) {
    startDate.setDate(startDate.getDate() + 2);
    title = title.replace(/après-demain/gi, "").trim();
  } else if (lowerText.includes("aujourd'hui")) {
    // Déjà la date de référence
    title = title.replace(/aujourd'hui/gi, "").trim();
  }
  
  // Gérer les jours de la semaine
  const daysOfWeek = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  for (let i = 0; i < daysOfWeek.length; i++) {
    if (lowerText.includes(daysOfWeek[i])) {
      const currentDay = referenceDate.getDay();
      let daysToAdd = i - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7; // Semaine prochaine
      startDate.setDate(referenceDate.getDate() + daysToAdd);
      title = title.replace(new RegExp(daysOfWeek[i], "gi"), "").trim();
      break;
    }
  }
  
  // Extraire le lieu (mots-clés: "à", "chez", "dans")
  let location: string | undefined;
  const locationPattern = /(?:à|chez|dans)\s+([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþ\s]+?)(?:\s|$|,|\.)/i;
  const locationMatch = text.match(locationPattern);
  if (locationMatch) {
    location = locationMatch[1].trim();
    title = title.replace(locationPattern, "").trim();
  }
  
  // Extraire les participants (mots après "avec", "et")
  const attendees: string[] = [];
  const attendeePattern = /(?:avec|et)\s+([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþ]+(?:\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþ]+)?)/g;
  const attendeeMatches = text.matchAll(attendeePattern);
  for (const match of attendeeMatches) {
    attendees.push(match[1].trim());
    title = title.replace(new RegExp(`(?:avec|et)\\s+${match[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "gi"), "").trim();
  }
  
  // Nettoyer le titre (supprimer les mots vides, ponctuation en fin)
  title = title.replace(/^[,\s]+|[,\s]+$/g, "").replace(/\s+/g, " ");
  if (!title) {
    title = "Nouvel événement";
  }
  
  // Calculer la fin (1h après le début par défaut)
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 1);
  
  // Vérifier si c'est toute la journée (mots-clés: "toute la journée", "journée")
  const allDay = lowerText.includes("toute la journée") || lowerText.includes("journée complète");
  
  return {
    title,
    location,
    start: startDate,
    end: endDate,
    allDay,
    attendees: attendees.length > 0 ? attendees : undefined,
    confidence: 0.7, // Moins confiant avec regex
  };
}

