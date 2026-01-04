import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { trackActivity } from "@/app/lib/learning/tracker";
import type { Task } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const completed = searchParams.get("completed");
    const due = searchParams.get("due");
    const priority = searchParams.get("priority");
    const context = searchParams.get("context");
    const groupBy = searchParams.get("groupBy"); // "priority" | "context" | "due"

    const where: any = { userId: user.id };

    // Filtre par complétion
    if (completed !== null) {
      where.completed = completed === "true";
    }

    // Filtre par priorité
    if (priority) {
      where.priority = priority;
    }

    // Filtre par contexte
    if (context) {
      where.context = context;
    }

    // Filtre par date d'échéance
    if (due) {
      const dueDate = new Date(due);
      if (!isNaN(dueDate.getTime())) {
        const startOfDay = new Date(dueDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dueDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.due = { gte: startOfDay, lte: endOfDay };
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { priority: "desc" }, // HIGH en premier
        { due: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
    });

    // Regroupement intelligent si demandé
    if (groupBy) {
      const grouped: Record<string, typeof tasks> = {};
      tasks.forEach((task: Task) => {
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
      return NextResponse.json({ tasks, grouped });
    }

    return NextResponse.json({ tasks });
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

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        priority: body.priority || "MEDIUM",
        context: body.context || "PERSONAL",
        estimatedDuration: body.estimatedDuration ? parseInt(body.estimatedDuration) : null,
        energyLevel: body.energyLevel || null,
        due: body.due ? new Date(body.due) : null,
        completed: body.completed || false,
      },
    });

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




