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
    fetchSuggestions();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSuggestions();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/synexa/proactive-suggestions");
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des suggestions:", error);
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
        return "border-[hsl(var(--destructive))]/50 bg-gradient-to-br from-[hsl(var(--destructive))]/10 to-[hsl(var(--destructive))]/5";
      case "medium":
        return "border-[hsl(var(--primary))]/50 bg-gradient-to-br from-[hsl(var(--primary))]/10 to-[hsl(var(--primary))]/5";
      default:
        return "border-[hsl(var(--muted))] bg-[hsl(var(--muted))]/30";
    }
  };

  const visibleSuggestions = suggestions
    .filter((s) => !dismissedIds.has(s.id))
    .slice(0, maxSuggestions);

  if (loading && suggestions.length === 0) {
    return (
      <Card className={cn("border-[hsl(var(--primary))]/30", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[hsl(var(--primary))]" />
            Suggestions de Synexa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visibleSuggestions.length === 0) {
    return null; // Ne rien afficher s'il n'y a pas de suggestions
  }

  return (
    <Card className={cn("border-[hsl(var(--primary))]/30 bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(var(--primary))]/5", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[hsl(var(--primary))]" />
          Suggestions de Synexa
        </CardTitle>
        <CardDescription>
          Je vous propose ces actions basées sur vos habitudes et votre contexte actuel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className={cn(
                "group relative rounded-lg border p-4 transition-all hover:shadow-md",
                getPriorityColor(suggestion.priority)
              )}
            >
              <button
                onClick={() => handleDismiss(suggestion.id)}
                className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-4 w-4 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" />
              </button>

              <div className="flex items-start gap-3 pr-6">
                <div className="mt-0.5 flex-shrink-0 text-[hsl(var(--primary))]">
                  {getIcon(suggestion.type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[hsl(var(--foreground))]">
                    {suggestion.title}
                  </h4>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))] italic">
                    "{suggestion.message}"
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                    <span>💡 {suggestion.context.reason}</span>
                    <span>•</span>
                    <span>Confiance: {Math.round(suggestion.confidence * 100)}%</span>
                  </div>
                  {suggestion.action && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAction(suggestion)}
                        className="flex items-center gap-2"
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
                        variant="ghost"
                        onClick={() => handleDismiss(suggestion.id)}
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
        <div className="mt-4 text-xs text-[hsl(var(--muted-foreground))] italic">
          💡 Ces suggestions sont générées automatiquement en fonction de vos habitudes et de votre contexte actuel
        </div>
      </CardContent>
    </Card>
  );
}



