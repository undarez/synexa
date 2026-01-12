import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";
import { ReminderType, ReminderStatus } from "@/app/lib/supabase/types";

type ReminderUpdatePayload = {
  title?: string;
  message?: string;
  reminderType?: ReminderType;
  scheduledFor?: string;
  includeTraffic?: boolean;
  includeWeather?: boolean;
};

/**
 * Met à jour un rappel
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> }
) {
  try {
    const user = await requireUser();
    const { reminderId } = await params;
    const body = (await request.json()) as ReminderUpdatePayload;

    // Récupérer le rappel
    const { data: reminder, error: fetchError } = await supabase
      .from('Reminder')
      .select('*')
      .eq('id', reminderId)
      .eq('userId', user.id)
      .single();

    if (fetchError || !reminder) {
      return NextResponse.json(
        { error: "Rappel introuvable" },
        { status: 404 }
      );
    }

    if (reminder.status !== ReminderStatus.PENDING) {
      return NextResponse.json(
        { error: "Impossible de modifier un rappel déjà envoyé" },
        { status: 400 }
      );
    }

    // Construire l'objet de mise à jour
    const updateData: {
      title?: string;
      message?: string | null;
      reminderType?: ReminderType;
      includeTraffic?: boolean;
      includeWeather?: boolean;
      scheduledFor?: string;
      updatedAt: string;
    } = {
      updatedAt: new Date().toISOString(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.message !== undefined) updateData.message = body.message || null;
    if (body.reminderType !== undefined) updateData.reminderType = body.reminderType;
    if (body.includeTraffic !== undefined) updateData.includeTraffic = body.includeTraffic;
    if (body.includeWeather !== undefined) updateData.includeWeather = body.includeWeather;

    if (body.scheduledFor) {
      const scheduledFor = new Date(body.scheduledFor);
      if (scheduledFor < new Date()) {
        return NextResponse.json(
          { error: "La date d'envoi ne peut pas être dans le passé" },
          { status: 400 }
        );
      }
      updateData.scheduledFor = scheduledFor.toISOString();
    }

    // Mettre à jour avec Supabase
    const { data: updated, error: updateError } = await supabase
      .from('Reminder')
      // @ts-expect-error - Le type Database.Update est any, mais TypeScript ne l'infère pas correctement
      .update(updateData)
      .eq('id', reminder.id)
      .eq('userId', user.id)
      .select()
      .single();

    if (updateError || !updated) {
      console.error('[PATCH /reminders/:id] Erreur Supabase:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du rappel', details: updateError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ reminder: updated });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[PATCH /reminders/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * Supprime un rappel
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> }
) {
  try {
    const user = await requireUser();
    const { reminderId } = await params;

    // Vérifier que le rappel existe
    const { data: reminder, error: fetchError } = await supabase
      .from('Reminder')
      .select('id')
      .eq('id', reminderId)
      .eq('userId', user.id)
      .single();

    if (fetchError || !reminder) {
      return NextResponse.json(
        { error: "Rappel introuvable" },
        { status: 404 }
      );
    }

    // Marquer comme annulé au lieu de supprimer (pour l'historique)
    const { error: updateError } = await supabase
      .from('Reminder')
      .update({
        status: ReminderStatus.CANCELLED,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', reminder.id)
      .eq('userId', user.id);

    if (updateError) {
      console.error('[DELETE /reminders/:id] Erreur Supabase:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'annulation du rappel', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[DELETE /reminders/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}









