import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";
import { ReminderType, ReminderStatus } from "@prisma/client";
import { toJsonInput } from "@/app/lib/prisma/json";

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
  { params }: { params: { reminderId: string } }
) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as ReminderUpdatePayload;

    const reminder = await prisma.reminder.findFirst({
      where: { id: params.reminderId, userId: user.id },
    });

    if (!reminder) {
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

    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.message !== undefined) updateData.message = body.message;
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
      updateData.scheduledFor = scheduledFor;
    }

    const updated = await prisma.reminder.update({
      where: { id: reminder.id },
      data: updateData,
    });

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
  { params }: { params: { reminderId: string } }
) {
  try {
    const user = await requireUser();

    const reminder = await prisma.reminder.findFirst({
      where: { id: params.reminderId, userId: user.id },
    });

    if (!reminder) {
      return NextResponse.json(
        { error: "Rappel introuvable" },
        { status: 404 }
      );
    }

    // Marquer comme annulé au lieu de supprimer (pour l'historique)
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { status: ReminderStatus.CANCELLED },
    });

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




