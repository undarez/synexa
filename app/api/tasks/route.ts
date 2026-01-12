import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase/client";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
import { trackActivity } from "@/app/lib/learning/tracker";
import { generateId } from "@/app/lib/supabase/helpers";
import type { Task, TaskPriority, TaskContext } from "@/app/lib/supabase/types";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const completed = searchParams.get("completed");
    const due = searchParams.get("due");
    const priority = searchParams.get("priority");
    const context = searchParams.get("context");
    const groupBy = searchParams.get("groupBy"); // "priority" | "context" | "due"

    // Construire la requête Supabase
    let query = supabase
      .from('Task')
      .select('*')
      .eq('userId', user.id);

    // Filtre par complétion
    if (completed !== null) {
      query = query.eq('completed', completed === "true");
    }

    // Filtre par priorité
    if (priority) {
      const validPriorities: TaskPriority[] = ["HIGH", "MEDIUM", "LOW"];
      if (validPriorities.includes(priority as TaskPriority)) {
        query = query.eq('priority', priority);
      }
    }

    // Filtre par contexte
    if (context) {
      const validContexts: TaskContext[] = ["PERSONAL", "WORK", "SHOPPING", "HEALTH", "OTHER"];
      if (validContexts.includes(context as TaskContext)) {
        query = query.eq('context', context);
      }
    }

    // Filtre par date d'échéance
    if (due) {
      const dueDate = new Date(due);
      if (!isNaN(dueDate.getTime())) {
        const startOfDay = new Date(dueDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dueDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query
          .gte('due', startOfDay.toISOString())
          .lte('due', endOfDay.toISOString());
      }
    }

    // Ajouter le tri (Supabase nécessite plusieurs appels order)
    query = query
      .order('priority', { ascending: false }) // HIGH en premier
      .order('due', { ascending: true, nullsFirst: false })
      .order('createdAt', { ascending: false });

    // Exécuter la requête
    const { data: tasks, error } = await query;

    // Gérer les erreurs Supabase
    if (error) {
      console.error('[API Tasks GET] Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des tâches', details: error.message },
        { status: 500 }
      );
    }

    // Regroupement intelligent si demandé
    if (groupBy) {
      const grouped: Record<string, Task[]> = {};
      (tasks || []).forEach((task: Task) => {
        let key = "";
        if (groupBy === "priority") {
          key = task.priority;
        } else if (groupBy === "context") {
          key = task.context;
        } else if (groupBy === "due") {
          if (task.due) {
            const date = new Date(task.due);
            key = date.toISOString().split("T")[0]; // YYYY-MM-DD
          } else {
            key = "Sans date";
          }
        }
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(task);
      });
      return NextResponse.json({ tasks: tasks || [], grouped });
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /tasks]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    if (!body.title || typeof body.title !== "string" || body.title.trim() === "") {
      return NextResponse.json(
        { error: "Le champ 'title' est requis" },
        { status: 400 }
      );
    }

    // Créer la tâche avec Supabase
    const now = new Date().toISOString();
    const taskId = generateId();
    
    const { data: task, error: createError } = await supabase
      .from('Task')
      .insert({
        id: taskId,
        userId: user.id,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        priority: body.priority || "MEDIUM",
        context: body.context || "PERSONAL",
        estimatedDuration: body.estimatedDuration ? parseInt(body.estimatedDuration) : null,
        energyLevel: body.energyLevel || null,
        due: body.due ? new Date(body.due).toISOString() : null,
        completed: body.completed || false,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    // Gérer les erreurs
    if (createError) {
      console.error('[API Tasks POST] Erreur Supabase:', createError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la tâche', details: createError.message },
        { status: 500 }
      );
    }

    if (!task) {
      return NextResponse.json(
        { error: 'Aucune tâche créée' },
        { status: 500 }
      );
    }

    // Tracker l'activité
    await trackActivity(
      user.id,
      "task_created",
      {
        context: body.context || "PERSONAL",
        priority: body.priority || "MEDIUM",
        estimatedDuration: body.estimatedDuration ? parseInt(body.estimatedDuration) : undefined,
        energyLevel: body.energyLevel || undefined,
      },
      "Task",
      task.id
    );

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[POST /tasks]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}




