"use client";

import { Bell, Mail, MessageSquare, Calendar, Trash2, Clock, Repeat } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { ReminderType, ReminderStatus } from "@prisma/client";
import type { Reminder } from "@prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { parseRecurrenceRule } from "@/app/lib/reminders/recurrence";

interface ReminderItemProps {
  reminder: Reminder & {
    calendarEvent?: {
      id: string;
      title: string;
      start: Date;
      location: string | null;
    } | null;
  };
  onDelete: (id: string) => void;
}

export function ReminderItem({ reminder, onDelete }: ReminderItemProps) {
  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce rappel ?")) {
      return;
    }
    onDelete(reminder.id);
  };

  const getTypeIcon = () => {
    switch (reminder.reminderType) {
      case ReminderType.PUSH:
        return <Bell className="h-4 w-4" />;
      case ReminderType.EMAIL:
        return <Mail className="h-4 w-4" />;
      case ReminderType.SMS:
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeLabel = () => {
    switch (reminder.reminderType) {
      case ReminderType.PUSH:
        return "Push";
      case ReminderType.EMAIL:
        return "Email";
      case ReminderType.SMS:
        return "SMS";
      default:
        return "Notification";
    }
  };

  const getStatusColor = () => {
    switch (reminder.status) {
      case ReminderStatus.SENT:
        return "text-green-600 dark:text-green-400";
      case ReminderStatus.FAILED:
        return "text-red-600 dark:text-red-400";
      case ReminderStatus.CANCELLED:
        return "text-zinc-400";
      default:
        return "text-blue-600 dark:text-blue-400";
    }
  };

  const getStatusLabel = () => {
    switch (reminder.status) {
      case ReminderStatus.PENDING:
        return "En attente";
      case ReminderStatus.SENT:
        return "Envoyé";
      case ReminderStatus.FAILED:
        return "Échec";
      case ReminderStatus.CANCELLED:
        return "Annulé";
      default:
        return "Inconnu";
    }
  };

  const getRecurrenceLabel = () => {
    if (!(reminder as any).isRecurring || !(reminder as any).recurrenceRule) {
      return null;
    }

    const rule = parseRecurrenceRule((reminder as any).recurrenceRule);
    if (!rule) return "Récurrent";

    switch (rule.type) {
      case "DAILY":
        return rule.interval && rule.interval > 1
          ? `Tous les ${rule.interval} jours`
          : "Quotidien";
      case "WEEKLY":
        return rule.interval && rule.interval > 1
          ? `Toutes les ${rule.interval} semaines`
          : "Hebdomadaire";
      case "MONTHLY":
        return rule.interval && rule.interval > 1
          ? `Tous les ${rule.interval} mois`
          : "Mensuel";
      case "YEARLY":
        return rule.interval && rule.interval > 1
          ? `Tous les ${rule.interval} ans`
          : "Annuel";
      default:
        return "Récurrent";
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className={getStatusColor()}>{getTypeIcon()}</div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                {reminder.title}
              </h3>
              <span className="text-xs text-zinc-500">{getTypeLabel()}</span>
            </div>

            {reminder.message && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {reminder.message}
              </p>
            )}

            {reminder.calendarEvent && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Calendar className="h-3 w-3" />
                <span>{reminder.calendarEvent.title}</span>
                {reminder.calendarEvent.location && (
                  <>
                    <span>•</span>
                    <span>{reminder.calendarEvent.location}</span>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {format(new Date(reminder.scheduledFor), "PPp", { locale: fr })}
                </span>
              </div>
              <span className={getStatusColor()}>{getStatusLabel()}</span>
              {(reminder as any).isRecurring && (
                <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  <Repeat className="h-3 w-3" />
                  {getRecurrenceLabel() || "Récurrent"}
                </span>
              )}
              {(reminder as any).recurrenceEnd && (
                <span className="flex items-center gap-1 text-zinc-400">
                  <CalendarIcon className="h-3 w-3" />
                  Jusqu'au {format(new Date((reminder as any).recurrenceEnd), "PP", { locale: fr })}
                </span>
              )}
              {reminder.includeTraffic && (
                <span className="text-blue-600 dark:text-blue-400">🚗 Trafic</span>
              )}
              {reminder.includeWeather && (
                <span className="text-blue-600 dark:text-blue-400">🌤️ Météo</span>
              )}
            </div>
          </div>

          {reminder.status === ReminderStatus.PENDING && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}



