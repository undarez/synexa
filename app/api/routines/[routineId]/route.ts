import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { RoutineActionType, RoutineTriggerType } from "@prisma/client";
import prisma from "@/app/lib/prisma";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { toJsonInput } from "@/app/lib/prisma/json";

type RoutineStepInput = {
  actionType: RoutineActionType;
  payload?: Record<string, unknown> | null;
  deviceId?: string | null;
  delaySeconds?: number | null;
  order?: number;
};

type RoutinePayload = {
  name?: string;
  description?: string | null;
  active?: boolean;
  triggerType?: RoutineTriggerType;
  triggerData?: Record<string, unknown> | null;
  steps?: RoutineStepInput[];
};

function normalizeSteps(steps: RoutineStepInput[] = []) {
  return steps
    .filter((step) => !!step.actionType)
    .map((step, index) => ({
      actionType: step.actionType,
      payload: step.payload ?? null,
      deviceId: step.deviceId ?? null,
      delaySeconds: step.delaySeconds ?? null,
      order: step.order ?? index,
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((step, index) => ({ ...step, order: index }));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ routineId: string }> }
) {
  try {
    const user = await requireUser();
    const { routineId } = await params;
    const body = (await request.json()) as RoutinePayload;

    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId: user.id },
      include: { steps: true },
    });
    if (!routine) {
      return NextResponse.json({ error: "Routine introuvable" }, { status: 404 });
    }

    const data: Prisma.RoutineUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.active !== undefined) data.active = body.active;
    if (body.triggerType !== undefined) data.triggerType = body.triggerType;
    if (body.triggerData !== undefined) data.triggerData = toJsonInput(body.triggerData);

    const updates = [];
    updates.push(
      prisma.routine.update({
        where: { id: routine.id },
        data,
      })
    );

    if (body.steps) {
      const steps = normalizeSteps(body.steps);
      updates.push(
        prisma.routineStep.deleteMany({ where: { routineId: routine.id } })
      );
      if (steps.length > 0) {
        updates.push(
          prisma.routineStep.createMany({
            data: steps.map((step) => ({
              routineId: routine.id,
              order: step.order ?? 0,
              actionType: step.actionType,
              payload: toJsonInput(step.payload),
              deviceId: step.deviceId,
              delaySeconds: step.delaySeconds,
            })),
          })
        );
      }
    }

    await prisma.$transaction(updates);

    const updated = await prisma.routine.findUnique({
      where: { id: routine.id },
      include: { steps: { orderBy: { order: "asc" } }, logs: true },
    });

    return NextResponse.json({ routine: updated });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[PATCH /routines/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ routineId: string }> }
) {
  try {
    const user = await requireUser();
    const { routineId } = await params;
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId: user.id },
    });
    if (!routine) {
      return NextResponse.json({ error: "Routine introuvable" }, { status: 404 });
    }

    await prisma.routine.delete({ where: { id: routine.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[DELETE /routines/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

