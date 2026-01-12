// app/components/HomeNavigation.tsx
// Navigation simplifiée pour la page d'accueil avec Supabase Auth

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/lib/auth/use-auth";

export function HomeNavigation() {
  const { user, session, loading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  // Éviter les problèmes d'hydratation en ne rendant le contenu dynamique qu'après le montage
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
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
            {/* IMPORTANT: Ne jamais afficher de contenu basé sur la session si loading === true ou si pas encore monté */}
            {!isMounted || loading ? (
              <Button size="sm" disabled>
                Chargement...
              </Button>
            ) : user && session ? (
              <Link href="/dashboard">
                <Button size="sm">Aller au dashboard</Button>
              </Link>
            ) : (
              <Link href="/auth/signin">
                <Button size="sm">Se connecter avec Google</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
