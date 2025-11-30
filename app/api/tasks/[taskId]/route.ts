import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { trackActivity } from "@/app/lib/learning/tracker";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await requireUser();
    const { taskId } = await params;
    const body = await request.json();

    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: user.id },
    });

    if (!task) {
      return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
    }

    const updateData: any = {};
    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim() === "") {
        return NextResponse.json(
          { error: "Le titre ne peut pas être vide" },
          { status: 400 }
        );
      }
      updateData.title = body.title.trim();
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }
    if (body.priority !== undefined) {
      updateData.priority = body.priority;
    }
    if (body.context !== undefined) {
      updateData.context = body.context;
    }
    if (body.estimatedDuration !== undefined) {
      updateData.estimatedDuration = body.estimatedDuration ? parseInt(body.estimatedDuration) : null;
    }
    if (body.energyLevel !== undefined) {
      updateData.energyLevel = body.energyLevel || null;
    }
    if (body.due !== undefined) {
      updateData.due = body.due ? new Date(body.due) : null;
    }
    if (body.completed !== undefined) {
      updateData.completed = body.completed;
      if (body.completed && !task.completed) {
        updateData.completedAt = new Date();
      } else if (!body.completed) {
        updateData.completedAt = null;
      }
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: updateData,
    });

    // Tracker l'activité
    if (body.completed !== undefined) {
      if (body.completed && !task.completed) {
        // Tâche complétée
        const duration = task.estimatedDuration || undefined;
        await trackActivity(
          user.id,
          "task_completed",
          {
            context: updated.context,
            priority: updated.priority,
            duration,
            energyLevel: updated.energyLevel || undefined,
          },
          "Task",
          task.id
        );
      }
    } else {
      // Tâche mise à jour
      await trackActivity(
        user.id,
        "task_updated",
        {
          context: updated.context,
          priority: updated.priority,
        },
        "Task",
        task.id
      );
    }

    return NextResponse.json({ task: updated });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[PATCH /tasks/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await requireUser();
    const { taskId } = await params;

    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: user.id },
    });

    if (!task) {
      return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id: task.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[DELETE /tasks/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}




