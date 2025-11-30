"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
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
import { NaturalLanguageInput } from "@/app/components/NaturalLanguageInput";
import { CalendarSource } from "@prisma/client";
import type { CalendarEvent } from "@prisma/client";
import type { ParsedEvent } from "@/app/lib/ai/event-parser";

interface EventFormProps {
  event?: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EventForm({ event, open, onOpenChange, onSuccess }: EventFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncGoogle, setSyncGoogle] = useState(false);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [useNaturalLanguage, setUseNaturalLanguage] = useState(false);

  useEffect(() => {
    // Vérifier si Google Calendar est connecté
    const checkGoogleConnection = async () => {
      try {
        const response = await fetch("/api/calendar/sync");
        if (response.ok) {
          const data = await response.json();
          setGoogleConnected(data.connected);
        }
      } catch (err) {
        console.error("Erreur vérification Google:", err);
      }
    };
    checkGoogleConnection();

    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setLocation(event.location || "");
      setAllDay(event.allDay);
      setSyncGoogle(event.source === "GOOGLE");
      
      const start = new Date(event.start);
      const end = new Date(event.end);
      
      setStartDate(format(start, "yyyy-MM-dd"));
      setEndDate(format(end, "yyyy-MM-dd"));
      
      if (!event.allDay) {
        setStartTime(format(start, "HH:mm"));
        setEndTime(format(end, "HH:mm"));
      } else {
        setStartTime("");
        setEndTime("");
      }
    } else {
      // Reset form for new event
      setTitle("");
      setDescription("");
      setLocation("");
      setStartDate("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
      setAllDay(false);
      setSyncGoogle(false);
      setUseNaturalLanguage(false);
    }
  }, [event, open]);

  const handleNaturalLanguageParse = (parsed: ParsedEvent) => {
    // Remplir le formulaire avec les données parsées
    setTitle(parsed.title);
    setDescription(parsed.description || "");
    setLocation(parsed.location || "");
    setAllDay(parsed.allDay);
    
    const start = new Date(parsed.start);
    const end = new Date(parsed.end);
    
    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
    
    if (!parsed.allDay) {
      setStartTime(format(start, "HH:mm"));
      setEndTime(format(end, "HH:mm"));
    } else {
      setStartTime("");
      setEndTime("");
    }
    
    // Basculer vers le mode formulaire pour permettre les modifications
    setUseNaturalLanguage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!title.trim()) {
        throw new Error("Le titre est requis");
      }

      if (!startDate || !endDate) {
        throw new Error("Les dates de début et de fin sont requises");
      }

      let start: Date;
      let end: Date;

      if (allDay) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      } else {
        if (!startTime || !endTime) {
          throw new Error("Les heures sont requises pour les événements non-journée");
        }
        start = new Date(`${startDate}T${startTime}`);
        end = new Date(`${endDate}T${endTime}`);
      }

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Dates invalides");
      }

      if (end < start) {
        throw new Error("La date de fin doit être postérieure à la date de début");
      }

      const url = event
        ? `/api/calendar/events/${event.id}`
        : "/api/calendar/events";
      const method = event ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          start: start.toISOString(),
          end: end.toISOString(),
          allDay,
          source: CalendarSource.LOCAL,
          syncGoogle: syncGoogle && googleConnected && !event, // Seulement pour les nouveaux événements
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la sauvegarde");
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? "Modifier l'événement" : "Nouvel événement"}
          </DialogTitle>
          <DialogDescription>
            {event
              ? "Modifiez les détails de votre événement."
              : "Créez un nouvel événement dans votre calendrier."}
          </DialogDescription>
        </DialogHeader>
        
        {!event && (
          <div className="flex gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
            <Button
              type="button"
              variant={!useNaturalLanguage ? "default" : "outline"}
              size="sm"
              onClick={() => setUseNaturalLanguage(false)}
            >
              Formulaire
            </Button>
            <Button
              type="button"
              variant={useNaturalLanguage ? "default" : "outline"}
              size="sm"
              onClick={() => setUseNaturalLanguage(true)}
            >
              ✨ Langage naturel
            </Button>
          </div>
        )}

        {!event && useNaturalLanguage ? (
          <div className="py-4">
            <NaturalLanguageInput
              onParse={handleNaturalLanguageParse}
              onCancel={() => setUseNaturalLanguage(false)}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Réunion d'équipe"
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détails de l'événement..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Lieu</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Bureau 204, Zoom..."
                disabled={loading}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <Label htmlFor="allDay" className="cursor-pointer">
                Journée entière
              </Label>
            </div>

            {googleConnected && !event && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="syncGoogle"
                  checked={syncGoogle}
                  onChange={(e) => setSyncGoogle(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <Label htmlFor="syncGoogle" className="cursor-pointer">
                  Synchroniser avec Google Calendar
                </Label>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Date de début *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {!allDay && (
                <div className="grid gap-2">
                  <Label htmlFor="startTime">Heure de début *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="endDate">Date de fin *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {!allDay && (
                <div className="grid gap-2">
                  <Label htmlFor="endTime">Heure de fin *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    disabled={loading}
                  />
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
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Enregistrement..." : event ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}


