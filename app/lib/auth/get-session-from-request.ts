// app/lib/auth/get-session-from-request.ts
// Fonction utilitaire pour récupérer la session Supabase depuis une requête API

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/app/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

/**
 * Récupère la session Supabase depuis une requête API
 * Vérifie le token dans les cookies ou le header Authorization
 */
export async function getSessionFromRequest(request: NextRequest): Promise<{
  session: Session | null;
  user: User | null;
  error?: string;
}> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        session: null,
        user: null,
        error: "Variables d'environnement Supabase manquantes",
      };
    }

    // Créer un client Supabase pour le serveur
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Récupérer le token depuis le header Authorization ou les cookies
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.replace("Bearer ", "") || null;

    if (!accessToken) {
      // Essayer de récupérer depuis les cookies (si la session est persistée)
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        // Supabase stocke la session dans les cookies avec le préfixe sb-{project-id}-auth-token
        // Pour l'instant, on retourne null si pas de token dans le header
        // TODO: Implémenter la récupération depuis les cookies si nécessaire
        return {
          session: null,
          user: null,
          error: "Token d'authentification manquant dans le header Authorization",
        };
      }
    }

    // Vérifier la session avec le token
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      if (accessToken) {
        // Si on a un token mais pas de session, essayer de le valider manuellement
        const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
        
        if (userError || !user) {
          return {
            session: null,
            user: null,
            error: "Token invalide ou expiré",
          };
        }

        // Créer une session minimale (sans refresh_token côté serveur)
        return {
          session: {
            access_token: accessToken,
            token_type: "bearer",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            refresh_token: "",
            user,
          } as Session,
          user,
        };
      }

      return {
        session: null,
        user: null,
        error: error?.message || "Session non trouvée",
      };
    }

    return {
      session,
      user: session.user,
    };
  } catch (error) {
    return {
      session: null,
      user: null,
      error: error instanceof Error ? error.message : "Erreur inattendue",
    };
  }
}
