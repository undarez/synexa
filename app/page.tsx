import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth/session";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Footer } from "@/app/components/Footer";
import { HeroSection } from "@/app/components/HeroSection";

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
  ArrowRight,
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
  const user = await getCurrentUser();
  const params = searchParams ? await searchParams : {};

  // Ne pas rediriger automatiquement - permettre à l'utilisateur de voir la landing page
  // même s'il est connecté (utile pour cliquer sur le logo "Synexa")
  // Si on a un paramètre redirect explicite, rediriger vers cette page
  if (params?.redirect && user) {
    redirect(params.redirect);
  }

  // Afficher la landing page
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
      <nav className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/"
              className="text-xl font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent hover:opacity-80 transition-opacity"
            >
              Synexa
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/about"
                className="text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
              >
                En savoir plus
              </Link>
              <Link
                href="/contact"
                className="text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
              >
                Contact
              </Link>
              {user ? (
                <Link href="/dashboard">
                  <Button size="sm">Aller au dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/signin">
                    <Button variant="outline" size="sm">
                      Connexion
                    </Button>
                  </Link>
                  <Link href="/auth/signin">
                    <Button size="sm">Commencer</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <HeroSection user={user} />

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
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--gradient-end))] p-12 text-center shadow-soft-lg">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Prêt à commencer ?
          </h2>
          <p className="mb-8 text-lg text-white/90">
            {user 
              ? "Bienvenue sur Synexa ! Accédez à votre dashboard pour commencer."
              : "Rejoignez Synexa et transformez votre façon de vous organiser."
            }
          </p>
          {user ? (
            <Link href="/dashboard">
              <Button size="lg" variant="secondary">
                Aller au dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <Link href="/auth/signin">
              <Button size="lg" variant="secondary">
                Créer un compte gratuit
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
