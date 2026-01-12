import { Footer } from "@/app/components/Footer";
import { HomeNavigation } from "@/app/components/HomeNavigation";
import { HomeHeroSection } from "@/app/components/HomeHeroSection";
import { HomeCTASection } from "@/app/components/HomeCTASection";
import { AuthSyncHandler } from "@/app/components/AuthSyncHandler";

export const dynamic = 'force-dynamic';
import {
  Calendar,
  CheckSquare,
  Zap,
  Mic,
  Cloud,
  Wifi,
  Bell,
  Sparkles,
  AlertCircle,
} from "lucide-react";

/**
 * Page d'accueil
 * - Si l'utilisateur est connecté → redirige vers /dashboard
 * - Sinon → affiche la landing page
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; redirect?: string }>;
}) {
  const params = searchParams ? await searchParams : {};

  // Afficher un message d'erreur si présent
  const showAuthError = params?.error === "auth_required";

  const features = [
    {
      icon: Calendar,
      title: "Calendrier Intelligent",
      description:
        "Gérez tous vos événements et rendez-vous. Synchronisation avec Google Calendar et création en langage naturel.",
    },
    {
      icon: CheckSquare,
      title: "Tâches Organisées",
      description:
        "Priorités, contextes, durée estimée. Organisez vos tâches de manière intelligente avec regroupement automatique.",
    },
    {
      icon: Zap,
      title: "Automatisations",
      description:
        "Créez des routines personnalisées. Contrôlez vos devices, créez des tâches, déclenchez des actions automatiquement.",
    },
    {
      icon: Mic,
      title: "Commandes Vocales",
      description:
        "Parlez à votre assistant. Créez des événements, des tâches et des routines simplement en parlant.",
    },
    {
      icon: Cloud,
      title: "Météo & Géolocalisation",
      description:
        "Consultez la météo en temps réel basée sur votre position. Carte interactive avec prévisions.",
    },
    {
      icon: Wifi,
      title: "Domotique",
      description:
        "Découvrez et contrôlez vos devices WiFi et Bluetooth automatiquement. Intégration avec vos automatisations.",
    },
    {
      icon: Bell,
      title: "Notifications Multi-canal",
      description:
        "Recevez des notifications par email, push et SMS. Rappels intelligents avec contexte météo et trafic.",
    },
    {
      icon: Sparkles,
      title: "Brief Quotidien",
      description:
        "Résumé intelligent de votre journée avec suggestions proactives, météo, tâches prioritaires et rappels.",
    },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Handler pour synchroniser l'utilisateur après OAuth */}
      <AuthSyncHandler />
      
      {/* Message d'erreur d'authentification */}
      {showAuthError && (
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                Vous devez être connecté pour accéder à cette page.
              </p>
            </div>
            <p className="mt-2 text-xs text-orange-700 dark:text-orange-300">
              Connectez-vous ou créez un compte pour continuer.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <HomeNavigation />

      {/* Hero Section */}
      <HomeHeroSection />

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-[hsl(var(--foreground))] sm:text-4xl">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-lg text-[hsl(var(--muted-foreground))]">
            Une solution complète pour organiser votre vie quotidienne
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 transition-all duration-200 hover:shadow-soft-lg hover:border-[hsl(var(--primary))]/30 hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-[hsl(var(--primary))]/10 to-[hsl(var(--gradient-end))]/10 p-3 group-hover:from-[hsl(var(--primary))]/20 group-hover:to-[hsl(var(--gradient-end))]/20 transition-all">
                  <Icon className="h-6 w-6 text-[hsl(var(--primary))]" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[hsl(var(--foreground))]">
                  {feature.title}
                </h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <HomeCTASection />

      <Footer />
    </div>
  );
}
