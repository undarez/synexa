import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { estimateTaskDuration } from "@/app/lib/tasks/duration-estimator";
import type { TaskContext, TaskPriority } from "@prisma/client";

/**
 * GET - Estime la durée d'une tâche basée sur l'historique
 * Query: title, context, priority, description (optionnel)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    
    const title = searchParams.get("title");
    const context = searchParams.get("context") as TaskContext;
    const priority = searchParams.get("priority") as TaskPriority;
    const description = searchParams.get("description");

    if (!title || !context || !priority) {
      return NextResponse.json(
        { error: "title, context et priority sont requis" },
        { status: 400 }
      );
    }

    const estimate = await estimateTaskDuration(
      user.id,
      title,
      context,
      priority,
      description || null
    );

    return NextResponse.json({
      estimatedMinutes: estimate.estimatedMinutes,
      confidence: estimate.confidence,
      basedOn: estimate.basedOn,
    });
  } catch (error) {
    console.error("[GET /api/tasks/estimate-duration]", error);
    return NextResponse.json(
      { error: "Erreur lors de l'estimation" },
      { status: 500 }
    );
  }
}



