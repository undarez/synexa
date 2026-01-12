/**
 * Types et interfaces pour l'architecture multi-agents Cinexa
 * 
 * Cinexa Core Agent = Orchestrateur principal
 * Agents spécialisés = Domotique, Automatisation, Agenda, Sécurité, Finance
 * Supabase = Mémoire long terme, état, préférences
 */

/**
 * Source de la requête utilisateur
 */
export type CinexaSource = "dashboard" | "mobile" | "voice" | "routine" | "api";

/**
 * Intention détectée par le Core Agent
 */
export interface CinexaIntent {
  intent: string; // Ex: "create_automation", "control_device", "check_calendar"
  confidence: number; // 0.0 - 1.0
  requiredAgents: string[]; // ["domotic_agent", "automation_agent"]
  requiredData: string[]; // ["devices", "preferences", "calendar"]
  parameters?: Record<string, any>; // Paramètres extraits du message
}

/**
 * Plan d'action généré par le Core Agent
 */
export interface CinexaPlan {
  intent: string;
  steps: CinexaPlanStep[];
  estimatedDuration?: number; // en secondes
  requiresConfirmation?: boolean;
}

/**
 * Étape d'un plan d'action
 */
export interface CinexaPlanStep {
  agent: string; // "domotic_agent", "automation_agent", etc.
  action: string; // "turn_on_light", "create_rule", etc.
  input: Record<string, any>; // Données d'entrée pour l'agent
  dependencies?: string[]; // IDs des steps qui doivent s'exécuter avant
}

/**
 * Contexte utilisateur chargé depuis Supabase
 */
export interface CinexaUserContext {
  userId: string;
  profile: {
    name?: string;
    email?: string;
    preferences?: Record<string, any>;
    location?: {
      lat: number;
      lng: number;
    };
  };
  devices?: any[]; // Devices disponibles
  automations?: any[]; // Automatisations existantes
  calendar?: any[]; // Événements à venir
  memory?: CinexaMemory[]; // Mémoire long terme résumée
}

/**
 * Mémoire long terme (résumée, stockée dans Supabase)
 */
export interface CinexaMemory {
  id: string;
  userId: string;
  summary: string; // Résumé de l'interaction
  timestamp: string;
  intent?: string;
  agents?: string[];
  result?: string;
  tokens?: number; // Nombre de tokens utilisés
}

/**
 * Input standard pour un agent spécialisé
 */
export interface AgentInput {
  userId: string;
  action: string;
  parameters: Record<string, any>;
  context?: CinexaUserContext;
  metadata?: {
    source: CinexaSource;
    sessionId?: string;
    timestamp: string;
  };
}

/**
 * Output standard d'un agent spécialisé
 */
export interface AgentOutput {
  success: boolean;
  result?: any;
  error?: string;
  logs?: string[];
  requiresUserConfirmation?: boolean;
  nextActions?: string[]; // Actions suggérées
}

/**
 * Résultat d'exécution d'un plan complet
 */
export interface CinexaExecutionResult {
  intent: CinexaIntent;
  plan: CinexaPlan;
  steps: Array<{
    step: CinexaPlanStep;
    output: AgentOutput;
    duration: number;
  }>;
  totalDuration: number;
  success: boolean;
  userMessage: string; // Message formaté pour l'utilisateur
}

/**
 * Configuration d'un agent spécialisé
 */
export interface AgentConfig {
  name: string;
  description: string;
  capabilities: string[]; // Actions que l'agent peut exécuter
  requiredPermissions?: string[]; // Permissions nécessaires
  maxExecutionTime?: number; // Timeout en secondes
}

/**
 * Registre des agents disponibles
 */
export type AgentRegistry = Map<string, AgentConfig>;
