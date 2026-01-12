"use client";

import { useAuth } from "@/app/lib/auth/use-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { SignInButton } from "@/app/components/auth/SignInButton";
import { GoogleTokensDisplay } from "@/app/components/auth/GoogleTokensDisplay";

export default function SignInPage() {
  const { user, session, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // IMPORTANT: Ne jamais rediriger si loading === true
    // Attendre que la session soit hydratée avant de prendre des décisions
    if (loading) {
      return;
    }

    // Si l'utilisateur est connecté ET qu'on a une session valide, rediriger vers le dashboard
    // Ne pas rediriger si user === null au premier render - attendre loading === false
    if (user && session) {
      const redirectTo = searchParams.get("redirect_to") || "/dashboard";
      router.replace(redirectTo);
    }
  }, [user, session, loading, router, searchParams]);

  // Afficher les erreurs éventuelles
  const error = searchParams.get("error");
  const errorMessage = searchParams.get("message");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Connexion à Synexa
        </h1>
        
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Connectez-vous avec Google pour accéder à votre assistant personnel
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            <p className="font-medium">Erreur d'authentification</p>
            <p className="mt-1">{errorMessage || error}</p>
          </div>
        )}

        <SignInButton />

        {/* Affichage des tokens Google (mode développement uniquement) */}
        <GoogleTokensDisplay />

        <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
        </p>
      </div>
    </div>
  );
}
