import { NextRequest, NextResponse } from "next/server";
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

function normalizeSteps(steps: RoutineStepInput[] = []): RoutineStepInput[] {
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

export async function GET() {
  try {
    const user = await requireUser();
    const routines = await prisma.routine.findMany({
      where: { userId: user.id },
      include: {
        steps: { orderBy: { order: "asc" } },
        logs: { orderBy: { executedAt: "desc" }, take: 5 },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ routines });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /routines]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as RoutinePayload;

    if (!body.name) {
      return NextResponse.json(
        { error: "Le champ 'name' est requis" },
        { status: 400 }
      );
    }

    const steps = normalizeSteps(body.steps ?? []);

    const routine = await prisma.routine.create({
      data: {
        userId: user.id,
        name: body.name,
        description: body.description ?? null,
        active: body.active ?? true,
        triggerType: body.triggerType ?? RoutineTriggerType.MANUAL,
        triggerData: toJsonInput(body.triggerData),
        steps: {
          create: steps.map((step) => ({
            order: step.order ?? 0,
            actionType: step.actionType,
            payload: toJsonInput(step.payload),
            deviceId: step.deviceId,
            delaySeconds: step.delaySeconds,
          })),
        },
      },
      include: { steps: { orderBy: { order: "asc" } }, logs: true },
    });

    return NextResponse.json({ routine }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[POST /routines]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

