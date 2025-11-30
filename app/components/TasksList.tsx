"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CheckSquare2, ArrowRight } from "lucide-react";
import type { Task } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";

interface TasksListProps {
  tasks: Task[];
}

export function TasksList({ tasks }: TasksListProps) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tâches</CardTitle>
          <CardDescription>Aucune tâche en cours</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/tasks">
            <Button variant="outline" className="w-full">
              Créer une tâche
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tâches</CardTitle>
            <CardDescription>{tasks.length} tâche{tasks.length > 1 ? "s" : ""} à faire</CardDescription>
          </div>
          <Link href="/tasks">
            <Button variant="ghost" size="sm">
              Voir tout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.slice(0, 3).map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
            >
              <CheckSquare2 className="mt-0.5 h-4 w-4 text-zinc-400" />
              <div className="flex-1">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                  {task.title}
                </h3>
                {task.due && (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                    Échéance : {format(new Date(task.due), "PPP")}
                  </p>
                )}
              </div>
            </div>
          ))}
          {tasks.length > 3 && (
            <Link href="/tasks">
              <Button variant="ghost" className="w-full">
                Voir {tasks.length - 3} tâche{tasks.length - 3 > 1 ? "s" : ""} de plus
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
