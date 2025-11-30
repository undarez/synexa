"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Cloud,
  Wind,
  Droplets,
  Zap,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import Link from "next/link";
import type { CalendarEvent, Task, Reminder, Routine } from "@prisma/client";

interface BriefData {
  date: string;
  greeting: string;
  summary: string;
  agenda: CalendarEvent[];
  tasks: {
    highPriority: Task[];
    today: Task[];
    overdue: Task[];
  };
  reminders: Reminder[];
  weather?: {
    current: {
      temperature: number;
      description: string;
      humidity: number;
      windSpeed: number;
    };
    forecast: Array<{
      date: string;
      temperature: { min: number; max: number };
      description: string;
    }>;
  };
  suggestions: {
    traffic?: Array<{
      event: CalendarEvent;
      suggestion: string;
    }>;
    routines?: Array<{
      routine: Routine;
      suggestion: string;
    }>;
    tasks?: Array<{
      task: Task;
      suggestion: string;
    }>;
  };
  activeRoutines: Array<{
    id: string;
    name: string;
    triggerType: string;
  }>;
}

export function DailyBrief() {
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBrief();
  }, []);

  const fetchBrief = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/assistant/brief");
      if (!response.ok) {
        throw new Error("Erreur lors du chargement du brief");
      }
      const data = await response.json();
      setBrief(data.brief);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </CardContent>
      </Card>
    );
  }

  if (error || !brief) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-red-500 dark:text-red-400">
            {error || "Impossible de charger le brief"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalTasks = brief.tasks.highPriority.length + brief.tasks.today.length + brief.tasks.overdue.length;

  return (
    <div className="space-y-4">
      {/* En-tête avec salutation */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-2xl">
            {brief.greeting} ! 👋
          </CardTitle>
          <CardDescription>
            {format(new Date(brief.date), "EEEE d MMMM yyyy", { locale: fr })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-700 dark:text-zinc-300">{brief.summary}</p>
        </CardContent>
      </Card>

      {/* Météo */}
      {brief.weather && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Météo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-bold">{brief.weather.current.temperature}°C</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 capitalize">
                  {brief.weather.current.description}
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span>{brief.weather.current.humidity}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="h-4 w-4 text-gray-500" />
                  <span>{brief.weather.current.windSpeed} km/h</span>
                </div>
              </div>
            </div>
            {brief.weather.forecast.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                {brief.weather.forecast.map((day, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-xs text-zinc-500">
                      {idx === 0 ? "Demain" : format(new Date(day.date), "EEE", { locale: fr })}
                    </p>
                    <p className="font-semibold">
                      {day.temperature.min}° - {day.temperature.max}°C
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Agenda */}
      {brief.agenda.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agenda ({brief.agenda.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {brief.agenda.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 transition-colors hover:bg-[hsl(var(--muted))]"
                >
                  <Clock className="h-4 w-4 mt-0.5 text-[hsl(var(--muted-foreground))]" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[hsl(var(--foreground))]">
                      {event.title}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {format(new Date(event.start), "HH:mm")}
                      {event.location && ` • ${event.location}`}
                    </p>
                  </div>
                </div>
              ))}
              {brief.agenda.length > 5 && (
                <Link href="/calendar">
                  <Button variant="ghost" className="w-full">
                    Voir tous les événements ({brief.agenda.length})
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tâches */}
      {totalTasks > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Tâches ({totalTasks})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {brief.tasks.overdue.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                    ⚠️ En retard ({brief.tasks.overdue.length})
                  </p>
                  {brief.tasks.overdue.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 rounded-lg bg-red-50 p-2 dark:bg-red-950/20 mb-2"
                    >
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">{task.title}</span>
                    </div>
                  ))}
                </div>
              )}
              {brief.tasks.highPriority.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                    🔥 Priorité haute ({brief.tasks.highPriority.length})
                  </p>
                  {brief.tasks.highPriority.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 rounded-lg bg-yellow-50 p-2 dark:bg-yellow-950/20 mb-2"
                    >
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">{task.title}</span>
                    </div>
                  ))}
                </div>
              )}
              {brief.tasks.today.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">
                    📅 Aujourd'hui ({brief.tasks.today.length})
                  </p>
                  {brief.tasks.today.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800 mb-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm">{task.title}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/tasks">
                <Button variant="ghost" className="w-full">
                  Voir toutes les tâches
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {(brief.suggestions.traffic?.length || brief.suggestions.tasks?.length || brief.suggestions.routines?.length) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {brief.suggestions.traffic?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20"
                >
                  <MapPin className="h-4 w-4 mt-0.5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.suggestion}</p>
                    <p className="text-xs text-zinc-500">
                      {format(new Date(item.event.start), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
              {brief.suggestions.tasks?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950/20"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-500" />
                  <p className="text-sm">{item.suggestion}</p>
                </div>
              ))}
              {brief.suggestions.routines?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-lg bg-green-50 p-3 dark:bg-green-950/20"
                >
                  <Zap className="h-4 w-4 mt-0.5 text-green-500" />
                  <p className="text-sm">{item.suggestion}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rappels */}
      {brief.reminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Rappels à venir ({brief.reminders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {brief.reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800"
                >
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <div className="flex-1">
                    <p className="text-sm">{reminder.message}</p>
                    <p className="text-xs text-zinc-500">
                      {format(new Date(reminder.scheduledFor), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

