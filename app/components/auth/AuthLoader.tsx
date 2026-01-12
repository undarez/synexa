"use client";

/**
 * Composant Loader à afficher pendant le chargement de la session
 * Utilise useAuth pour détecter l'état de chargement
 */
import { useAuth } from "@/app/lib/auth/client";

export function AuthLoader({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement de la session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
