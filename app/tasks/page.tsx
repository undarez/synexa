"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Plus, Loader2, Filter, X, CheckSquare2, Square } from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { TaskForm } from "@/app/components/TaskForm";
import { TaskItem } from "@/app/components/TaskItem";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import type { Task, TaskPriority, TaskContext } from "@prisma/client";
import { Footer } from "@/app/components/Footer";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type GroupByOption = "none" | "priority" | "context" | "due";

// Composant pour l'affichage groupé
function GroupedTasksDisplay({
  tasks,
  groupBy,
  onEdit,
  onDelete,
  onToggleComplete,
}: {
  tasks: Task[];
  groupBy: GroupByOption;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
}) {
  const grouped: Record<string, Task[]> = {};
  
  tasks.forEach((task) => {
    let key = "";
    if (groupBy === "priority") {
      key = task.priority;
    } else if (groupBy === "context") {
      key = task.context;
    } else if (groupBy === "due") {
      if (task.due) {
        const date = new Date(task.due);
        key = date.toISOString().split("T")[0];
      } else {
        key = "Sans date";
      }
    }
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(task);
  });

  const getGroupLabel = (key: string): string => {
    if (groupBy === "priority") {
      const labels: Record<string, string> = { HIGH: "Haute priorité", MEDIUM: "Priorité moyenne", LOW: "Basse priorité" };
      return labels[key] || key;
    } else if (groupBy === "context") {
      const labels: Record<string, string> = {
        WORK: "Travail", PERSONAL: "Personnel", SHOPPING: "Courses", HEALTH: "Santé",
        FINANCE: "Finance", HOME: "Maison", SOCIAL: "Social", LEARNING: "Apprentissage", OTHER: "Autre"
      };
      return labels[key] || key;
    } else if (groupBy === "due") {
      if (key === "Sans date") return "Sans date d'échéance";
      const date = new Date(key);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDate = new Date(date);
      taskDate.setHours(0, 0, 0, 0);
      
      if (taskDate.getTime() === today.getTime()) {
        return "Aujourd'hui";
      } else if (taskDate < today) {
        return `En retard (${format(date, "PPP", { locale: fr })})`;
      } else {
        return format(date, "PPP", { locale: fr });
      }
    }
    return key;
  };

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (groupBy === "priority") {
      const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (order[a] || 99) - (order[b] || 99);
    } else if (groupBy === "due") {
      if (a === "Sans date") return 1;
      if (b === "Sans date") return -1;
      return new Date(a).getTime() - new Date(b).getTime();
    }
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      {sortedKeys.map((key) => (
        <Card key={key} className="border-[hsl(var(--border))] bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(var(--card-foreground))]/5">
          <CardHeader>
            <CardTitle className="text-lg">
              {getGroupLabel(key)} ({grouped[key].length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {grouped[key].map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TasksPage() {
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Filtres
  const [showCompleted, setShowCompleted] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [contextFilter, setContextFilter] = useState<TaskContext | "all">("all");
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [groupingSuggestions, setGroupingSuggestions] = useState<Array<{ type: string; label: string; reason: string; confidence: number }>>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/?error=auth_required&redirect=/tasks");
    }
  }, [status]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (!showCompleted) {
        params.append("completed", "false");
      }
      if (priorityFilter !== "all") {
        params.append("priority", priorityFilter);
      }
      if (contextFilter !== "all") {
        params.append("context", contextFilter);
      }
      if (groupBy !== "none") {
        params.append("groupBy", groupBy);
      }

      const response = await fetch(`/api/tasks?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des tâches");
      }
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchTasks();
      fetchGroupingSuggestions();
    }
  }, [status, showCompleted, priorityFilter, contextFilter, groupBy]);

  const fetchGroupingSuggestions = async () => {
    try {
      const response = await fetch("/api/tasks/grouping-suggestions");
      if (response.ok) {
        const data = await response.json();
        setGroupingSuggestions(data.suggestions || []);
      }
    } catch (err) {
      // Ignorer les erreurs silencieusement
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      await fetchTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour");
      }

      await fetchTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingTask(null);
  };

  const handleFormSuccess = () => {
    fetchTasks();
  };

  const clearFilters = () => {
    setShowCompleted(false);
    setPriorityFilter("all");
    setContextFilter("all");
    setGroupBy("none");
  };

  const hasActiveFilters = priorityFilter !== "all" || contextFilter !== "all" || showCompleted || groupBy !== "none";

  const completedTasks = tasks.filter((t) => t.completed);
  const activeTasks = tasks.filter((t) => !t.completed);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--foreground))]">
              Mes tâches
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[hsl(var(--muted-foreground))]">
              Gérez vos tâches avec priorité, contexte et durée estimée
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle tâche
          </Button>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtres et regroupement
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Réinitialiser
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Afficher complétées</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showCompleted ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowCompleted(!showCompleted)}
                  >
                    {showCompleted ? <CheckSquare2 className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    {showCompleted ? "Oui" : "Non"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priorité</label>
                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TaskPriority | "all")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="HIGH">Haute</SelectItem>
                    <SelectItem value="MEDIUM">Moyenne</SelectItem>
                    <SelectItem value="LOW">Basse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Contexte</label>
                <Select value={contextFilter} onValueChange={(v) => setContextFilter(v as TaskContext | "all")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="WORK">Travail</SelectItem>
                    <SelectItem value="PERSONAL">Personnel</SelectItem>
                    <SelectItem value="SHOPPING">Courses</SelectItem>
                    <SelectItem value="HEALTH">Santé</SelectItem>
                    <SelectItem value="FINANCE">Finance</SelectItem>
                    <SelectItem value="HOME">Maison</SelectItem>
                    <SelectItem value="SOCIAL">Social</SelectItem>
                    <SelectItem value="LEARNING">Apprentissage</SelectItem>
                    <SelectItem value="OTHER">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Regrouper par</label>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    <SelectItem value="priority">Priorité</SelectItem>
                    <SelectItem value="context">Contexte</SelectItem>
                    <SelectItem value="due">Date d'échéance</SelectItem>
                  </SelectContent>
                </Select>
                {groupingSuggestions.length > 0 && groupBy === "none" && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">💡 Suggestions :</p>
                    {groupingSuggestions.slice(0, 2).map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setGroupBy(suggestion.type as GroupByOption)}
                        className="block w-full text-left text-xs text-[hsl(var(--primary))] hover:underline"
                        title={suggestion.reason}
                      >
                        {suggestion.label} ({Math.round(suggestion.confidence * 100)}%)
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </CardContent>
          </Card>
        ) : tasks.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucune tâche</CardTitle>
              <CardDescription>
                Commencez par créer votre première tâche
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Affichage groupé si activé */}
            {groupBy !== "none" ? (
              <GroupedTasksDisplay
                tasks={tasks}
                groupBy={groupBy}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleComplete={handleToggleComplete}
              />
            ) : (
              <>
                {/* Tâches actives */}
                {activeTasks.length > 0 && (
                  <div>
                    <h2 className="mb-4 text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">
                      Tâches actives ({activeTasks.length})
                    </h2>
                    <div className="space-y-3">
                      {activeTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onToggleComplete={handleToggleComplete}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Tâches complétées */}
                {showCompleted && completedTasks.length > 0 && (
                  <div>
                    <h2 className="mb-4 text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">
                      Tâches complétées ({completedTasks.length})
                    </h2>
                    <div className="space-y-3">
                      {completedTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onToggleComplete={handleToggleComplete}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <TaskForm
          task={editingTask}
          open={formOpen}
          onOpenChange={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      </main>
      <Footer />
    </div>
  );
}
