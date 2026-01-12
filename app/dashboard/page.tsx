import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth/server";
import { UserGreeting } from "@/app/components/dashboard/UserGreeting";
import { startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/app/lib/supabase/client";
import type { Routine } from "@/app/lib/supabase/types";

export const dynamic = 'force-dynamic';
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

// getUserDisplayName n'est plus nécessaire, getCurrentUser retourne déjà toutes les infos nécessaires

async function getDashboardData(userId: string) {
  try {
    // TODO: Remplacer par Supabase
    // const now = new Date();
    // const start = startOfDay(now).toISOString();
    // const end = endOfDay(now).toISOString();
    // 
    // const [events, tasks, routines] = await Promise.all([
    //   supabase.from('CalendarEvent').select('*').eq('userId', userId).gte('start', start).lt('start', end).order('start', { ascending: true }),
    //   supabase.from('Task').select('*').eq('userId', userId).order('due', { ascending: true }).limit(5),
    //   supabase.from('Routine').select('*').eq('userId', userId).eq('active', true).order('createdAt', { ascending: true }),
    // ]);

    // Pour l'instant, retourner des données vides
    return {
      agenda: [],
      tasks: [],
      activeRoutines: [],
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
  // Récupérer l'utilisateur depuis Supabase Auth (vraie session)
  // IMPORTANT: redirect() doit être appelé EN DEHORS de tout try/catch
  // car redirect() lance une exception NEXT_REDIRECT qui doit être propagée
  const user = await getCurrentUser();

  // Si pas d'utilisateur authentifié, rediriger vers la page de connexion
  // Cette redirection ne doit PAS être dans un try/catch
  if (!user) {
    if (process.env.NODE_ENV === 'development') {
      console.log("[DASHBOARD] Aucun utilisateur trouvé, redirection vers /auth/signin");
    }
    redirect("/auth/signin");
  }

  // Reste du code dans un try/catch pour gérer les erreurs métier
  try {
    // Essayer de récupérer les données, mais continuer même si ça échoue
    let brief: Awaited<ReturnType<typeof getDashboardData>>;
    
    try {
      brief = await getDashboardData(user.id);
    } catch (error) {
      console.error("[DASHBOARD] Erreur getDashboardData:", error);
      brief = {
        agenda: [],
        tasks: [],
        activeRoutines: [],
      };
    }
    
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
                  {/* Affichage du nom complet : "Bonjour Prénom Nom" */}
                  <UserGreeting user={user} variant="full" />
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
  } catch (error) {
    // IMPORTANT: Ne PAS utiliser redirect() dans un catch car ça lance NEXT_REDIRECT
    // Afficher plutôt un état d'erreur à l'utilisateur
    console.error("[DASHBOARD] Erreur critique:", error);
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Erreur</h1>
          <p className="text-muted-foreground">
            Une erreur est survenue lors du chargement du dashboard.
          </p>
          <p className="text-sm text-muted-foreground">
            <a href="/auth/signin" className="text-primary underline">
              Retourner à la page de connexion
            </a>
          </p>
        </div>
      </div>
    );
  }
}

