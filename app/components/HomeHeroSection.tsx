// app/components/HomeHeroSection.tsx
// Hero Section pour la page d'accueil avec Supabase Auth

"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/app/lib/auth/use-auth";

// Charger AnimatedSphere uniquement côté client pour éviter les erreurs d'hydratation
const AnimatedSphere = dynamic(
  () => import("@/app/components/AnimatedSphere").then((mod) => ({ default: mod.AnimatedSphere })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center">
        <div className="rounded-full bg-gradient-to-br from-blue-400/20 via-purple-500/20 to-blue-600/20 blur-3xl h-full w-full" />
      </div>
    ),
  }
);

export function HomeHeroSection() {
  const { user, session, loading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  // Éviter les problèmes d'hydratation en ne rendant le contenu dynamique qu'après le montage
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-[hsl(var(--border))] bg-gradient-to-br from-[hsl(var(--primary))]/5 via-[hsl(var(--gradient-end))]/5 to-[hsl(var(--accent))]/5">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col justify-center">
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-[hsl(var(--foreground))] sm:text-6xl">
              Votre assistant
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                personnel intelligent
              </span>
            </h1>
            <p className="mb-8 text-xl text-[hsl(var(--muted-foreground))]">
              Organisez votre quotidien, gérez votre agenda, automatisez vos actions.
              Synexa vous accompagne dans toutes vos tâches quotidiennes.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              {/* IMPORTANT: Ne jamais afficher de contenu basé sur la session si loading === true ou si pas encore monté */}
              {isMounted && !loading ? (
                user && session ? (
                  <Link href="/dashboard">
                    <Button size="lg" className="w-full sm:w-auto">
                      Aller au dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/auth/signin">
                    <Button size="lg" className="w-full sm:w-auto">
                      Commencer gratuitement
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                )
              ) : (
                <Button size="lg" className="w-full sm:w-auto" disabled>
                  Chargement...
                </Button>
              )}
              <Link href="/about">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  En savoir plus
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative h-[400px] w-full max-w-[400px]">
              <AnimatedSphere size={400} className="h-full w-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
