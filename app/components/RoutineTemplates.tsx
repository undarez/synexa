"use client";

import { Sparkles, Sun, Car, Home, Moon } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { RoutineTriggerType, RoutineActionType } from "@prisma/client";

export interface RoutineTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  triggerType: RoutineTriggerType;
  triggerData?: Record<string, unknown>;
  steps: Array<{
    actionType: RoutineActionType;
    payload?: Record<string, unknown>;
    delaySeconds?: number;
  }>;
}

const templates: RoutineTemplate[] = [
  {
    id: "morning-news",
    name: "Réveil intelligent",
    description: "Recevez les infos trafic et actualités à votre réveil",
    icon: <Sun className="h-5 w-5" />,
    triggerType: RoutineTriggerType.SCHEDULE,
    triggerData: { time: "07:00" },
    steps: [
      {
        actionType: RoutineActionType.NOTIFICATION,
        payload: {
          message: "🌅 Bon réveil ! Voici les infos trafic en temps réel pour votre trajet habituel.",
        },
        delaySeconds: 0,
      },
      {
        actionType: RoutineActionType.NOTIFICATION,
        payload: {
          message: "📰 Actualités du jour : [Votre journal préféré]",
        },
        delaySeconds: 2,
      },
      {
        actionType: RoutineActionType.TASK_CREATE,
        payload: {
          title: "Préparer le petit-déjeuner",
        },
        delaySeconds: 5,
      },
    ],
  },
  {
    id: "leave-work",
    name: "Départ au travail",
    description: "Préparez-vous au départ avec les infos essentielles",
    icon: <Car className="h-5 w-5" />,
    triggerType: RoutineTriggerType.VOICE,
    triggerData: { command: "Je pars" },
    steps: [
      {
        actionType: RoutineActionType.NOTIFICATION,
        payload: {
          message: "🌤️ Météo du jour : Température et conditions météo pour s'habiller en conséquence",
        },
        delaySeconds: 0,
      },
      {
        actionType: RoutineActionType.NOTIFICATION,
        payload: {
          message: "🚗 Trafic actuel : Infos trafic en temps réel pour votre trajet vers le travail",
        },
        delaySeconds: 2,
      },
      {
        actionType: RoutineActionType.NOTIFICATION,
        payload: {
          message: "💡 N'oubliez pas d'éteindre les lumières avant de partir !",
        },
        delaySeconds: 4,
      },
    ],
  },
  {
    id: "arrive-home",
    name: "Arrivée à la maison",
    description: "Créez une ambiance accueillante à votre arrivée",
    icon: <Home className="h-5 w-5" />,
    triggerType: RoutineTriggerType.LOCATION,
    triggerData: { radius: 100 },
    steps: [
      {
        actionType: RoutineActionType.NOTIFICATION,
        payload: {
          message: "🏠 Bienvenue à la maison ! Les lumières peuvent être allumées.",
        },
        delaySeconds: 0,
      },
      {
        actionType: RoutineActionType.NOTIFICATION,
        payload: {
          message: "🎵 Souhaitez-vous lancer votre playlist ?",
        },
        delaySeconds: 2,
      },
    ],
  },
  {
    id: "evening-relax",
    name: "Soirée détente",
    description: "Ambiance relaxante pour votre soirée",
    icon: <Moon className="h-5 w-5" />,
    triggerType: RoutineTriggerType.SCHEDULE,
    triggerData: { time: "20:00" },
    steps: [
      {
        actionType: RoutineActionType.NOTIFICATION,
        payload: {
          message: "🌙 Il est temps de se détendre. Pensez à baisser les lumières pour une ambiance cosy.",
        },
        delaySeconds: 0,
      },
      {
        actionType: RoutineActionType.TASK_CREATE,
        payload: {
          title: "Préparer le dîner",
        },
        delaySeconds: 3,
      },
    ],
  },
];

interface RoutineTemplatesProps {
  onSelectTemplate: (template: RoutineTemplate) => void;
}

export function RoutineTemplates({ onSelectTemplate }: RoutineTemplatesProps) {
  return (
    <div className="mb-8">
      <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        📋 Templates d'automatisations
      </h2>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Commencez rapidement avec des automatisations prêtes à l'emploi. 
        Vous pourrez les personnaliser après création.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id} className="hover:border-blue-300 dark:hover:border-blue-700">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                    {template.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {template.description}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 text-xs text-zinc-500 dark:text-zinc-500">
                {template.steps.length} étape{template.steps.length > 1 ? "s" : ""} • 
                Déclencheur : {template.triggerType === RoutineTriggerType.SCHEDULE ? "Programmé" : 
                template.triggerType === RoutineTriggerType.VOICE ? "Vocale" : 
                template.triggerType === RoutineTriggerType.LOCATION ? "Géolocalisation" : "Manuel"}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onSelectTemplate(template)}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Utiliser ce template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export { templates };

