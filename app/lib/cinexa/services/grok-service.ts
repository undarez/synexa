/**
 * Service Grok pour Cinexa Core Agent
 * 
 * Responsabilités :
 * - Analyser l'intention utilisateur
 * - Construire un plan d'action
 * 
 * ⚠️ IMPORTANT : Grok est stateless. Toute la mémoire vient de Supabase.
 */

import { Groq } from "groq-sdk";
import type { CinexaIntent, CinexaPlan, CinexaUserContext, CinexaSource } from "../types";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Analyse l'intention de l'utilisateur
 */
export async function analyzeIntent(params: {
  message: string;
  context: CinexaUserContext;
  source: CinexaSource;
}): Promise<CinexaIntent | null> {
  try {
    // Construire le prompt pour l'analyse d'intention
    const prompt = buildIntentAnalysisPrompt(params);

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Tu es Cinexa Core Agent, l'orchestrateur d'un système multi-agents.
Tu analyses les intentions utilisateur et décides quels agents spécialisés appeler.

Agents disponibles :
- domotic_agent : Contrôle des devices (lumières, prises, etc.)
- automation_agent : Création et gestion d'automatisations
- calendar_agent : Gestion du calendrier et événements
- security_agent : Sécurité et monitoring
- finance_agent : Gestion financière
- traffic_agent : Trafic et transport
- weather_agent : Météo

Tu dois répondre UNIQUEMENT en JSON avec ce format :
{
  "intent": "nom_intention",
  "confidence": 0.0-1.0,
  "requiredAgents": ["agent1", "agent2"],
  "requiredData": ["devices", "preferences"],
  "parameters": {}
}`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content);
    return {
      intent: parsed.intent || "unknown",
      confidence: parsed.confidence || 0,
      requiredAgents: parsed.requiredAgents || [],
      requiredData: parsed.requiredData || [],
      parameters: parsed.parameters || {},
    };
  } catch (error) {
    console.error("[Cinexa Grok] Erreur analyse intention:", error);
    return null;
  }
}

/**
 * Construit un plan d'action basé sur l'intention
 */
export async function buildPlan(params: {
  intent: CinexaIntent;
  context: CinexaUserContext;
}): Promise<CinexaPlan> {
  try {
    const prompt = buildPlanPrompt(params);

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Tu es Cinexa Core Agent. Tu construis un plan d'action structuré.

Réponds UNIQUEMENT en JSON avec ce format :
{
  "intent": "nom_intention",
  "steps": [
    {
      "agent": "nom_agent",
      "action": "nom_action",
      "input": {},
      "dependencies": []
    }
  ],
  "estimatedDuration": 0,
  "requiresConfirmation": false
}`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        intent: params.intent.intent,
        steps: [],
      };
    }

    const parsed = JSON.parse(content);
    return {
      intent: parsed.intent || params.intent.intent,
      steps: parsed.steps || [],
      estimatedDuration: parsed.estimatedDuration,
      requiresConfirmation: parsed.requiresConfirmation || false,
    };
  } catch (error) {
    console.error("[Cinexa Grok] Erreur construction plan:", error);
    return {
      intent: params.intent.intent,
      steps: [],
    };
  }
}

/**
 * Construit le prompt pour l'analyse d'intention
 */
function buildIntentAnalysisPrompt(params: {
  message: string;
  context: CinexaUserContext;
  source: CinexaSource;
}): string {
  const { message, context, source } = params;

  let prompt = `Message utilisateur : "${message}"
Source : ${source}

Contexte utilisateur :
- Nom : ${context.profile.name}
- Devices disponibles : ${context.devices?.length || 0}
- Automatisations actives : ${context.automations?.length || 0}
- Événements à venir : ${context.calendar?.length || 0}
`;

  // Ajouter la mémoire récente si disponible
  if (context.memory && context.memory.length > 0) {
    prompt += `\nMémoire récente (${context.memory.length} entrées) :\n`;
    context.memory.slice(0, 3).forEach((m, i) => {
      prompt += `${i + 1}. ${m.summary} (${m.intent})\n`;
    });
  }

  prompt += `\nAnalyse l'intention et détermine quels agents appeler.`;

  return prompt;
}

/**
 * Construit le prompt pour la construction du plan
 */
function buildPlanPrompt(params: {
  intent: CinexaIntent;
  context: CinexaUserContext;
}): string {
  const { intent, context } = params;

  let prompt = `Intention détectée : ${intent.intent}
Confiance : ${intent.confidence}
Agents requis : ${intent.requiredAgents.join(", ")}
Données requises : ${intent.requiredData.join(", ")}
Paramètres : ${JSON.stringify(intent.parameters)}

Contexte disponible :
- Devices : ${context.devices?.length || 0} disponibles
- Automatisations : ${context.automations?.length || 0} actives
`;

  // Ajouter les devices disponibles si nécessaire
  if (intent.requiredData.includes("devices") && context.devices) {
    prompt += `\nDevices disponibles :\n`;
    context.devices.slice(0, 5).forEach((device: any) => {
      prompt += `- ${device.name} (${device.type}) - ${device.status}\n`;
    });
  }

  prompt += `\nConstruis un plan d'action détaillé avec les étapes nécessaires.`;

  return prompt;
}
