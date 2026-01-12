// app/components/HomeCTASection.tsx
// Section CTA pour la page d'accueil avec Supabase Auth

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/app/lib/auth/use-auth";

export function HomeCTASection() {
  const { user, session, loading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  // Éviter les problèmes d'hydratation en ne rendant le contenu dynamique qu'après le montage
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--gradient-end))] p-12 text-center shadow-soft-lg">
        <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
          Prêt à commencer ?
        </h2>
        <p className="mb-8 text-lg text-white/90">
          {/* IMPORTANT: Ne jamais afficher de contenu basé sur la session si loading === true ou si pas encore monté */}
          {isMounted && !loading && user && session
            ? "Bienvenue sur Synexa ! Accédez à votre dashboard pour commencer."
            : "Rejoignez Synexa et transformez votre façon de vous organiser."
          }
        </p>
        {/* IMPORTANT: Ne jamais afficher de contenu basé sur la session si loading === true ou si pas encore monté */}
        {isMounted && !loading ? (
          user && session ? (
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
          )
        ) : (
          <Button size="lg" variant="secondary" disabled>
            Chargement...
          </Button>
        )}
      </div>
    </section>
  );
}
