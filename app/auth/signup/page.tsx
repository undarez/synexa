/**
 * Page d'inscription
 */

"use client";

import { useAuth } from "@/app/lib/auth/use-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { SignInButton } from "@/app/components/auth/SignInButton";
import { EmailSignUpForm } from "@/app/components/auth/EmailSignUpForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import Link from "next/link";

export default function SignUpPage() {
  const { user, session, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // IMPORTANT: Ne jamais rediriger si loading === true
    if (loading) {
      return;
    }

    // Si l'utilisateur est déjà connecté, rediriger vers le dashboard
    if (user && session) {
      const redirectTo = searchParams.get("redirect") || "/dashboard";
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-2 text-2xl font-semibold text-black dark:text-zinc-50">
          Créer un compte
        </h1>
        
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Choisissez votre méthode d'inscription
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            <p className="font-medium">Erreur d'inscription</p>
            <p className="mt-1">{errorMessage || error}</p>
          </div>
        )}

        <Tabs defaultValue="google" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="google">Google</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>
          <TabsContent value="google" className="space-y-4">
            <SignInButton />
          </TabsContent>
          <TabsContent value="email" className="space-y-4">
            <EmailSignUpForm />
          </TabsContent>
        </Tabs>

        <div className="mt-4 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Déjà un compte ?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          En vous inscrivant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
        </p>
      </div>
    </div>
  );
}
