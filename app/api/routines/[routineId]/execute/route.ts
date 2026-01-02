import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { executeRoutine } from "@/app/lib/routines/engine";
import { trackActivity } from "@/app/lib/learning/tracker";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ routineId: string }> }
) {
  try {
    const user = await requireUser();
    const { routineId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      dryRun?: boolean;
      metadata?: Record<string, unknown>;
    };

    const result = await executeRoutine(routineId, user.id, {
      dryRun: body.dryRun,
      metadata: body.metadata,
    });

    // Tracker l'exécution de routine
    if (!body.dryRun) {
      await trackActivity(
        user.id,
        "routine_executed",
        {
          routineId,
          ...body.metadata,
        },
        "Routine",
        routineId
      );
    }

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[POST /routines/:id/execute]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

