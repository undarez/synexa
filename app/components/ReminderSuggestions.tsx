"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ReminderSuggestion {
  eventId: string;
  eventTitle: string;
  eventStart: string;
  suggestedMinutes: number[];
  reason: string;
}

export function ReminderSuggestions() {
  const [suggestions, setSuggestions] = useState<ReminderSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/reminders/suggestions?daysAhead=7");
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Erreur chargement suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = async (suggestion: ReminderSuggestion) => {
    try {
      setApplying(suggestion.eventId);
      const response = await fetch("/api/reminders/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: suggestion.eventId,
          minutesBefore: suggestion.suggestedMinutes,
        }),
      });

      if (response.ok) {
        // Retirer la suggestion de la liste
        setSuggestions((prev) =>
          prev.filter((s) => s.eventId !== suggestion.eventId)
        );
      }
    } catch (error) {
      console.error("Erreur application suggestion:", error);
    } finally {
      setApplying(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Suggestions de rappels
        </CardTitle>
        <CardDescription>
          Nous avons détecté des événements sans rappel. Voulez-vous en créer ?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.eventId}
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-2">
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
                {suggestion.eventTitle}
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {format(new Date(suggestion.eventStart), "EEEE d MMMM à HH:mm", {
                  locale: fr,
                })}
              </p>
            </div>
            <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
              {suggestion.reason}
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestion.suggestedMinutes.map((minutes) => (
                <span
                  key={minutes}
                  className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  {minutes >= 60
                    ? `${Math.floor(minutes / 60)}h`
                    : `${minutes}min`}{" "}
                  avant
                </span>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applySuggestion(suggestion)}
              disabled={applying === suggestion.eventId}
              className="w-full"
            >
              {applying === suggestion.eventId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Créer {suggestion.suggestedMinutes.length} rappel(s)
                </>
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}







