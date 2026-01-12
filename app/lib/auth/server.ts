// app/lib/auth/server.ts
// Fonctions d'authentification Supabase côté serveur (Server Components, API Routes)
// Utilise @supabase/ssr pour synchroniser automatiquement la session de localStorage vers les cookies HTTP

import { createServerComponentClient } from "@/app/lib/supabase/server-client";
import { supabase } from "@/app/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Interface pour l'utilisateur côté serveur avec prénom/nom séparés
 */
export interface ServerUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  name?: string | null;
  image?: string | null;
}

/**
 * Erreur d'authentification
 */
export class UnauthorizedError extends Error {
  constructor(message = 'Non authentifié') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// La fonction createServerSupabaseClient a été déplacée dans app/lib/supabase/server-client.ts
// Utiliser createServerComponentClient() à la place

/**
 * Récupère l'utilisateur actuel côté serveur depuis Supabase Auth
 * Extrait le prénom et nom depuis user_metadata Google
 * 
 * Priorité pour l'affichage :
 * 1. Table User (firstName + lastName)
 * 2. user_metadata OAuth (given_name + family_name)
 * 3. user_metadata OAuth (full_name)
 * 4. Email (fallback)
 * 
 * @returns L'utilisateur avec prénom/nom séparés ou null si non authentifié
 */
export async function getCurrentUser(): Promise<ServerUser | null> {
  try {
    const supabase = await createServerComponentClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[getCurrentUser] Pas d'utilisateur:", error?.message || "User null");
      }
      return null;
    }

    // Extraire les informations depuis user_metadata Google
    const metadata = user.user_metadata || {};
    const fullName = metadata.full_name || metadata.name || null;
    const firstName = metadata.given_name || metadata.first_name || null;
    const lastName = metadata.family_name || metadata.last_name || null;
    const image = metadata.avatar_url || metadata.picture || null;

    // Essayer de récupérer depuis la table User si disponible
    let userProfile: { firstName?: string | null; lastName?: string | null; name?: string | null } | null = null;
    try {
      const { data } = await supabase
        .from('User')
        .select('name, firstName, lastName')
        .eq('id', user.id)
        .single();

      if (data) {
        userProfile = data;
      }
    } catch (dbError) {
      // Ignorer les erreurs DB, utiliser les métadonnées OAuth
      if (process.env.NODE_ENV === 'development') {
        console.log("[getCurrentUser] Pas de profil dans la table User, utilisation des métadonnées OAuth");
      }
    }

    // Priorité: table User > user_metadata OAuth > email
    const displayFirstName = userProfile?.firstName || firstName || null;
    const displayLastName = userProfile?.lastName || lastName || null;
    const displayName = userProfile?.name || fullName || (displayFirstName && displayLastName ? `${displayFirstName} ${displayLastName}` : null) || user.email?.split('@')[0] || "Utilisateur";

    if (process.env.NODE_ENV === 'development') {
      console.log("[getCurrentUser] ✅ Utilisateur:", user.id);
      console.log("[getCurrentUser]   - firstName:", displayFirstName);
      console.log("[getCurrentUser]   - lastName:", displayLastName);
      console.log("[getCurrentUser]   - fullName:", displayName);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: displayFirstName,
      lastName: displayLastName,
      fullName: displayName,
      name: displayName,
      image,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("[getCurrentUser] Erreur:", error);
    }
    return null;
  }
}

/**
 * Récupère l'utilisateur actuel ou lance une erreur si non authentifié
 * 
 * @throws {UnauthorizedError} Si l'utilisateur n'est pas authentifié
 * @returns L'utilisateur avec prénom/nom séparés
 */
export async function requireUser(): Promise<ServerUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new UnauthorizedError('Vous devez être authentifié pour accéder à cette ressource');
  }
  
  return user;
}

/**
 * Récupère l'utilisateur Supabase complet (avec toutes les métadonnées)
 * Utilise @supabase/ssr pour récupérer la session depuis les cookies HTTP
 * 
 * @returns L'utilisateur Supabase complet ou null
 */
export async function getSupabaseUser(): Promise<User | null> {
  try {
    const supabase = await createServerComponentClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[getSupabaseUser] Erreur:", error.message);
      }
      return null;
    }

    return user ?? null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("[getSupabaseUser] Erreur inattendue:", error);
    }
    return null;
  }
}
