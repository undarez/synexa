"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
import {
  GripVertical,
  Eye,
  EyeOff,
  Settings,
  Plus,
  X,
  Sparkles,
  Calendar,
  CheckSquare,
  Cloud,
  Navigation as NavigationIcon,
  Activity,
  Wallet,
  Zap,
  Heart,
  Lightbulb,
  Mic,
  MessageSquare,
  Wifi,
  Bot,
} from "lucide-react";
import { WidgetType, WidgetConfig, AVAILABLE_WIDGETS } from "@/app/lib/dashboard/widgets";
import { EventsList } from "@/app/components/EventsList";
import { TasksList } from "@/app/components/TasksList";
import { RoutinesList } from "@/app/components/RoutinesList";
import { NetworkDetector } from "@/app/components/NetworkDetector";
import { VoiceCommandWrapper } from "@/app/components/VoiceCommandWrapper";
import { DailyBrief } from "@/app/components/DailyBrief";
import { ChatInterface } from "@/app/components/ChatInterface";
import { PersonalizedRecommendations } from "@/app/components/PersonalizedRecommendations";
import { WellnessDashboard } from "@/app/components/WellnessDashboard";
import dynamic from "next/dynamic";

// Charger les composants météo et trafic dynamiquement
const WeatherWidget = dynamic(() => import("@/app/components/WeatherWidget").then(mod => ({ default: mod.WeatherWidget })), {
  ssr: false,
  loading: () => <div className="h-32 flex items-center justify-center">Chargement...</div>,
});

const TrafficWidget = dynamic(() => import("@/app/components/TrafficWidget").then(mod => ({ default: mod.TrafficWidget })), {
  ssr: false,
  loading: () => <div className="h-32 flex items-center justify-center">Chargement...</div>,
});

const HealthWidget = dynamic(() => import("@/app/components/HealthWidget").then(mod => ({ default: mod.HealthWidget })), {
  ssr: false,
  loading: () => <div className="h-32 flex items-center justify-center">Chargement...</div>,
});

const FinanceWidget = dynamic(() => import("@/app/components/FinanceWidget").then(mod => ({ default: mod.FinanceWidget })), {
  ssr: false,
  loading: () => <div className="h-32 flex items-center justify-center">Chargement...</div>,
});

interface DashboardWidgetManagerProps {
  events?: any[];
  tasks?: any[];
  routines?: any[];
}

const iconMap: Record<string, any> = {
  Sparkles,
  Calendar,
  CheckSquare,
  Cloud,
  Navigation: NavigationIcon,
  Activity,
  Wallet,
  Zap,
  Heart,
  Lightbulb,
  Mic,
  MessageSquare,
  Wifi,
  Bot,
};

export function DashboardWidgetManager({
  events = [],
  tasks = [],
  routines = [],
}: DashboardWidgetManagerProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetchWidgets();
    fetchSuggestions();
  }, []);

  const fetchWidgets = async () => {
    try {
      const response = await fetch("/api/dashboard/widgets");
      const data = await response.json();
      setWidgets(data.widgets || []);
    } catch (error) {
      console.error("Erreur lors du chargement des widgets:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await fetch("/api/dashboard/widgets/suggestions");
      const data = await response.json();
      setSuggestions(data.suggestions || []);
      if (data.suggestions && data.suggestions.length > 0) {
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des suggestions:", error);
    }
  };

  const toggleWidgetVisibility = async (widgetType: WidgetType) => {
    const widget = widgets.find((w) => w.widgetType === widgetType);
    if (!widget) return;

    try {
      await fetch("/api/dashboard/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...widget,
          visible: !widget.visible,
        }),
      });
      fetchWidgets();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    }
  };

  const addWidget = async (widgetType: WidgetType) => {
    const widgetDef = AVAILABLE_WIDGETS.find((w) => w.id === widgetType);
    if (!widgetDef) return;

    const maxPosition = Math.max(...widgets.map((w) => w.position), -1);
    const newWidget: WidgetConfig = {
      widgetType,
      size: widgetDef.defaultSize,
      position: maxPosition + 1,
      column: 1,
      row: 1,
      visible: true,
    };

    try {
      await fetch("/api/dashboard/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWidget),
      });
      fetchWidgets();
      setShowSuggestions(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
    }
  };

  const removeWidget = async (widgetType: WidgetType) => {
    try {
      await fetch(`/api/dashboard/widgets?widgetType=${widgetType}`, {
        method: "DELETE",
      });
      fetchWidgets();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  const renderWidget = (widget: WidgetConfig) => {
    if (!widget.visible) return null;

    const sizeClasses = {
      small: "col-span-1",
      medium: "col-span-1 md:col-span-2",
      large: "col-span-1 md:col-span-2 lg:col-span-3",
    };

    const widgetProps = {
      events: widget.widgetType === "events" ? events : undefined,
      tasks: widget.widgetType === "tasks" ? tasks : undefined,
      routines: widget.widgetType === "routines" ? routines : undefined,
    };

    switch (widget.widgetType) {
      case "dailyBrief":
        return (
          <div key={widget.widgetType} className={sizeClasses[widget.size]}>
            <DailyBrief />
          </div>
        );
      case "events":
        return (
          <div key={widget.widgetType} className={sizeClasses[widget.size]}>
            <EventsList events={events} />
          </div>
        );
      case "tasks":
        return (
          <div key={widget.widgetType} className={sizeClasses[widget.size]}>
            <TasksList tasks={tasks} />
          </div>
        );
      case "weather":
        return (
          <div key={widget.widgetType} className={sizeClasses[widget.size]}>
            <WeatherWidget />
          </div>
        );
      case "traffic":
        return (
          <div key={widget.widgetType} className={sizeClasses[widget.size]}>
            <TrafficWidget />
          </div>
        );
      case "health":
        return (
          <div key={widget.widgetType} className={sizeClasses[widget.size]}>
            <HealthWidget />
          </div>
        );
      case "finance":
        return (
          <div key={widget.widgetType} className={sizeClasses[widget.size]}>
            <FinanceWidget />
          </div>
        );
      case "routines":
        return (
          <div key={widget.widgetType} className={sizeClasses[widget.size]}>
            <RoutinesList routines={routines} />
          </div>
        );
      case "wellness":
        return (
          <div key={widget.widgetType} className={sizeClasses[widget.size]}>
            <WellnessDashboard />
          </div>
        );
      case "recommendations":
        return (
          <div key={widget.widgetType} className={sizeClasses[widget.size]}>
            <PersonalizedRecommendations />
          </div>
        );
      case "voiceCommand":
        return (
          <div key={widget.widgetType} className={sizeClasses[widget.size]}>
            <VoiceCommandWrapper />
          </div>
        );
      case "chatInterface":
        return (
          <div key={widget.widgetType} className={sizeClasses[widget.size]}>
            <ChatInterface />
          </div>
        );
      case "networkDetector":
        return (
          <div key={widget.widgetType} className={sizeClasses[widget.size]}>
            <NetworkDetector />
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des widgets...</div>;
  }

  const visibleWidgets = widgets.filter((w) => w.visible).sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      {/* Suggestions de Synexa */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-blue-900 dark:text-blue-100">
                  Suggestions de Synexa
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              Je peux vous suggérer d'ajouter ces widgets pour améliorer votre dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => {
                const widgetDef = AVAILABLE_WIDGETS.find((w) => w.id === suggestion.widgetType);
                if (!widgetDef) return null;

                const Icon = iconMap[widgetDef.icon] || Sparkles;
                const priorityColors = {
                  high: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
                  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
                  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
                };

                return (
                  <div
                    key={idx}
                    className="flex items-start justify-between rounded-lg border border-blue-200 bg-white p-4 dark:border-blue-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{widgetDef.name}</h4>
                          <Badge className={priorityColors[suggestion.priority]}>
                            {suggestion.priority === "high" ? "Prioritaire" :
                             suggestion.priority === "medium" ? "Recommandé" : "Optionnel"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {suggestion.reason}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addWidget(suggestion.widgetType)}
                      className="ml-4"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bouton d'édition */}
      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={() => setEditMode(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Personnaliser le dashboard
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Personnaliser votre dashboard</DialogTitle>
              <DialogDescription>
                Activez ou désactivez les widgets selon vos préférences
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {AVAILABLE_WIDGETS.map((widgetDef) => {
                const widget = widgets.find((w) => w.widgetType === widgetDef.id);
                const Icon = iconMap[widgetDef.icon] || Sparkles;

                return (
                  <div
                    key={widgetDef.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-[hsl(var(--primary))]" />
                      <div>
                        <h4 className="font-semibold">{widgetDef.name}</h4>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {widgetDef.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {widget && widget.visible ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleWidgetVisibility(widgetDef.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Visible
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (widget) {
                              toggleWidgetVisibility(widgetDef.id);
                            } else {
                              addWidget(widgetDef.id);
                            }
                          }}
                        >
                          <EyeOff className="h-4 w-4 mr-1" />
                          Masqué
                        </Button>
                      )}
                      {widget && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWidget(widgetDef.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grille de widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleWidgets.map((widget) => (
          <div key={widget.widgetType} className="relative">
            {editMode && (
              <div className="absolute top-2 right-2 z-10 flex gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleWidgetVisibility(widget.widgetType)}
                >
                  {widget.visible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeWidget(widget.widgetType)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            {renderWidget(widget)}
          </div>
        ))}
      </div>
    </div>
  );
}

