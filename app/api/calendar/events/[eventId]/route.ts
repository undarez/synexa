import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { CalendarSource } from "@prisma/client";
import prisma from "@/app/lib/prisma";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { toJsonInput } from "@/app/lib/prisma/json";
import {
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  convertInternalEventToGoogle,
  getGoogleCalendarToken,
} from "@/app/lib/google-calendar";

type EventUpdatePayload = {
  title?: string;
  description?: string | null;
  location?: string | null;
  start?: string;
  end?: string;
  allDay?: boolean;
  source?: CalendarSource;
  reminders?: unknown;
  metadata?: unknown;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await requireUser();
    const { eventId } = await params;
    const event = await prisma.calendarEvent.findFirst({
      where: { id: eventId, userId: user.id },
    });
    
    if (!event) {
      return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
    }
    
    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /calendar/events/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as EventUpdatePayload;
    const { eventId } = await params;

    const event = await prisma.calendarEvent.findFirst({
      where: { id: eventId, userId: user.id },
    });
    if (!event) {
      return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
    }

    const data: Prisma.CalendarEventUpdateInput = {};

    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.location !== undefined) data.location = body.location;
    if (body.allDay !== undefined) data.allDay = body.allDay;
    if (body.source !== undefined) data.source = body.source;
    if (body.reminders !== undefined) data.reminders = toJsonInput(body.reminders);
    if (body.metadata !== undefined) data.metadata = toJsonInput(body.metadata);

    if (body.start) {
      const start = new Date(body.start);
      if (Number.isNaN(start.getTime())) {
        return NextResponse.json(
          { error: "Date de début invalide" },
          { status: 400 }
        );
      }
      data.start = start;
    }

    if (body.end) {
      const end = new Date(body.end);
      if (Number.isNaN(end.getTime())) {
        return NextResponse.json({ error: "Date de fin invalide" }, { status: 400 });
      }
      if (data.start && end < data.start) {
        return NextResponse.json(
          { error: "La date de fin doit être postérieure à la date de début" },
          { status: 400 }
        );
      }
      data.end = end;
    }

    // Si l'événement est synchronisé avec Google Calendar, mettre à jour aussi
    if (event.externalId && event.source === CalendarSource.GOOGLE) {
      const hasGoogleToken = await getGoogleCalendarToken(user.id);
      if (hasGoogleToken) {
        try {
          const googleEvent = convertInternalEventToGoogle({
            title: (data.title as string) || event.title,
            description: (data.description as string | null) || event.description,
            location: (data.location as string | null) || event.location,
            start: (data.start as Date) || event.start,
            end: (data.end as Date) || event.end,
            allDay: (data.allDay as boolean) ?? event.allDay,
            reminders: (data.reminders as any) || event.reminders,
            attendees: (data.metadata as any)?.attendees,
          });

          await updateGoogleCalendarEvent(user.id, event.externalId, googleEvent);
        } catch (error) {
          console.error("[PATCH /calendar/events/:id] Erreur sync Google:", error);
          // Continue avec la mise à jour locale même si Google échoue
        }
      }
    }

    const updated = await prisma.calendarEvent.update({
      where: { id: event.id },
      data,
    });
    return NextResponse.json({ event: updated });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[PATCH /calendar/events/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await requireUser();
    const { eventId } = await params;
    const event = await prisma.calendarEvent.findFirst({
      where: { id: eventId, userId: user.id },
    });
    if (!event) {
      return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
    }

    // Si l'événement est synchronisé avec Google Calendar, supprimer aussi
    if (event.externalId && event.source === CalendarSource.GOOGLE) {
      const hasGoogleToken = await getGoogleCalendarToken(user.id);
      if (hasGoogleToken) {
        try {
          await deleteGoogleCalendarEvent(user.id, event.externalId);
        } catch (error) {
          console.error("[DELETE /calendar/events/:id] Erreur sync Google:", error);
          // Continue avec la suppression locale même si Google échoue
        }
      }
    }

    await prisma.calendarEvent.delete({ where: { id: event.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[DELETE /calendar/events/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

