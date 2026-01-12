// app/lib/auth/use-auth.ts
// Hook pour gérer l'authentification Supabase

"use client";

import { useState, useEffect } from "react";
import { getBrowserClient } from "@/app/lib/supabase/client-browser";
import type { User, Session } from "@supabase/supabase-js";
import { secureSessionStorage } from "@/app/lib/utils/storage";

export interface AuthSession {
  user: User | null;
  session: Session | null;
}

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  providerToken: string | null;
  providerRefreshToken: string | null;
}

/**
 * Hook pour gérer l'authentification Supabase
 * Écoute les changements de session et fournit les méthodes d'authentification
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getBrowserClient();
    let mounted = true;

    // Fonction pour mettre à jour l'état de session
    const updateSession = (newSession: Session | null) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    };

    // Récupérer la session initiale
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error("[useAuth] Erreur lors de la récupération de la session initiale:", error);
        }
        updateSession(null);
        return;
      }
      updateSession(session);
    });

    // Fonction pour synchroniser la session de localStorage vers les cookies HTTP
    // Nécessaire pour que les Server Components puissent accéder à la session via le middleware
    // 
    // ⚠️ NOTE DE SÉCURITÉ :
    // Les cookies créés via document.cookie ne peuvent PAS être HTTP-only (limitation JavaScript).
    // Cela signifie qu'ils sont accessibles par le code client, ce qui est un risque XSS.
    // 
    // ✅ RECOMMANDATION :
    // Le middleware utilise déjà @supabase/ssr qui gère les cookies de manière sécurisée.
    // Cette fonction est un fallback pour la compatibilité, mais idéalement, @supabase/ssr
    // devrait être la seule source de vérité pour les cookies d'authentification.
    const syncSessionToCookies = async (session: Session | null) => {
      if (!session || typeof window === 'undefined') return;

      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
        if (!supabaseUrl) return;

        const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
        if (!projectId) return;

        // Créer un cookie avec la session pour que le middleware puisse y accéder
        // ⚠️ Ce cookie n'est PAS HTTP-only (limitation JavaScript)
        const cookieName = `sb-${projectId}-auth-token`;
        const cookieValue = JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          expires_at: session.expires_at,
          token_type: session.token_type,
          user: session.user,
        });

        // Calculer max-age en secondes (expires_at est en secondes depuis epoch)
        const expiresAt = session.expires_at 
          ? new Date(session.expires_at * 1000) 
          : new Date(Date.now() + (session.expires_in || 3600) * 1000);
        const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

        // Écrire dans les cookies HTTP (avec SameSite=Lax pour la compatibilité)
        // ⚠️ Ce cookie n'est PAS HTTP-only, donc accessible par JavaScript (risque XSS)
        const isSecure = process.env.NODE_ENV === 'production';
        document.cookie = `${cookieName}=${encodeURIComponent(cookieValue)}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; secure' : ''}`;

        if (process.env.NODE_ENV === 'development') {
          console.log("[useAuth] ✅ Session synchronisée vers les cookies HTTP (max-age:", maxAge, "s)");
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn("[useAuth] Erreur synchronisation session vers cookies:", error);
        }
      }
    };

    // Écouter les changements de session (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (process.env.NODE_ENV === 'development') {
        console.log("[useAuth] Événement auth:", event, newSession ? `User: ${newSession.user?.id}` : "No session");
        
        // Afficher les tokens Google après connexion (SIGNED_IN)
        if (event === 'SIGNED_IN' && newSession) {
          console.log("[useAuth] ✅ Connexion réussie - Tokens Google :");
          console.log("[useAuth]   - provider_token:", newSession.provider_token ? `${newSession.provider_token.substring(0, 30)}...` : "❌ Absent");
          console.log("[useAuth]   - provider_refresh_token:", newSession.provider_refresh_token ? `${newSession.provider_refresh_token.substring(0, 30)}...` : "❌ Absent");
          console.log("[useAuth]   - access_token:", newSession.access_token ? `${newSession.access_token.substring(0, 30)}...` : "❌ Absent");
        }
      }

      // Synchroniser la session vers les cookies HTTP pour que les Server Components y accèdent
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await syncSessionToCookies(newSession);
      } else if (event === 'SIGNED_OUT') {
        // Supprimer le cookie lors de la déconnexion
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
        if (supabaseUrl) {
          const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
          if (projectId) {
            document.cookie = `sb-${projectId}-auth-token=; path=/; max-age=0; SameSite=Lax`;
          }
        }
      }

      updateSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Connexion avec Google via Supabase OAuth (avec accès Google Calendar)
   * 
   * Scopes demandés :
   * - openid, email, profile : Informations de base de l'utilisateur
   * - https://www.googleapis.com/auth/calendar.readonly : Accès lecture seule à Google Calendar (recommandé)
   * 
   * QueryParams :
   * - access_type=offline : 🔥 OBLIGATOIRE pour obtenir un refresh_token
   * - prompt=consent : 🔥 OBLIGATOIRE pour forcer le consentement et garantir le refresh_token
   * 
   * Note: redirectTo est automatiquement la page actuelle pour revenir au même endroit après OAuth
   */
  const signInWithGoogle = async () => {
    try {
      const supabase = getBrowserClient();
      
      // Stocker la page d'origine dans sessionStorage (temporaire, navigation uniquement)
      // Utilisation de sessionStorage au lieu de localStorage pour moins de persistance
      const currentPath = window.location.pathname + window.location.search;
      secureSessionStorage.setItem('oauth_redirect_path', currentPath);
      
      // Rediriger vers la page actuelle après OAuth
      const redirectUrl = `${window.location.origin}${currentPath}`;

      if (process.env.NODE_ENV === 'development') {
        console.log("[useAuth] 🔐 Connexion Google avec scopes Calendar");
        console.log("[useAuth] Redirection OAuth vers:", redirectUrl);
        console.log("[useAuth] Page d'origine stockée:", currentPath);
        console.log("[useAuth] Scopes: openid, email, profile, calendar.readonly");
        console.log("[useAuth] QueryParams: access_type=offline, prompt=consent");
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          scopes: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.readonly", // Scope lecture seule (recommandé pour débuter)
          ].join(" "),
          queryParams: {
            access_type: "offline", // 🔥 OBLIGATOIRE pour obtenir un refresh_token
            prompt: "consent", // 🔥 OBLIGATOIRE pour forcer le consentement et garantir le refresh_token
          },
        },
      });

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error("[useAuth] ❌ Erreur lors de la connexion Google:", error);
        }
        throw error;
      }

      // La redirection vers Google se fait automatiquement via data.url
      // Supabase gère tout le reste automatiquement (détection de session, stockage des tokens)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("[useAuth] Erreur signInWithGoogle:", error);
      }
      throw error;
    }
  };

  /**
   * Déconnexion
   * Nettoie la session Supabase et toutes les données sensibles
   */
  const signOut = async () => {
    try {
      const supabase = getBrowserClient();
      
      // Nettoyer les données sensibles avant la déconnexion
      // (Supabase gère déjà le nettoyage de sa propre session)
      const { clearSensitiveData } = await import('@/app/lib/utils/storage');
      clearSensitiveData();
      
      const { error } = await supabase.auth.signOut();

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error("[useAuth] Erreur lors de la déconnexion:", error);
        }
        throw error;
      }

      // Rediriger vers la page d'accueil après déconnexion
      window.location.href = "/";
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("[useAuth] Erreur signOut:", error);
      }
      throw error;
    }
  };

  return {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut,
    providerToken: session?.provider_token ?? null,
    providerRefreshToken: session?.provider_refresh_token ?? null,
  };
}
