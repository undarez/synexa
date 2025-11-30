import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { CalendarSource } from "@prisma/client";
import prisma from "@/app/lib/prisma";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { toJsonInput } from "@/app/lib/prisma/json";
import { trackActivity } from "@/app/lib/learning/tracker";
import {
  createGoogleCalendarEvent,
  convertInternalEventToGoogle,
  getGoogleCalendarToken,
} from "@/app/lib/google-calendar";

type EventPayload = {
  title?: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
  source?: CalendarSource;
  externalId?: string | null;
  calendarId?: string | null;
  reminders?: unknown;
  metadata?: unknown;
  syncGoogle?: boolean; // Option pour synchroniser avec Google Calendar
};

function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Paramètre de date invalide: ${value}`);
  }
  return date;
}

function parseEventDates(payload: EventPayload) {
  const start = payload.start ? new Date(payload.start) : undefined;
  const end = payload.end ? new Date(payload.end) : undefined;

  if (start && Number.isNaN(start.getTime())) {
    throw new Error("Date de début invalide");
  }
  if (end && Number.isNaN(end.getTime())) {
    throw new Error("Date de fin invalide");
  }
  if (start && end && end < start) {
    throw new Error("La date de fin doit être postérieure à la date de début");
  }

  return { start, end };
}

function mapSourceFilter(values: string[]): CalendarSource[] {
  const allowed = new Set(Object.values(CalendarSource));
  return values
    .map((value) => value.toUpperCase())
    .filter((value): value is CalendarSource => allowed.has(value as CalendarSource));
}

function buildWhere(
  userId: string,
  params: URLSearchParams
): Prisma.CalendarEventWhereInput {
  const from = parseDateParam(params.get("from"));
  const to = parseDateParam(params.get("to"));
  const sources = mapSourceFilter(params.getAll("source"));

  const where: Prisma.CalendarEventWhereInput = { userId };

  if (from || to) {
    where.start = {
      gte: from,
      lte: to,
    };
  }

  if (sources.length > 0) {
    where.source = { in: sources };
  }

  return where;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const where = buildWhere(user.id, request.nextUrl.searchParams);

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { start: "asc" },
    });
    return NextResponse.json({ events });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as EventPayload;

    if (!body.title) {
      return NextResponse.json(
        { error: "Le champ 'title' est requis" },
        { status: 400 }
      );
    }

    const { start, end } = parseEventDates(body);
    if (!start || !end) {
      return NextResponse.json(
        { error: "Les champs 'start' et 'end' sont requis" },
        { status: 400 }
      );
    }

    let externalId: string | null = null;
    let finalSource = body.source ?? CalendarSource.LOCAL;

    // Si l'utilisateur veut synchroniser avec Google Calendar
    if (body.syncGoogle) {
      const hasGoogleToken = await getGoogleCalendarToken(user.id);
      if (hasGoogleToken) {
        try {
          const googleEvent = convertInternalEventToGoogle({
            title: body.title,
            description: body.description,
            location: body.location,
            start,
            end,
            allDay: body.allDay ?? false,
            reminders: body.reminders,
            attendees: body.metadata as any,
          });

          const createdGoogleEvent = await createGoogleCalendarEvent(
            user.id,
            googleEvent
          );
          externalId = createdGoogleEvent.id || null;
          finalSource = CalendarSource.GOOGLE;
        } catch (error) {
          console.error("[POST /calendar/events] Erreur sync Google:", error);
          // Continue avec la création locale même si Google échoue
        }
      }
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId: user.id,
        title: body.title,
        description: body.description,
        location: body.location,
        start,
        end,
        allDay: body.allDay ?? false,
        source: finalSource,
        externalId,
        calendarId: body.calendarId ?? null,
        reminders: toJsonInput(body.reminders),
        metadata: toJsonInput(body.metadata),
      },
    });

    // Tracker l'activité
    await trackActivity(
      user.id,
      "event_created",
      {
        location: body.location || undefined,
        allDay: body.allDay || false,
        source: finalSource,
      },
      "CalendarEvent",
      event.id
    );

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[POST /calendar/events]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

