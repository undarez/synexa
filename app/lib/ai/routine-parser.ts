import Groq from "groq-sdk";
import { RoutineTriggerType, RoutineActionType } from "@prisma/client";
import prisma from "@/app/lib/prisma";

// Initialiser Groq (gratuit)
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export interface ParsedRoutine {
  name: string;
  description?: string;
  triggerType: RoutineTriggerType;
  triggerData: Record<string, unknown>;
  steps: Array<{
    actionType: RoutineActionType;
    payload?: Record<string, unknown>;
    deviceId?: string | null;
    delaySeconds?: number | null;
    order: number;
  }>;
  confidence: number;
}

/**
 * Parse un texte en langage naturel pour créer une routine
 * 
 * Exemples:
 * - "Quand je dis 'Bonjour', allumer les lumières et lire les nouvelles"
 * - "Tous les matins à 7h, allumer le chauffage et ouvrir les volets"
 * - "Quand je rentre à la maison, allumer les lumières et mettre de la musique"
 * - "Tous les soirs à 22h, éteindre les lumières et activer le mode nuit"
 */
export async function parseNaturalLanguageRoutine(
  text: string,
  userId: string
): Promise<ParsedRoutine> {
  const cleanedText = text.trim();

  if (!cleanedText) {
    throw new Error("Le texte est vide");
  }

  // Récupérer les devices de l'utilisateur pour le matching
  const userDevices = await prisma.device.findMany({
    where: { userId },
    select: { id: true, name: true, type: true },
  });

  // Si Groq est disponible, utiliser l'IA
  if (groq) {
    try {
      return await parseWithAI(cleanedText, userId, userDevices);
    } catch (error) {
      console.error("[Routine Parser] Erreur Groq, fallback sur regex:", error);
      return parseWithRegex(cleanedText, userId, userDevices);
    }
  }

  // Sinon, utiliser le parser regex
  return parseWithRegex(cleanedText, userId, userDevices);
}

/**
 * Parse avec Groq (plus précis)
 */
async function parseWithAI(
  text: string,
  userId: string,
  devices: Array<{ id: string; name: string; type: string }>
): Promise<ParsedRoutine> {
  if (!groq) {
    throw new Error("Groq non configuré");
  }

  const devicesList = devices.map(d => `${d.name} (${d.type})`).join(", ") || "Aucun";

  const systemPrompt = `Tu es Synexa, l'assistante personnelle intelligente. Tu parses du texte en français pour créer des automatisations (routines).

Ton style : chaleureux, professionnel, simple. Tu anticipes les besoins sans imposer.

Types de triggers disponibles:
- VOICE: Déclenché par commande vocale (ex: "Quand je dis 'X'")
- SCHEDULE: Déclenché à une heure précise (ex: "Tous les matins à 7h", "Tous les soirs à 22h")
- LOCATION: Déclenché par géolocalisation (ex: "Quand je rentre", "Quand je sors")
- MANUAL: Déclenché manuellement
- SENSOR: Déclenché par un capteur

Types d'actions disponibles:
- DEVICE_COMMAND: Commander un appareil (allumer, éteindre, régler température, etc.)
- NOTIFICATION: Envoyer une notification
- TASK_CREATE: Créer une tâche
- MEDIA_PLAY: Lire de la musique/média
- CUSTOM: Action personnalisée

Devices disponibles: ${devicesList}

Réponds UNIQUEMENT avec un JSON valide dans ce format:
{
  "name": "Nom de la routine",
  "description": "Description optionnelle",
  "triggerType": "VOICE|SCHEDULE|LOCATION|MANUAL|SENSOR",
  "triggerData": {
    "command": "bonjour" // pour VOICE
    // ou "time": "07:00", "days": ["monday", "tuesday"] // pour SCHEDULE
    // ou "location": "home", "action": "enter" // pour LOCATION
  },
  "steps": [
    {
      "actionType": "DEVICE_COMMAND",
      "payload": { "action": "turn_on", "brightness": 100 },
      "deviceId": "device_id_ou_null",
      "delaySeconds": 0,
      "order": 0
    }
  ],
  "confidence": 0.9
}

Pour DEVICE_COMMAND, utilise les noms de devices disponibles pour matcher.`;

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
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
  
  // Matcher les devices par nom
  const matchedSteps = parsed.steps.map((step: any, index: number) => {
    if (step.actionType === "DEVICE_COMMAND" && step.deviceName) {
      const device = devices.find(
        d => d.name.toLowerCase().includes(step.deviceName.toLowerCase()) ||
             step.deviceName.toLowerCase().includes(d.name.toLowerCase())
      );
      if (device) {
        step.deviceId = device.id;
      }
      delete step.deviceName;
    }
    return {
      ...step,
      order: index,
    };
  });

  return {
    name: parsed.name,
    description: parsed.description,
    triggerType: parsed.triggerType as RoutineTriggerType,
    triggerData: parsed.triggerData || {},
    steps: matchedSteps,
    confidence: parsed.confidence || 0.8,
  };
}

/**
 * Parse avec regex (fallback)
 */
function parseWithRegex(
  text: string,
  userId: string,
  devices: Array<{ id: string; name: string; type: string }>
): ParsedRoutine {
  const lowerText = text.toLowerCase();
  let triggerType: RoutineTriggerType = RoutineTriggerType.MANUAL;
  const triggerData: Record<string, unknown> = {};
  const steps: ParsedRoutine["steps"] = [];

  // Détecter le type de trigger
  if (lowerText.includes("quand je dis") || lowerText.includes("si je dis")) {
    triggerType = RoutineTriggerType.VOICE;
    const commandMatch = text.match(/(?:quand je dis|si je dis)\s+['"]([^'"]+)['"]/i);
    if (commandMatch) {
      triggerData.command = commandMatch[1].toLowerCase();
    }
  } else if (lowerText.includes("tous les") || lowerText.includes("chaque") || lowerText.match(/\d{1,2}h/)) {
    triggerType = RoutineTriggerType.SCHEDULE;
    // Extraire l'heure
    const timeMatch = text.match(/(\d{1,2})h(?:(\d{2}))?/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1], 10);
      const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      triggerData.time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    }
    // Extraire les jours
    const days: string[] = [];
    if (lowerText.includes("matin")) days.push("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday");
    if (lowerText.includes("soir")) days.push("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday");
    if (lowerText.includes("lundi")) days.push("monday");
    if (lowerText.includes("mardi")) days.push("tuesday");
    if (lowerText.includes("mercredi")) days.push("wednesday");
    if (lowerText.includes("jeudi")) days.push("thursday");
    if (lowerText.includes("vendredi")) days.push("friday");
    if (lowerText.includes("samedi")) days.push("saturday");
    if (lowerText.includes("dimanche")) days.push("sunday");
    if (days.length > 0) {
      triggerData.days = [...new Set(days)];
    }
  } else if (lowerText.includes("quand je rentre") || lowerText.includes("quand j'arrive") || lowerText.includes("à la maison")) {
    triggerType = RoutineTriggerType.LOCATION;
    triggerData.location = "home";
    triggerData.action = "enter";
  } else if (lowerText.includes("quand je sors") || lowerText.includes("quand je pars")) {
    triggerType = RoutineTriggerType.LOCATION;
    triggerData.location = "home";
    triggerData.action = "exit";
  }

  // Extraire le nom de la routine
  let name = text;
  if (name.length > 50) {
    name = name.substring(0, 47) + "...";
  }

  // Parser les actions
  const actionKeywords: Record<string, { action: string; payload?: Record<string, unknown> }> = {
    "allumer": { action: "turn_on" },
    "allume": { action: "turn_on" },
    "éteindre": { action: "turn_off" },
    "éteint": { action: "turn_off" },
    "ouvrir": { action: "open" },
    "fermer": { action: "close" },
    "régler": { action: "set" },
    "mettre": { action: "play" },
    "lire": { action: "play" },
    "jouer": { action: "play" },
    "activer": { action: "turn_on" },
    "désactiver": { action: "turn_off" },
    "desactiver": { action: "turn_off" },
  };

  // Extraire les actions avec leurs devices associés
  let order = 0;
  
  // D'abord, chercher les patterns "action + device"
  const actionPatterns = [
    /(allumer|allume|éteindre|éteint|ouvrir|fermer|régler|mettre|lire|jouer|activer|désactiver)\s+(?:les\s+)?([^,\s]+)/gi,
    /([^,\s]+)\s+(?:les\s+)?(?:lumières|lumiere|chauffage|volets|volet|musique|radio|télévision|television)/gi,
  ];

  // Chercher les devices mentionnés avec leurs actions
  for (const device of devices) {
    const deviceNameLower = device.name.toLowerCase();
    const deviceWords = deviceNameLower.split(/\s+/);
    
    // Vérifier si le device est mentionné dans le texte
    const deviceMentioned = deviceWords.some(word => 
      word.length > 2 && lowerText.includes(word)
    ) || lowerText.includes(deviceNameLower);

    if (deviceMentioned) {
      // Chercher l'action associée (avant ou après le nom du device)
      for (const [keyword, actionData] of Object.entries(actionKeywords)) {
        const keywordIndex = lowerText.indexOf(keyword);
        const deviceIndex = lowerText.indexOf(deviceNameLower);
        
        // Si l'action est proche du device (dans les 20 caractères)
        if (keywordIndex !== -1 && deviceIndex !== -1 && Math.abs(keywordIndex - deviceIndex) < 20) {
          steps.push({
            actionType: RoutineActionType.DEVICE_COMMAND,
            payload: actionData.payload || { action: actionData.action },
            deviceId: device.id,
            delaySeconds: null,
            order: order++,
          });
          break;
        }
      }
    }
  }

  // Si pas de device trouvé, chercher des actions génériques
  if (steps.length === 0) {
    if (lowerText.includes("notification") || lowerText.includes("notifier") || lowerText.includes("envoyer")) {
      const messageMatch = text.match(/(?:notification|notifier|envoyer)\s+(?:un\s+)?(?:message\s+)?['"]?([^'"]+)['"]?/i);
      steps.push({
        actionType: RoutineActionType.NOTIFICATION,
        payload: { 
          message: messageMatch ? messageMatch[1] : "Routine exécutée" 
        },
        deviceId: null,
        delaySeconds: null,
        order: order++,
      });
    } else if (lowerText.includes("créer") || lowerText.includes("créer une tâche")) {
      const taskMatch = text.match(/(?:créer|creer)\s+(?:une\s+)?(?:tâche|tache)\s+['"]?([^'"]+)['"]?/i);
      steps.push({
        actionType: RoutineActionType.TASK_CREATE,
        payload: { 
          title: taskMatch ? taskMatch[1] : "Nouvelle tâche" 
        },
        deviceId: null,
        delaySeconds: null,
        order: order++,
      });
    } else if (lowerText.includes("lire") || lowerText.includes("mettre") || lowerText.includes("jouer")) {
      const mediaMatch = text.match(/(?:lire|mettre|jouer)\s+(?:de\s+la\s+)?(?:musique|radio|audio)\s*(?:['"]([^'"]+)['"])?/i);
      steps.push({
        actionType: RoutineActionType.MEDIA_PLAY,
        payload: { 
          media: mediaMatch && mediaMatch[1] ? mediaMatch[1] : "musique" 
        },
        deviceId: null,
        delaySeconds: null,
        order: order++,
      });
    }
  }

  // Si aucune action trouvée, créer une action générique
  if (steps.length === 0) {
    steps.push({
      actionType: RoutineActionType.CUSTOM,
      payload: { description: text },
      deviceId: null,
      delaySeconds: null,
      order: 0,
    });
  }

  return {
    name,
    description: `Routine créée depuis: "${text}"`,
    triggerType,
    triggerData,
    steps,
    confidence: 0.6,
  };
}

