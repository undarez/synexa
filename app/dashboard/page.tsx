import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth/session";
import { startOfDay, endOfDay } from "date-fns";
import prisma from "@/app/lib/prisma";
import { Navigation } from "@/app/components/Navigation";
import { EventsList } from "@/app/components/EventsList";
import { TasksList } from "@/app/components/TasksList";
import { RoutinesList } from "@/app/components/RoutinesList";
import { NetworkDetector } from "@/app/components/NetworkDetector";
import { VoiceCommandWrapper } from "@/app/components/VoiceCommandWrapper";
import { DailyBrief } from "@/app/components/DailyBrief";
import { Footer } from "@/app/components/Footer";
import { ChatInterface } from "@/app/components/ChatInterface";
import { PersonalizedRecommendations } from "@/app/components/PersonalizedRecommendations";
import { WellnessDashboard } from "@/app/components/WellnessDashboard";
import { DashboardWidgetManager } from "@/app/components/DashboardWidgetManager";
import { SynexaProactiveSuggestions } from "@/app/components/SynexaProactiveSuggestions";

async function getUserDisplayName(userId: string): Promise<string> {
  try {
    // Essayer de récupérer avec les nouveaux champs
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pseudo: true,
        firstName: true,
        name: true,
        email: true,
      },
    });

    return (
      (user as any)?.pseudo ||
      (user as any)?.firstName ||
      user?.name ||
      user?.email ||
      "Utilisateur"
    );
  } catch (error: any) {
    // Si les colonnes n'existent pas encore, utiliser les champs de base
    if (error?.code === "P2022" || error?.message?.includes("does not exist")) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      return user?.name || user?.email || "Utilisateur";
    }
    throw error;
  }
}

async function getDashboardData(userId: string) {
  try {
    const now = new Date();

    const [events, tasks, routines] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          userId,
          start: { gte: startOfDay(now), lt: endOfDay(now) },
        },
        orderBy: { start: "asc" },
      }),
      prisma.task.findMany({
        where: { userId },
        orderBy: { due: "asc" },
        take: 5,
      }),
      prisma.routine.findMany({
        where: { userId, active: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return {
      agenda: events,
      tasks,
      activeRoutines: routines.map((routine) => ({
        id: routine.id,
        name: routine.name,
        triggerType: routine.triggerType,
      })),
    };
  } catch (error) {
    console.error("Erreur dashboard:", error);
    return {
      agenda: [],
      tasks: [],
      activeRoutines: [],
    };
  }
}

export default async function Dashboard() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/?error=auth_required&redirect=/dashboard");
  }

  const brief = await getDashboardData(user.id);
  const displayName = await getUserDisplayName(user.id);
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--text))] transition-colors">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header Section - Design System */}
        <div className="mb-6">
          <div className="bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] rounded-2xl p-6 sm:p-8 shadow-[var(--shadow-card)] transition-all duration-180">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="mb-3">
                    <span className="text-sm font-medium text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] uppercase tracking-wider">
                      {formattedDate}
                    </span>
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-bold mb-2 text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                    Bonjour {displayName}{" "}
                    <span className="inline-block animate-wave">👋</span>
                  </h1>
                  <p className="text-lg text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] font-medium">
                    Voici votre aperçu personnalisé du jour
                  </p>
                </div>
                
                {/* Statistiques rapides */}
                <div className="flex flex-wrap gap-6 sm:gap-8">
                  <div className="flex flex-col">
                    <span className="text-sm text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] mb-1">
                      Événements
                    </span>
                    <span className="text-2xl sm:text-3xl font-bold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                      {brief.agenda?.length || 0}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] mb-1">
                      Tâches
                    </span>
                    <span className="text-2xl sm:text-3xl font-bold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                      {brief.tasks?.length || 0}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] mb-1">
                      Routines
                    </span>
                    <span className="text-2xl sm:text-3xl font-bold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                      {brief.activeRoutines?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
          </div>
        </div>

        {/* Suggestions proactives de Synexa */}
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <SynexaProactiveSuggestions maxSuggestions={3} autoRefresh={true} />
        </div>

        {/* Gestionnaire de widgets personnalisables */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <DashboardWidgetManager
            events={brief.agenda || []}
            tasks={brief.tasks || []}
            routines={brief.activeRoutines || []}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}

