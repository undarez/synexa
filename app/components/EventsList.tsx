"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import type { CalendarEvent } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";

interface EventsListProps {
  events: CalendarEvent[];
}

export function EventsList({ events }: EventsListProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rendez-vous du jour</CardTitle>
          <CardDescription>Aucun rendez-vous prévu aujourd'hui</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/calendar">
            <Button variant="outline" className="w-full">
              Créer un événement
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Rendez-vous du jour</CardTitle>
            <CardDescription>{events.length} événement{events.length > 1 ? "s" : ""} prévu{events.length > 1 ? "s" : ""}</CardDescription>
          </div>
          <Link href="/calendar">
            <Button variant="ghost" size="sm">
              Voir tout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.slice(0, 3).map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:bg-[hsl(var(--muted))]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                  <h3 className="font-medium text-[hsl(var(--foreground))]">
                    {event.title}
                  </h3>
                  {event.description && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {event.description}
                    </p>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </div>
                  )}
                </div>
                <div className="ml-4 flex items-center gap-2 text-right">
                  <Calendar className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {format(new Date(event.start), "HH:mm")}
                    </p>
                    {!event.allDay && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {format(new Date(event.end), "HH:mm")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {events.length > 3 && (
            <Link href="/calendar">
              <Button variant="ghost" className="w-full">
                Voir {events.length - 3} événement{events.length - 3 > 1 ? "s" : ""} de plus
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
