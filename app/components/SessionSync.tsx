"use client";

/**
 * Composant pour synchroniser la session Supabase de localStorage vers les cookies HTTP
 * Nécessaire pour que les Server Components puissent accéder à la session
 * 
 * Ce composant doit être monté tôt dans l'application (layout ou page) pour synchroniser
 * la session avant que les Server Components ne soient rendus
 */
import { useEffect } from "react";
import { getBrowserClient } from "@/app/lib/supabase/client-browser";

export function SessionSync() {
  useEffect(() => {
    const syncSession = async () => {
      try {
        const supabase = getBrowserClient();
        
        // Récupérer la session depuis localStorage (Supabase la stocke ici)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (process.env.NODE_ENV === 'development') {
            console.log("[SessionSync] Aucune session trouvée dans localStorage");
          }
          return;
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
        if (!supabaseUrl) return;

        const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
        if (!projectId) return;

        // Créer un cookie avec la session pour que le middleware et les Server Components puissent y accéder
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
        const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : new Date(Date.now() + 3600 * 1000);
        const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

        // Écrire dans les cookies HTTP (avec SameSite=Lax pour la compatibilité)
        const isSecure = process.env.NODE_ENV === 'production';
        document.cookie = `${cookieName}=${encodeURIComponent(cookieValue)}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; secure' : ''}`;

        if (process.env.NODE_ENV === 'development') {
          console.log("[SessionSync] ✅ Session synchronisée vers les cookies HTTP (max-age:", maxAge, "s)");
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn("[SessionSync] Erreur synchronisation session:", error);
        }
      }
    };

    // Synchroniser immédiatement au montage
    syncSession();

    // Écouter les changements de session pour resynchroniser
    const supabase = getBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        syncSession();
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
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Ce composant ne rend rien
  return null;
}
