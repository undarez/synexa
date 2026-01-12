// app/lib/auth/use-session.ts
// Hook client pour remplacer useSession de NextAuth
// Utilise maintenant Supabase Auth via useAuth()

"use client";

import { useAuth } from "./use-auth";

export interface Session {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
  expires: string;
}

/**
 * Hook pour récupérer la session utilisateur (compatible avec NextAuth)
 * Utilise Supabase Auth en interne
 */
export function useSession() {
  const { user, session, loading } = useAuth();

  // Convertir la session Supabase en format compatible NextAuth
  const nextAuthSession: Session | null = user && session
    ? {
        user: {
          id: user.id,
          email: user.email || null,
          name: user.user_metadata?.full_name || 
                user.user_metadata?.name || 
                user.email?.split('@')[0] || 
                null,
          image: user.user_metadata?.avatar_url || 
                 user.user_metadata?.picture || 
                 null,
        },
        expires: session.expires_at 
          ? new Date(session.expires_at * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours par défaut
      }
    : null;

  const status: "loading" | "authenticated" | "unauthenticated" = 
    loading ? "loading" : (nextAuthSession ? "authenticated" : "unauthenticated");

  return { data: nextAuthSession, status };
}

/**
 * Déconnexion (compatible avec NextAuth)
 * Utilise Supabase Auth en interne
 * 
 * Note: Cette fonction doit être utilisée dans un composant client qui utilise useAuth()
 * Pour une déconnexion directe, utilisez getBrowserClient().auth.signOut()
 */
export function signOut() {
  // Cette fonction est dépréciée - utilisez useAuth().signOut() dans vos composants
  // ou getBrowserClient().auth.signOut() directement
  if (typeof window !== "undefined") {
    import("@/app/lib/supabase/client-browser").then(({ getBrowserClient }) => {
      getBrowserClient().auth.signOut();
    });
  }
}

