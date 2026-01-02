"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Plus, Loader2, Bell } from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { ReminderForm } from "@/app/components/ReminderForm";
import { ReminderItem } from "@/app/components/ReminderItem";
import { ReminderSuggestions } from "@/app/components/ReminderSuggestions";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { ReminderStatus } from "@prisma/client";
import type { Reminder } from "@prisma/client";
import { Footer } from "@/app/components/Footer";

function RemindersContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/?error=auth_required&redirect=/reminders");
    }
  }, [status]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filterStatus !== "all") {
        params.append("status", filterStatus);
      }

      const url = `/api/reminders${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des rappels");
      }

      const data = await response.json();
      setReminders(data.reminders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchReminders();
    }
  }, [status, filterStatus]);

  useEffect(() => {
    if (status === "authenticated") {
      // Vérifier si un eventId est passé dans l'URL
      const eventId = searchParams?.get("eventId");
      if (eventId && !selectedEvent) {
        // Récupérer l'événement et ouvrir le formulaire
        fetch(`/api/calendar/events/${eventId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.event) {
              setSelectedEvent(data.event);
              setFormOpen(true);
            }
          })
          .catch((err) => {
            console.error("Erreur lors du chargement de l'événement:", err);
          });
      }
    }
  }, [status, searchParams]);

  const handleDelete = async (reminderId: string) => {
    try {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      await fetchReminders();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedEvent(null);
  };

  const handleFormSuccess = () => {
    fetchReminders();
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
              Rappels
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Gérez vos rappels intelligents avec informations de trafic et météo
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau rappel
          </Button>
        </div>

        {/* Suggestions de rappels */}
        <div className="mb-6">
          <ReminderSuggestions />
        </div>

        <div className="mb-6">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value={ReminderStatus.PENDING}>En attente</SelectItem>
              <SelectItem value={ReminderStatus.SENT}>Envoyés</SelectItem>
              <SelectItem value={ReminderStatus.FAILED}>Échecs</SelectItem>
              <SelectItem value={ReminderStatus.CANCELLED}>Annulés</SelectItem>
            </SelectContent>
          </Select>
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
        ) : reminders.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Aucun rappel
              </CardTitle>
              <CardDescription>
                {filterStatus !== "all"
                  ? "Aucun rappel ne correspond au filtre sélectionné"
                  : "Commencez par créer votre premier rappel"}
              </CardDescription>
            </CardHeader>
            {filterStatus === "all" && (
              <CardContent>
                <Button onClick={() => setFormOpen(true)} variant="outline" className="w-full">
                  Créer un rappel
                </Button>
              </CardContent>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <ReminderItem
                key={reminder.id}
                reminder={reminder as any}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <ReminderForm
          event={selectedEvent}
          open={formOpen}
          onOpenChange={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      </main>
      <Footer />
    </div>
  );
}

export default function RemindersPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle>Rappels</CardTitle>
                <CardDescription>Chargement...</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <RemindersContent />
    </Suspense>
  );
}

