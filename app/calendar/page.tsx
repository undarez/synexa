"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { EventForm } from "@/app/components/EventForm";
import { EventItem } from "@/app/components/EventItem";
import { GoogleCalendarSync } from "@/app/components/GoogleCalendarSync";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { CalendarSource } from "@prisma/client";
import type { CalendarEvent } from "@prisma/client";
import { Footer } from "@/app/components/Footer";

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/?error=auth_required&redirect=/calendar");
    }
  }, [status]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filterSource !== "all") {
        params.append("source", filterSource);
      }
      if (filterDate) {
        params.append("from", filterDate);
        const endDate = new Date(filterDate);
        endDate.setDate(endDate.getDate() + 1);
        params.append("to", endDate.toISOString());
      }

      const url = `/api/calendar/events${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des événements");
      }
      
      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchEvents();
    }
  }, [status, filterSource, filterDate]);

  const handleDelete = async (eventId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) {
      return;
    }

    try {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      await fetchEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const handleEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingEvent(null);
  };

  const handleFormSuccess = () => {
    fetchEvents();
  };

  const handleCreateReminder = (event: CalendarEvent) => {
    // Rediriger vers la page rappels avec l'événement pré-sélectionné
    // Ou ouvrir un modal de création de rappel
    window.location.href = `/reminders?eventId=${event.id}`;
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navigation />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Calendrier
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Gérez vos événements et rendez-vous
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel événement
          </Button>
        </div>

        <div className="mb-6">
          <GoogleCalendarSync />
        </div>

        <div className="mb-6 flex flex-wrap gap-4">
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sources</SelectItem>
              <SelectItem value="LOCAL">Local</SelectItem>
              <SelectItem value="GOOGLE">Google</SelectItem>
              <SelectItem value="OUTLOOK">Outlook</SelectItem>
              <SelectItem value="ICLOUD">iCloud</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            placeholder="Filtrer par date"
            className="w-[180px]"
          />

          {filterDate && (
            <Button
              variant="outline"
              onClick={() => setFilterDate("")}
            >
              Effacer filtre
            </Button>
          )}
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </CardContent>
          </Card>
        ) : events.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucun événement</CardTitle>
              <CardDescription>
                {filterDate || filterSource !== "all"
                  ? "Aucun événement ne correspond aux filtres sélectionnés"
                  : "Commencez par créer votre premier événement"}
              </CardDescription>
            </CardHeader>
            {!filterDate && filterSource === "all" && (
              <CardContent>
                <Button onClick={() => setFormOpen(true)} variant="outline" className="w-full">
                  Créer un événement
                </Button>
              </CardContent>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <EventItem
                key={event.id}
                event={event}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCreateReminder={handleCreateReminder}
              />
            ))}
          </div>
        )}

        <EventForm
          event={editingEvent}
          open={formOpen}
          onOpenChange={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      </main>
      <Footer />
    </div>
  );
}

