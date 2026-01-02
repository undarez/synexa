"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  Zap, 
  Bell, 
  Lightbulb,
  X,
  Loader2,
  MessageCircle
} from "lucide-react";
import type { ProactiveSuggestion } from "@/app/lib/ai/proactive-suggestions";
import { cn } from "@/app/lib/utils";

interface SynexaProactiveSuggestionsProps {
  maxSuggestions?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // en millisecondes
  className?: string;
}

export function SynexaProactiveSuggestions({
  maxSuggestions = 3,
  autoRefresh = true,
  refreshInterval = 5 * 60 * 1000, // 5 minutes par défaut
  className = "",
}: SynexaProactiveSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Charger les suggestions immédiatement au montage
    fetchSuggestions();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSuggestions();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshInterval]);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/synexa/proactive-suggestions", {
        cache: "no-store", // S'assurer que les suggestions sont toujours fraîches
      });
      
      if (response.ok) {
        const data = await response.json();
        const fetchedSuggestions = data.suggestions || [];
        // Filtrer les suggestions déjà dismissées
        const filteredSuggestions = fetchedSuggestions.filter(
          (s: ProactiveSuggestion) => !dismissedIds.has(s.id)
        );
        setSuggestions(filteredSuggestions);
      } else {
        // Ne pas afficher d'erreur, simplement retourner un tableau vide
        setSuggestions([]);
      }
    } catch (error) {
      // Ignorer silencieusement les erreurs pour ne pas polluer la console
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const handleAction = async (suggestion: ProactiveSuggestion) => {
    if (!suggestion.action) return;

    try {
      switch (suggestion.action.type) {
        case "create_task":
          await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(suggestion.action.data),
          });
          // Rafraîchir après création
          setTimeout(() => fetchSuggestions(), 1000);
          break;
        case "execute_routine":
          await fetch(`/api/routines/${suggestion.action.data.routineId}/execute`, {
            method: "POST",
          });
          setTimeout(() => fetchSuggestions(), 1000);
          break;
        case "view_tasks":
          // Rediriger vers la page des tâches avec filtre
          window.location.href = `/tasks?filter=${suggestion.action.data.filter || "all"}`;
          break;
        case "view_event":
          // Rediriger vers le calendrier
          window.location.href = `/calendar?event=${suggestion.action.data.eventId}`;
          break;
        case "prepare_tasks":
          // Rediriger vers les tâches avec suggestion d'heure
          window.location.href = `/tasks?preferredHour=${suggestion.action.data.preferredHour}`;
          break;
        case "view_insights":
          // Rediriger vers les insights
          window.location.href = `/dashboard?tab=insights`;
          break;
      }
    } catch (error) {
      console.error("Erreur lors de l'exécution de l'action:", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "task":
        return <CheckCircle2 className="h-5 w-5" />;
      case "event":
        return <Calendar className="h-5 w-5" />;
      case "routine":
        return <Zap className="h-5 w-5" />;
      case "reminder":
        return <Bell className="h-5 w-5" />;
      case "insight":
        return <Lightbulb className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-[hsl(var(--danger))]/10 border-[hsl(var(--danger))]/20";
      case "medium":
        return "bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/20";
      default:
        return "bg-[hsl(var(--surface-alt))] dark:bg-[hsl(var(--surface-alt))] border-[hsl(var(--border))]";
    }
  };

  const visibleSuggestions = suggestions
    .filter((s) => !dismissedIds.has(s.id))
    .slice(0, maxSuggestions);

  if (loading && suggestions.length === 0) {
    return (
      <Card className={cn(
        "bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))]",
        "shadow-[var(--shadow-card)] dark:shadow-[var(--shadow-card)]",
        className
      )}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--info))]/10 border border-[hsl(var(--info))]/20">
              <MessageCircle className="h-5 w-5 text-[hsl(var(--info))]" />
            </div>
            <CardTitle className="text-xl font-semibold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
              Suggestions de Synexa
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
              <div className="absolute inset-0 h-8 w-8 animate-ping opacity-20">
                <Loader2 className="h-8 w-8 text-[hsl(var(--primary))]" />
              </div>
            </div>
            <p className="text-sm text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] font-medium">
              Analyse de votre contexte...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visibleSuggestions.length === 0) {
    return null; // Ne rien afficher s'il n'y a pas de suggestions
  }

  return (
    <Card className={cn(
      "bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))]",
      "shadow-[var(--shadow-card)] dark:shadow-[var(--shadow-card)]",
      "transition-all duration-180",
      className
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgb(var(--info))]/10 border border-[rgb(var(--info))]/20">
              <MessageCircle className="h-5 w-5 text-[rgb(var(--info))]" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-[rgb(var(--text))] dark:text-[rgb(var(--text))]">
                Suggestions de Synexa
              </CardTitle>
              <CardDescription className="mt-1">
                Actions intelligentes basées sur vos habitudes et votre contexte
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {visibleSuggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={cn(
                "group relative rounded-xl border p-5 transition-all duration-180",
                "bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))]",
                getPriorityColor(suggestion.priority)
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <button
                onClick={() => handleDismiss(suggestion.id)}
                className="absolute right-3 top-3 opacity-0 transition-all duration-180 group-hover:opacity-100 p-1.5 rounded-md hover:bg-[hsl(var(--surface-alt))]"
                aria-label="Fermer"
              >
                <X className="h-4 w-4 text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))]" />
              </button>

              <div className="flex items-start gap-4 pr-8">
                <div className="mt-1 flex-shrink-0 p-2.5 rounded-lg bg-[hsl(var(--info))]/10 border border-[hsl(var(--info))]/20">
                  <div className="text-[hsl(var(--info))]">
                    {getIcon(suggestion.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-base text-[hsl(var(--text))] dark:text-[hsl(var(--text))] mb-2">
                    {suggestion.title}
                  </h4>
                  <p className="text-sm text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] leading-relaxed mb-3 italic">
                    "{suggestion.message}"
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(var(--surface-alt))] dark:bg-[hsl(var(--surface-alt))] text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] font-medium">
                      <Lightbulb className="h-3 w-3" />
                      {suggestion.context.reason}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] font-medium border border-[hsl(var(--info))]/20">
                      Confiance: {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </div>
                  {suggestion.action && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAction(suggestion)}
                        className="flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                      >
                        {suggestion.action.type === "create_task" && "Créer"}
                        {suggestion.action.type === "execute_routine" && "Exécuter"}
                        {suggestion.action.type === "view_tasks" && "Voir les tâches"}
                        {suggestion.action.type === "view_event" && "Voir l'événement"}
                        {suggestion.action.type === "prepare_tasks" && "Préparer"}
                        {suggestion.action.type === "view_insights" && "Voir les insights"}
                        {!["create_task", "execute_routine", "view_tasks", "view_event", "prepare_tasks", "view_insights"].includes(suggestion.action.type) && "Appliquer"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDismiss(suggestion.id)}
                        className="border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-alt))]"
                      >
                        Plus tard
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] text-center italic">
          💡 Suggestions générées automatiquement en fonction de vos habitudes et de votre contexte actuel
        </div>
      </CardContent>
    </Card>
  );
}



