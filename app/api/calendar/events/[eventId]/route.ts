import { NextRequest, NextResponse } from "next/server";
import { CalendarSource } from "@/app/lib/supabase/types";
import { supabase } from "@/app/lib/supabase/client";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
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
    const { data: event, error } = await supabase
      .from('CalendarEvent')
      .select('*')
      .eq('id', eventId)
      .eq('userId', user.id)
      .single();
    
    if (error || !event) {
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

    type CalendarEventData = {
      id: string;
      title: string;
      description: string | null;
      location: string | null;
      start: string;
      end: string;
      allDay: boolean;
      externalId: string | null;
      source: CalendarSource;
      reminders: unknown;
      metadata: unknown;
      [key: string]: unknown;
    };

    const { data: event, error: fetchError } = await supabase
      .from('CalendarEvent')
      .select('*')
      .eq('id', eventId)
      .eq('userId', user.id)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
    }

    const typedEvent = event as CalendarEventData;

    // Construire l'objet de mise à jour
    const updateData: {
      title?: string;
      description?: string | null;
      location?: string | null;
      allDay?: boolean;
      source?: CalendarSource;
      reminders?: any;
      metadata?: any;
      start?: string;
      end?: string;
      updatedAt: string;
    } = {
      updatedAt: new Date().toISOString(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.allDay !== undefined) updateData.allDay = body.allDay;
    if (body.source !== undefined) updateData.source = body.source;
    if (body.reminders !== undefined) updateData.reminders = body.reminders;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    if (body.start) {
      const start = new Date(body.start);
      if (Number.isNaN(start.getTime())) {
        return NextResponse.json(
          { error: "Date de début invalide" },
          { status: 400 }
        );
      }
      updateData.start = start.toISOString();
    }

    if (body.end) {
      const end = new Date(body.end);
      if (Number.isNaN(end.getTime())) {
        return NextResponse.json({ error: "Date de fin invalide" }, { status: 400 });
      }
      const startDate = updateData.start ? new Date(updateData.start) : new Date(typedEvent.start);
      if (end < startDate) {
        return NextResponse.json(
          { error: "La date de fin doit être postérieure à la date de début" },
          { status: 400 }
        );
      }
      updateData.end = end.toISOString();
    }

    // Si l'événement est synchronisé avec Google Calendar, mettre à jour aussi
    if (typedEvent.externalId && typedEvent.source === CalendarSource.GOOGLE) {
      const hasGoogleToken = await getGoogleCalendarToken(user.id);
      if (hasGoogleToken) {
        try {
          const googleEvent = convertInternalEventToGoogle({
            title: updateData.title || typedEvent.title,
            description: updateData.description ?? typedEvent.description,
            location: updateData.location ?? typedEvent.location,
            start: updateData.start ? new Date(updateData.start) : new Date(typedEvent.start),
            end: updateData.end ? new Date(updateData.end) : new Date(typedEvent.end),
            allDay: updateData.allDay ?? typedEvent.allDay,
            reminders: updateData.reminders || typedEvent.reminders,
            attendees: (updateData.metadata as any)?.attendees || (typedEvent.metadata as any)?.attendees,
          });

          await updateGoogleCalendarEvent(user.id, typedEvent.externalId!, googleEvent);
        } catch (error) {
          console.error("[PATCH /calendar/events/:id] Erreur sync Google:", error);
          // Continue avec la mise à jour locale même si Google échoue
        }
      }
    }

    // Mettre à jour avec Supabase
    // @ts-ignore - Supabase infère 'never' mais les données sont valides
    const { data: updated, error: updateError } = await supabase
      .from('CalendarEvent')
      // @ts-ignore
      .update(updateData as any)
      .eq('id', typedEvent.id)
      .eq('userId', user.id)
      .select()
      .single();

    if (updateError || !updated) {
      console.error('[PATCH /calendar/events/:id] Erreur Supabase:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de l\'événement', details: updateError?.message },
        { status: 500 }
      );
    }
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
    type CalendarEventData = {
      id: string;
      externalId: string | null;
      source: CalendarSource;
      [key: string]: unknown;
    };

    const { data: event, error: fetchError } = await supabase
      .from('CalendarEvent')
      .select('*')
      .eq('id', eventId)
      .eq('userId', user.id)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
    }

    const typedEvent = event as CalendarEventData;

    // Si l'événement est synchronisé avec Google Calendar, supprimer aussi
    if (typedEvent.externalId && typedEvent.source === CalendarSource.GOOGLE) {
      const hasGoogleToken = await getGoogleCalendarToken(user.id);
      if (hasGoogleToken) {
        try {
          await deleteGoogleCalendarEvent(user.id, typedEvent.externalId);
        } catch (error) {
          console.error("[DELETE /calendar/events/:id] Erreur sync Google:", error);
          // Continue avec la suppression locale même si Google échoue
        }
      }
    }

    // Supprimer avec Supabase
    const { error: deleteError } = await supabase
      .from('CalendarEvent')
      .delete()
      .eq('id', typedEvent.id)
      .eq('userId', user.id);

    if (deleteError) {
      console.error('[DELETE /calendar/events/:id] Erreur Supabase:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de l\'événement', details: deleteError.message },
        { status: 500 }
      );
    }
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

