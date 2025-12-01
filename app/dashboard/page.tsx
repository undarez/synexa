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

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">
            Bonjour {await getUserDisplayName(user.id)} 👋
          </h1>
          <p className="mt-2 text-[hsl(var(--muted-foreground))]">
            Voici votre aperçu du jour
          </p>
        </div>

        {/* Gestionnaire de widgets personnalisables */}
        <DashboardWidgetManager
          events={brief.agenda || []}
          tasks={brief.tasks || []}
          routines={brief.activeRoutines || []}
        />
      </main>
      <Footer />
    </div>
  );
}

