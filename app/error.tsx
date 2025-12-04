"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";
import { Footer } from "@/app/components/Footer";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Logger l'erreur (vous pouvez l'envoyer à un service de monitoring)
    console.error("Application error:", error);
  }, [error]);

  const isAuthError = error.message?.includes("Non autorisé") || 
                     error.message?.includes("Unauthorized") ||
                     error.message?.includes("auth_required");

  const isUserNotFoundError = error.message?.includes("Utilisateur introuvable") ||
                              error.message?.includes("UserNotFound");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
              <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-2xl">
              {isAuthError || isUserNotFoundError
                ? "Accès non autorisé"
                : "Une erreur est survenue"}
            </CardTitle>
            <CardDescription>
              {isAuthError
                ? "Vous devez être connecté pour accéder à cette page"
                : isUserNotFoundError
                ? "Votre compte n'existe pas ou a été supprimé"
                : "Une erreur inattendue s'est produite"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isAuthError && !isUserNotFoundError && (
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3">
                <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 break-all">
                  {error.message || "Erreur inconnue"}
                </p>
                {error.digest && (
                  <p className="text-xs text-zinc-500 mt-2">
                    Code d'erreur: {error.digest}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {isAuthError || isUserNotFoundError ? (
                <Button asChild className="w-full">
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Retour à l'accueil
                  </Link>
                </Button>
              ) : (
                <>
                  <Button onClick={reset} className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Réessayer
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/">
                      <Home className="mr-2 h-4 w-4" />
                      Retour à l'accueil
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}







