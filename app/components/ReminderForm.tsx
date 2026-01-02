"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { ReminderType } from "@prisma/client";
import type { CalendarEvent } from "@prisma/client";
import { Loader2, Repeat, Sparkles } from "lucide-react";

interface ReminderFormProps {
  event?: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ReminderForm({
  event,
  open,
  onOpenChange,
  onSuccess,
}: ReminderFormProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [reminderType, setReminderType] = useState<ReminderType>(ReminderType.PUSH);
  const [minutesBefore, setMinutesBefore] = useState("15");
  const [scheduledFor, setScheduledFor] = useState("");
  const [includeTraffic, setIncludeTraffic] = useState(false);
  const [includeWeather, setIncludeWeather] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<string>("DAILY");
  const [recurrenceEnd, setRecurrenceEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(`Rappel : ${event.title}`);
      setMessage(`N'oubliez pas : ${event.title}`);
    } else {
      setTitle("");
      setMessage("");
    }
    // Réinitialiser les champs de récurrence
    setIsRecurring(false);
    setRecurrenceType("DAILY");
    setRecurrenceEnd("");
  }, [event, open]);

  // Charger les suggestions si un événement est sélectionné
  useEffect(() => {
    if (event && open) {
      loadSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [event, open]);

  const loadSuggestions = async () => {
    if (!event) return;
    setLoadingSuggestions(true);
    try {
      const response = await fetch(`/api/reminders/suggestions?daysAhead=7`);
      if (response.ok) {
        const data = await response.json();
        const eventSuggestions = data.suggestions.filter(
          (s: any) => s.eventId === event.id
        );
        setSuggestions(eventSuggestions);
      }
    } catch (error) {
      console.error("Erreur chargement suggestions:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const applySuggestion = async (suggestion: any) => {
    try {
      const response = await fetch("/api/reminders/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: suggestion.eventId,
          minutesBefore: suggestion.suggestedMinutes,
        }),
      });

      if (response.ok) {
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      setError("Erreur lors de la création des rappels suggérés");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!title.trim()) {
        throw new Error("Le titre est requis");
      }

      const payload: any = {
        calendarEventId: event?.id || null,
        title: title.trim(),
        message: message.trim() || null,
        reminderType,
        includeTraffic: includeTraffic && !!event?.location,
        includeWeather: includeWeather,
        isRecurring,
        recurrenceRule: isRecurring ? recurrenceType : null,
        recurrenceEnd: isRecurring && recurrenceEnd ? recurrenceEnd : null,
      };

      // Si un événement est associé, utiliser minutesBefore
      if (event?.id) {
        payload.minutesBefore = parseInt(minutesBefore) || 15;
      } else if (scheduledFor) {
        // Sinon, utiliser la date directement
        payload.scheduledFor = scheduledFor;
      } else {
        throw new Error("Veuillez spécifier une date d'envoi ou associer un événement");
      }

      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la création");
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouveau rappel</DialogTitle>
          <DialogDescription>
            {event
              ? `Créer un rappel pour "${event.title}"`
              : "Créer un rappel indépendant"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Réunion importante"
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="message">Message (optionnel)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message personnalisé..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reminderType">Type de notification *</Label>
              <Select
                value={reminderType}
                onValueChange={(value) => setReminderType(value as ReminderType)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ReminderType.PUSH}>Notification push</SelectItem>
                  <SelectItem value={ReminderType.EMAIL}>Email</SelectItem>
                  <SelectItem value={ReminderType.SMS}>SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {event ? (
              <div className="grid gap-2">
                <Label htmlFor="minutesBefore">Minutes avant l'événement *</Label>
                <Input
                  id="minutesBefore"
                  type="number"
                  min="1"
                  value={minutesBefore}
                  onChange={(e) => setMinutesBefore(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="scheduledFor">Date et heure d'envoi *</Label>
                <Input
                  id="scheduledFor"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  required
                  disabled={loading}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-zinc-500">
                  Spécifiez quand vous souhaitez recevoir ce rappel
                </p>
              </div>
            )}

            {event && event.location && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeTraffic"
                  checked={includeTraffic}
                  onChange={(e) => setIncludeTraffic(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <Label htmlFor="includeTraffic" className="cursor-pointer">
                  Inclure les informations de trafic
                </Label>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeWeather"
                checked={includeWeather}
                onChange={(e) => setIncludeWeather(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <Label htmlFor="includeWeather" className="cursor-pointer">
                Inclure les informations météo
              </Label>
            </div>

            {/* Suggestions automatiques */}
            {event && suggestions.length > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <Label className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Suggestions automatiques
                  </Label>
                </div>
                <p className="mb-3 text-xs text-blue-700 dark:text-blue-300">
                  {suggestions[0].reason}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applySuggestion(suggestions[0])}
                  disabled={loading || loadingSuggestions}
                  className="w-full"
                >
                  Créer {suggestions[0].suggestedMinutes.length} rappel(s) suggéré(s)
                </Button>
              </div>
            )}

            {/* Rappels récurrents */}
            <div className="space-y-3 rounded-lg border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800 dark:bg-purple-950/20">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <Label htmlFor="isRecurring" className="flex cursor-pointer items-center gap-2 font-medium text-purple-900 dark:text-purple-100">
                  <Repeat className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Rappel récurrent
                </Label>
              </div>

              {isRecurring && (
                <div className="space-y-3 rounded-lg border border-purple-200 bg-white p-3 dark:border-purple-800 dark:bg-zinc-900">
                  <div className="grid gap-2">
                    <Label htmlFor="recurrenceType" className="text-sm font-medium">
                      Fréquence de répétition
                    </Label>
                    <Select
                      value={recurrenceType}
                      onValueChange={setRecurrenceType}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">
                          <div className="flex items-center gap-2">
                            <Repeat className="h-4 w-4" />
                            Quotidien (tous les jours)
                          </div>
                        </SelectItem>
                        <SelectItem value="WEEKLY">
                          <div className="flex items-center gap-2">
                            <Repeat className="h-4 w-4" />
                            Hebdomadaire (toutes les semaines)
                          </div>
                        </SelectItem>
                        <SelectItem value="MONTHLY">
                          <div className="flex items-center gap-2">
                            <Repeat className="h-4 w-4" />
                            Mensuel (tous les mois)
                          </div>
                        </SelectItem>
                        <SelectItem value="YEARLY">
                          <div className="flex items-center gap-2">
                            <Repeat className="h-4 w-4" />
                            Annuel (tous les ans)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-zinc-500">
                      Le rappel sera automatiquement recréé selon cette fréquence
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="recurrenceEnd" className="text-sm font-medium">
                      Date de fin (optionnel)
                    </Label>
                    <Input
                      id="recurrenceEnd"
                      type="date"
                      value={recurrenceEnd}
                      onChange={(e) => setRecurrenceEnd(e.target.value)}
                      disabled={loading}
                      min={new Date().toISOString().split("T")[0]}
                    />
                    <p className="text-xs text-zinc-500">
                      Laissez vide pour une récurrence infinie. Le rappel continuera indéfiniment.
                    </p>
                  </div>

                  <div className="rounded-lg bg-blue-50 p-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                    💡 <strong>Astuce :</strong> Après chaque envoi, le prochain rappel sera automatiquement créé pour la date suivante.
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer le rappel"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


