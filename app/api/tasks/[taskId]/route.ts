import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase/client";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
import { trackActivity } from "@/app/lib/learning/tracker";
import type { Task } from "@/app/lib/supabase/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await requireUser();
    const { taskId } = await params;
    const body = await request.json();

    // Récupérer la tâche avec Supabase
    const { data: taskData, error: fetchError } = await supabase
      .from('Task')
      .select('*')
      .eq('id', taskId)
      .eq('userId', user.id)
      .single();

    if (fetchError || !taskData) {
      return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
    }

    const task = taskData as Task;

    // Construire l'objet de mise à jour
    const updateData: {
      title?: string;
      description?: string | null;
      priority?: string;
      context?: string;
      estimatedDuration?: number | null;
      energyLevel?: string | null;
      due?: string | null;
      completed?: boolean;
      completedAt?: string | null;
      updatedAt: string;
    } = {
      updatedAt: new Date().toISOString(),
    };

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
      updateData.due = body.due ? new Date(body.due).toISOString() : null;
    }
    if (body.completed !== undefined) {
      updateData.completed = body.completed;
      if (body.completed && !task.completed) {
        updateData.completedAt = new Date().toISOString();
        // Mettre à jour l'estimation de durée après complétion
        const { updateDurationEstimate } = await import("@/app/lib/tasks/duration-estimator");
        updateDurationEstimate(user.id, taskId).catch(console.error);
      } else if (!body.completed) {
        updateData.completedAt = null;
      }
    }

    // Mettre à jour avec Supabase
    // Le type Database définit Update: any, mais TypeScript a besoin d'une assertion
    const { data: updatedData, error: updateError } = await supabase
      .from('Task')
      // @ts-expect-error - Le type Database.Update est any, mais TypeScript ne l'infère pas correctement
      .update(updateData)
      .eq('id', task.id)
      .eq('userId', user.id)
      .select()
      .single();

    if (updateError || !updatedData) {
      console.error('[PATCH /tasks/:id] Erreur Supabase:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la tâche', details: updateError?.message },
        { status: 500 }
      );
    }

    const updated = updatedData as Task;

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

    // Vérifier que la tâche existe et appartient à l'utilisateur
    const { data: taskData, error: fetchError } = await supabase
      .from('Task')
      .select('id')
      .eq('id', taskId)
      .eq('userId', user.id)
      .single();

    if (fetchError || !taskData) {
      return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
    }

    const task = taskData as { id: string };

    // Supprimer avec Supabase
    const { error: deleteError } = await supabase
      .from('Task')
      .delete()
      .eq('id', task.id)
      .eq('userId', user.id);

    if (deleteError) {
      console.error('[DELETE /tasks/:id] Erreur Supabase:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de la tâche', details: deleteError.message },
        { status: 500 }
      );
    }

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




