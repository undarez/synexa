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
      <Card className="bg-gradient-to-br from-white via-[hsl(var(--card))] to-[hsl(var(--muted))]/30 border-[hsl(var(--border))] shadow-md">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
            <div className="absolute inset-0 h-8 w-8 animate-ping opacity-20">
              <Loader2 className="h-8 w-8 text-[hsl(var(--primary))]" />
            </div>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">
            Chargement de votre résumé...
          </p>
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
      {/* Résumé supprimé - doublon avec le header */}

      {/* Météo */}
      {brief.weather && (
        <Card className="bg-white dark:bg-zinc-900/50 border-[hsl(var(--border))] shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <Cloud className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              Météo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-bold">{brief.weather.current.temperature}°C</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))] capitalize">
                  {brief.weather.current.description}
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span>{brief.weather.current.humidity}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <span>{brief.weather.current.windSpeed} km/h</span>
                </div>
              </div>
            </div>
            {brief.weather.forecast.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                {brief.weather.forecast.map((day, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
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
        <Card className="bg-white dark:bg-zinc-900/50 border-[hsl(var(--border))] shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800">
                <Calendar className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              </div>
              Agenda ({brief.agenda.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {brief.agenda.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] bg-gradient-to-r from-white to-[hsl(var(--muted))]/20 p-3 transition-all duration-200 hover:bg-[hsl(var(--muted))]/40 hover:shadow-md hover:border-[hsl(var(--primary))]/30"
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
        <Card className="bg-white dark:bg-zinc-900/50 border-[hsl(var(--border))] shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                <CheckCircle2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              Tâches ({totalTasks})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {brief.tasks.overdue.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-red-900 dark:text-red-400 mb-2">
                    ⚠️ En retard ({brief.tasks.overdue.length})
                  </p>
                  {brief.tasks.overdue.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3 mb-2 hover:bg-red-100 dark:hover:bg-red-950/30 transition-all duration-200"
                    >
                      <AlertCircle className="h-4 w-4 text-red-700 dark:text-red-400" />
                      <span className="text-sm text-[hsl(var(--foreground))]">{task.title}</span>
                    </div>
                  ))}
                </div>
              )}
              {brief.tasks.highPriority.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-400 mb-2">
                    🔥 Priorité haute ({brief.tasks.highPriority.length})
                  </p>
                  {brief.tasks.highPriority.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 p-3 mb-2 hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-all duration-200"
                    >
                      <Zap className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
                      <span className="text-sm text-[hsl(var(--foreground))]">{task.title}</span>
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
                      className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 p-3 mb-2 hover:bg-slate-100 dark:hover:bg-slate-900/30 transition-all duration-200"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
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
      {(brief.suggestions?.traffic?.length || brief.suggestions?.tasks?.length || brief.suggestions?.routines?.length) > 0 && (
        <Card className="bg-white dark:bg-zinc-900/50 border-[hsl(var(--border))] shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {brief.suggestions?.traffic?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-all duration-200"
                >
                  <MapPin className="h-4 w-4 mt-0.5 text-blue-700 dark:text-blue-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{item.suggestion}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {format(new Date(item.event.start), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
              {brief.suggestions?.tasks?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 p-3 hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-all duration-200"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-700 dark:text-yellow-400" />
                  <p className="text-sm text-[hsl(var(--foreground))]">{item.suggestion}</p>
                </div>
              ))}
              {brief.suggestions?.routines?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3 hover:bg-green-100 dark:hover:bg-green-950/30 transition-all duration-200"
                >
                  <Zap className="h-4 w-4 mt-0.5 text-green-700 dark:text-green-400" />
                  <p className="text-sm text-[hsl(var(--foreground))]">{item.suggestion}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rappels */}
      {brief.reminders.length > 0 && (
        <Card className="bg-white dark:bg-zinc-900/50 border-[hsl(var(--border))] shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800">
                <Clock className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              </div>
              Rappels à venir ({brief.reminders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {brief.reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-slate-50 dark:bg-slate-900/20 p-3 hover:bg-slate-100 dark:hover:bg-slate-900/30 transition-all duration-200"
                >
                  <Clock className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <div className="flex-1">
                    <p className="text-sm">{reminder.message}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
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

