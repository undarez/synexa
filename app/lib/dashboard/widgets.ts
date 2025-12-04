/**
 * Types et utilitaires pour les widgets du dashboard
 */

export type WidgetType =
  | "events"
  | "tasks"
  | "weather"
  | "traffic"
  | "health"
  | "finance"
  | "routines"
  | "news"
  | "wellness"
  | "recommendations"
  | "dailyBrief"
  | "voiceCommand"
  | "chatInterface"
  | "networkDetector"
  | "security"
  | "energy";

export type WidgetSize = "small" | "medium" | "large";

export interface WidgetConfig {
  widgetType: WidgetType;
  size: WidgetSize;
  position: number;
  column: number;
  row: number;
  visible: boolean;
  config?: Record<string, any>;
}

export interface WidgetDefinition {
  id: WidgetType;
  name: string;
  description: string;
  icon: string;
  defaultSize: WidgetSize;
  category: "organization" | "environment" | "wellness" | "domotique" | "communication";
}

export const AVAILABLE_WIDGETS: WidgetDefinition[] = [
  {
    id: "dailyBrief",
    name: "Brief Quotidien",
    description: "Résumé intelligent de votre journée",
    icon: "Sparkles",
    defaultSize: "large",
    category: "organization",
  },
  {
    id: "events",
    name: "Événements",
    description: "Vos événements et rendez-vous du jour",
    icon: "Calendar",
    defaultSize: "large",
    category: "organization",
  },
  {
    id: "tasks",
    name: "Tâches",
    description: "Vos tâches à faire",
    icon: "CheckSquare",
    defaultSize: "medium",
    category: "organization",
  },
  {
    id: "weather",
    name: "Météo",
    description: "Conditions météorologiques en temps réel",
    icon: "Cloud",
    defaultSize: "medium",
    category: "environment",
  },
  {
    id: "traffic",
    name: "Trafic",
    description: "Conditions de trafic autour de vous",
    icon: "Navigation",
    defaultSize: "medium",
    category: "environment",
  },
  {
    id: "health",
    name: "Santé",
    description: "Vos métriques de santé",
    icon: "Activity",
    defaultSize: "medium",
    category: "wellness",
  },
  {
    id: "finance",
    name: "Finance",
    description: "Votre situation financière",
    icon: "Wallet",
    defaultSize: "medium",
    category: "wellness",
  },
  {
    id: "routines",
    name: "Automatisations",
    description: "Vos routines actives",
    icon: "Zap",
    defaultSize: "small",
    category: "domotique",
  },
  {
    id: "wellness",
    name: "Bien-être",
    description: "Tableau de bord bien-être",
    icon: "Heart",
    defaultSize: "medium",
    category: "wellness",
  },
  {
    id: "recommendations",
    name: "Recommandations",
    description: "Suggestions personnalisées",
    icon: "Lightbulb",
    defaultSize: "small",
    category: "organization",
  },
  {
    id: "voiceCommand",
    name: "Commande Vocale",
    description: "Parlez à votre assistant",
    icon: "Mic",
    defaultSize: "medium",
    category: "communication",
  },
  {
    id: "chatInterface",
    name: "Chat",
    description: "Discutez avec Synexa",
    icon: "MessageSquare",
    defaultSize: "medium",
    category: "communication",
  },
  {
    id: "networkDetector",
    name: "Réseau",
    description: "Détection des devices",
    icon: "Wifi",
    defaultSize: "small",
    category: "domotique",
  },
  {
    id: "news",
    name: "Actualités",
    description: "Les dernières actualités",
    icon: "Newspaper",
    defaultSize: "medium",
    category: "communication",
  },
  {
    id: "security",
    name: "Sécurité",
    description: "Centre de contrôle de sécurité",
    icon: "Shield",
    defaultSize: "medium",
    category: "domotique",
  },
  {
    id: "energy",
    name: "Énergie",
    description: "Consommation électrique",
    icon: "Zap",
    defaultSize: "medium",
    category: "domotique",
  },
];

/**
 * Récupère les widgets par défaut pour un nouvel utilisateur
 */
export function getDefaultWidgets(): WidgetConfig[] {
  return [
    { widgetType: "dailyBrief", size: "large", position: 0, column: 1, row: 1, visible: true },
    { widgetType: "voiceCommand", size: "medium", position: 1, column: 1, row: 2, visible: true },
    { widgetType: "chatInterface", size: "medium", position: 2, column: 2, row: 2, visible: true },
    { widgetType: "events", size: "large", position: 3, column: 1, row: 3, visible: true },
    { widgetType: "wellness", size: "medium", position: 4, column: 3, row: 3, visible: true },
    { widgetType: "recommendations", size: "small", position: 5, column: 3, row: 4, visible: true },
    { widgetType: "networkDetector", size: "small", position: 6, column: 3, row: 5, visible: true },
    { widgetType: "tasks", size: "medium", position: 7, column: 3, row: 6, visible: true },
    { widgetType: "routines", size: "small", position: 8, column: 3, row: 7, visible: true },
  ];
}



