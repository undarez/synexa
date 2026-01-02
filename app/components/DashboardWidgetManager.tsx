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
  Shield,
  Newspaper,
} from "lucide-react";
import { WidgetType, WidgetConfig, AVAILABLE_WIDGETS } from "@/app/lib/dashboard/widgets";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EventsList } from "@/app/components/EventsList";
import { TasksList } from "@/app/components/TasksList";
import { RoutinesList } from "@/app/components/RoutinesList";
import { NetworkDetector } from "@/app/components/NetworkDetector";
import { NewsWidget } from "@/app/components/NewsWidget";
import { SecurityWidget } from "@/app/components/SecurityWidget";
import { EnergyWidget } from "@/app/components/EnergyWidget";
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.widgetType === active.id);
      const newIndex = widgets.findIndex((w) => w.widgetType === over.id);

      const newWidgets = arrayMove(widgets, oldIndex, newIndex);
      
      // Mettre à jour les positions
      const updatedWidgets = newWidgets.map((widget, index) => ({
        ...widget,
        position: index,
      }));

      setWidgets(updatedWidgets);

      // Sauvegarder les nouvelles positions
      try {
        await fetch("/api/dashboard/widgets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            widgets: updatedWidgets.map((w) => ({
              widgetType: w.widgetType,
              position: w.position,
            })),
          }),
        });
      } catch (error) {
        console.error("Erreur lors de la sauvegarde de l'ordre:", error);
        // Recharger en cas d'erreur
        fetchWidgets();
      }
    }
  };

  const resizeWidget = async (widgetType: WidgetType, newSize: "small" | "medium" | "large") => {
    const widget = widgets.find((w) => w.widgetType === widgetType);
    if (!widget) return;

    try {
      await fetch("/api/dashboard/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...widget,
          size: newSize,
        }),
      });
      fetchWidgets();
    } catch (error) {
      console.error("Erreur lors du redimensionnement:", error);
    }
  };

  // Composant SortableWidget pour le drag & drop
  function SortableWidget({ widget }: { widget: WidgetConfig }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: widget.widgetType });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const sizeClasses = {
      small: "col-span-1",
      medium: "col-span-1 lg:col-span-2", // Max 2 par ligne
      large: "col-span-1 lg:col-span-2", // Max 2 par ligne même pour large
    };

    if (!widget.visible) return null;

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`relative ${sizeClasses[widget.size]} animate-in fade-in slide-in-from-bottom-4 duration-500`}
      >
        {/* Fond selon Design System - 90% surfaces neutres */}
        <div className="bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] rounded-2xl p-6 shadow-[var(--shadow-card)] dark:shadow-[var(--shadow-card)] transition-all duration-180 hover:shadow-lg dark:hover:shadow-lg">
          {/* Poignée de drag */}
          {editMode && (
            <div
              {...attributes}
              {...listeners}
              className="absolute top-3 left-3 z-20 cursor-grab active:cursor-grabbing p-2 rounded-md bg-white/70 dark:bg-zinc-800/70 hover:bg-white/90 dark:hover:bg-zinc-700/90 transition-all shadow-sm"
            >
              <GripVertical className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            </div>
          )}

          {/* Boutons d'édition */}
          {editMode && (
            <div className="absolute top-3 right-3 z-20 flex gap-2">
              {/* Bouton de redimensionnement */}
              <div className="flex items-center gap-1 bg-white/70 dark:bg-zinc-800/70 rounded-md p-1 shadow-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 ${widget.size === "small" ? "bg-[hsl(var(--primary))]/20" : ""}`}
                  onClick={() => resizeWidget(widget.widgetType, "small")}
                  title="Petit"
                >
                  <div className="h-2 w-2 bg-current rounded" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 ${widget.size === "medium" ? "bg-[hsl(var(--primary))]/20" : ""}`}
                  onClick={() => resizeWidget(widget.widgetType, "medium")}
                  title="Moyen"
                >
                  <div className="h-2 w-4 bg-current rounded" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 ${widget.size === "large" ? "bg-[hsl(var(--primary))]/20" : ""}`}
                  onClick={() => resizeWidget(widget.widgetType, "large")}
                  title="Grand"
                >
                  <div className="h-2 w-6 bg-current rounded" />
                </Button>
              </div>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
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
                className="h-8 w-8 bg-red-500/80 hover:bg-red-600/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
                onClick={() => removeWidget(widget.widgetType)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Contenu du widget */}
          <div className={editMode ? "pt-10" : ""}>
            {renderWidgetContent(widget)}
          </div>
        </div>
      </div>
    );
  }

  const renderWidgetContent = (widget: WidgetConfig) => {
    switch (widget.widgetType) {
      case "dailyBrief":
        return <DailyBrief />;
      case "events":
        return <EventsList events={events} />;
      case "tasks":
        return <TasksList tasks={tasks} />;
      case "weather":
        return <WeatherWidget />;
      case "traffic":
        return <TrafficWidget />;
      case "health":
        return <HealthWidget />;
      case "finance":
        return <FinanceWidget />;
      case "routines":
        return <RoutinesList routines={routines} />;
      case "wellness":
        return <WellnessDashboard />;
      case "recommendations":
        return <PersonalizedRecommendations />;
      case "voiceCommand":
        return <VoiceCommandWrapper />;
      case "chatInterface":
        return <ChatInterface />;
      case "networkDetector":
        return <NetworkDetector />;
      case "news":
        return <NewsWidget />;
      case "security":
        return <SecurityWidget />;
      case "energy":
        return <EnergyWidget />;
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

      {/* Bouton d'édition */}
      <div className="flex justify-end gap-2">
        <Button
          variant={editMode ? "default" : "outline"}
          onClick={() => setEditMode(!editMode)}
        >
          <Settings className="h-4 w-4 mr-2" />
          {editMode ? "Terminer l'édition" : "Personnaliser le dashboard"}
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un widget
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-[hsl(var(--background))]">
            <DialogHeader>
              <DialogTitle className="text-[hsl(var(--foreground))]">Personnaliser votre dashboard</DialogTitle>
              <DialogDescription className="text-[hsl(var(--muted-foreground))]">
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
                    className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 hover:bg-[hsl(var(--muted))]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-[hsl(var(--primary))]" />
                      <div>
                        <h4 className="font-semibold text-[hsl(var(--foreground))]">{widgetDef.name}</h4>
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

      {/* Grille de widgets avec drag & drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleWidgets.map((w) => w.widgetType)}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {visibleWidgets.map((widget) => (
              <SortableWidget key={widget.widgetType} widget={widget} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}


