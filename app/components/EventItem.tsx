"use client";

import { format } from "date-fns";
import { Calendar, MapPin, Pencil, Trash2, Bell } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { CalendarEvent } from "@prisma/client";

interface EventItemProps {
  event: CalendarEvent;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
  onCreateReminder?: (event: CalendarEvent) => void;
}

export function EventItem({ event, onEdit, onDelete, onCreateReminder }: EventItemProps) {
  const isPast = new Date(event.end) < new Date();
  const isToday = isSameDay(new Date(event.start), new Date());

  return (
    <div
      className={`rounded-lg border p-4 transition-colors hover:bg-[hsl(var(--muted))] ${
        isPast
          ? "border-[hsl(var(--border))] bg-[hsl(var(--muted))] opacity-75"
          : isToday
          ? "border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/10"
          : "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-1">
          <h3 className={`font-medium ${isPast ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--foreground))]"}`}>
            {event.title}
          </h3>
          {event.description && (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {event.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {event.allDay ? (
                <span>{format(new Date(event.start), "PPP")}</span>
              ) : (
                <span>
                  {format(new Date(event.start), "PPP 'à' HH:mm")} - {format(new Date(event.end), "HH:mm")}
                </span>
              )}
            </div>
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.location}
              </div>
            )}
          </div>
        </div>
        <div className="ml-4 flex gap-2">
          {onCreateReminder && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCreateReminder(event)}
              className="h-8 w-8"
              title="Créer un rappel"
            >
              <Bell className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(event)}
            className="h-8 w-8"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(event.id)}
            className="h-8 w-8 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}


