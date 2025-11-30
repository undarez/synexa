"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { RoutineForm } from "@/app/components/RoutineForm";
import { RoutineItem } from "@/app/components/RoutineItem";
import { RoutineTemplates } from "@/app/components/RoutineTemplates";
import type { RoutineTemplate } from "@/app/components/RoutineTemplates";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import type { Routine } from "@prisma/client";
import { Footer } from "@/app/components/Footer";

export default function RoutinesPage() {
  const { data: session, status } = useSession();
  const [routines, setRoutines] = useState<
    Array<
      Routine & {
        steps?: Array<{
          id: string;
          order: number;
          actionType: string;
        }>;
      }
    >
  >([]);
  const [devices, setDevices] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/?error=auth_required&redirect=/routines");
    }
  }, [status]);

  const fetchRoutines = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/routines");
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des routines");
      }
      const data = await response.json();
      setRoutines(data.routines || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/devices");
      if (response.ok) {
        const data = await response.json();
        setDevices(
          (data.devices || []).map((d: { id: string; name: string }) => ({
            id: d.id,
            name: d.name,
          }))
        );
      }
    } catch (err) {
      // Ignore device errors
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchRoutines();
      fetchDevices();
    }
  }, [status]);

  const handleDelete = async (routineId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette routine ?")) {
      return;
    }

    try {
      const response = await fetch(`/api/routines/${routineId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      await fetchRoutines();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const handleToggleActive = async (routineId: string, active: boolean) => {
    try {
      const routine = routines.find((r) => r.id === routineId);
      if (!routine) return;

      const response = await fetch(`/api/routines/${routineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la modification");
      }

      await fetchRoutines();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la modification");
    }
  };

  const handleExecute = async (routineId: string) => {
    try {
      const response = await fetch(`/api/routines/${routineId}/execute`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de l'exécution");
      }

      alert("Routine exécutée avec succès !");
      await fetchRoutines();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'exécution");
    }
  };

  const handleEdit = (routine: Routine) => {
    setEditingRoutine(routine);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingRoutine(null);
  };

  const handleFormSuccess = () => {
    fetchRoutines();
    setShowTemplates(false);
  };

  const handleSelectTemplate = (template: RoutineTemplate) => {
    // Créer une routine temporaire avec les données du template pour pré-remplir le formulaire
    const templateRoutine = {
      id: "template",
      name: template.name,
      description: template.description,
      active: true,
      triggerType: template.triggerType,
      triggerData: template.triggerData || {},
      steps: template.steps.map((step, index) => ({
        id: `temp-${index}`,
        order: index,
        actionType: step.actionType as string,
        payload: step.payload || {},
        deviceId: null,
        delaySeconds: step.delaySeconds || 0,
      })),
      userId: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    setEditingRoutine(templateRoutine);
    setFormOpen(true);
    setShowTemplates(false);
  };

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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navigation />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                Automatisations
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Créez des scénarios automatisés pour simplifier votre quotidien
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowTemplates(!showTemplates)}>
                Templates
              </Button>
              <Button variant="outline" asChild>
                <a href="/routines/test">Tester</a>
              </Button>
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle automatisation
              </Button>
            </div>
          </div>

          {/* Section explicative */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950/20">
            <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              💡 Qu'est-ce qu'une automatisation ?
            </h2>
            <p className="mb-4 text-zinc-700 dark:text-zinc-300">
              Une <strong>automatisation</strong> (aussi appelée "routine" ou "scénario") est une séquence d'actions 
              qui s'exécutent automatiquement lorsqu'un événement se produit.
            </p>
            <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <div>
                <p className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                  📰 Exemple concret : Réveil intelligent
                </p>
                <p className="mb-2">
                  Vous habitez à <strong>Paris</strong> et vous voulez être informé chaque matin à 7h :
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>Recevoir les <strong>infos trafic en temps réel</strong> pour votre trajet habituel</li>
                  <li>Lire les <strong>actualités de votre journal préféré</strong> (Le Monde, Libération, etc.)</li>
                  <li>Créer une tâche "Préparer le petit-déjeuner"</li>
                </ul>
                <p className="mt-2 text-xs italic">
                  → Créez une automatisation programmée à 7h avec 3 actions : Notification (trafic), Notification (actualités), Créer une tâche
                </p>
              </div>
              
              <div className="mt-4 border-t border-blue-300 pt-3 dark:border-blue-800">
                <p className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                  Autres exemples :
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>
                    <strong>Départ au travail :</strong> "Quand je dis 'Je pars', éteindre les lumières et envoyer une notification avec le trafic"
                  </li>
                  <li>
                    <strong>Arrivée à la maison :</strong> "Quand je suis à moins de 100m de chez moi, allumer le chauffage et jouer ma playlist"
                  </li>
                  <li>
                    <strong>Soirée détente :</strong> "À 20h, baisser les lumières, lancer Netflix et créer une tâche 'Préparer le dîner'"
                  </li>
                </ul>
              </div>
              
              <p className="mt-3 text-xs">
                💡 <strong>Astuce :</strong> Vous pouvez créer des automatisations avec plusieurs étapes qui s'exécutent dans l'ordre, 
                avec des délais entre chaque action si nécessaire.
              </p>
            </div>
          </div>
        </div>

        {showTemplates && (
          <RoutineTemplates onSelectTemplate={handleSelectTemplate} />
        )}

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
        ) : routines.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucune automatisation</CardTitle>
              <CardDescription>
                Créez votre première automatisation pour simplifier votre quotidien
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setFormOpen(true)} variant="outline" className="w-full">
                Créer une automatisation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {routines.map((routine) => (
              <RoutineItem
                key={routine.id}
                routine={routine}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
                onExecute={handleExecute}
              />
            ))}
          </div>
        )}

        <RoutineForm
          routine={editingRoutine}
          open={formOpen}
          onOpenChange={handleFormClose}
          onSuccess={handleFormSuccess}
          devices={devices}
        />
      </main>
      <Footer />
    </div>
  );
}

