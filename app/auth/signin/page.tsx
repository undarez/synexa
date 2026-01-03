"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import AuthButtons from "@/app/components/auth/AuthButtons";

export default function SignInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    console.log("🔵 [SIGNIN] Statut de session:", status);
    console.log("🔵 [SIGNIN] Session:", session);
    
    if (status === "authenticated") {
      console.log("🔵 [SIGNIN] Utilisateur authentifié, redirection vers /dashboard");
      // Utiliser replace au lieu de push pour éviter l'historique de navigation
      router.replace("/dashboard");
    } else if (status === "unauthenticated") {
      // Vérifier s'il y a une erreur dans l'URL
      const error = searchParams.get("error");
      if (error) {
        console.error("🔵 [SIGNIN] Erreur détectée:", error);
        console.error("🔵 [SIGNIN] URL complète:", window.location.href);
        console.error("🔵 [SIGNIN] Tous les paramètres:", Object.fromEntries(searchParams.entries()));
        
        // Afficher un message d'erreur plus détaillé
        if (error === "Callback") {
          console.error("🔵 [SIGNIN] Erreur Callback - Le callback OAuth a échoué");
          console.error("🔵 [SIGNIN] Vérifiez les logs Vercel pour plus de détails");
        }
      }
    }
  }, [status, session, router, searchParams]);

  if (status === "loading") {
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
          Connectez-vous pour accéder à votre assistant personnel
        </p>

        <AuthButtons />
      </div>
    </div>
  );
}
