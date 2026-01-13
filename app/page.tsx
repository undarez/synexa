import { Footer } from "@/app/components/Footer";
import { HomeNavigation } from "@/app/components/HomeNavigation";
import { HomeHeroSection } from "@/app/components/HomeHeroSection";
import { HomeCTASection } from "@/app/components/HomeCTASection";
import { HomePricingSection } from "@/app/components/HomePricingSection";
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
      icon: Wifi,
      title: "Domotique",
      description:
        "Contrôlez vos devices IoT (lumières, thermostats, volets). Support multi-vendors (Hue, Home Assistant, MQTT).",
    },
    {
      icon: Zap,
      title: "Automatisations",
      description:
        "Créez des routines intelligentes. Déclenchez des actions selon l'heure, la localisation, ou des événements.",
    },
    {
      icon: AlertCircle,
      title: "Sécurité",
      description:
        "Surveillance avancée avec caméras, détecteurs de mouvement, alertes en temps réel et journal d'événements.",
    },
    {
      icon: Sparkles,
      title: "Assistant IA",
      description:
        "Grok intégré pour des conversations naturelles. Créez des événements, des tâches et contrôlez votre maison en langage naturel.",
    },
    {
      icon: Mic,
      title: "Voix",
      description:
        "Commandes vocales pour contrôler votre maison. Assistant vocal complet disponible avec les plans Plus et Pro.",
    },
    {
      icon: Calendar,
      title: "Calendrier & Organisation",
      description:
        "Gérez vos événements, rendez-vous et rappels. Synchronisation Google Calendar, rappels intelligents avec météo et trafic.",
    },
    {
      icon: CheckSquare,
      title: "Tâches & Rappels",
      description:
        "Organisez vos tâches avec priorités et contextes. Rappels multi-canal (email, push, SMS) avec contexte intelligent.",
    },
    {
      icon: Cloud,
      title: "Météo & Trafic",
      description:
        "Météo en temps réel basée sur votre position. Informations trafic pour vos déplacements.",
    },
    {
      icon: Wifi,
      title: "Consommation Électrique",
      description:
        "Suivez votre consommation d'énergie. Intégration Enedis et SICEA pour un suivi détaillé de vos factures.",
    },
    {
      icon: Sparkles,
      title: "Finance Personnelle",
      description:
        "Gérez vos dépenses, revenus et factures. Suivi budgétaire et alertes de paiement automatiques.",
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

      {/* Pricing Section */}
      <HomePricingSection />

      {/* CTA Section */}
      <HomeCTASection />

      <Footer />
    </div>
  );
}
