// app/components/AuthSyncHandler.tsx
// Composant client pour gérer la synchronisation de l'utilisateur après OAuth
// S'exécute uniquement après le retour de Google OAuth pour synchroniser l'utilisateur avec la table User
// IMPORTANT: Ne jamais rediriger si session === null au premier render - attendre loading === false

"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth/use-auth";
import { secureSessionStorage } from "@/app/lib/utils/storage";

/**
 * Composant pour gérer la synchronisation de l'utilisateur après OAuth
 * Vérifie si une session existe après le retour de Google OAuth et synchronise l'utilisateur avec la table User
 * 
 * RÈGLE IMPORTANTE: Ne jamais rediriger si session === null au premier render
 * Attendre que loading === false avant de prendre des décisions
 */
export function AuthSyncHandler() {
  const router = useRouter();
  const { user, session, loading } = useAuth();
  const hasSynced = useRef(false);
  const hasOAuthParams = useRef(false);

  useEffect(() => {
    // Vérifier si on vient de Google OAuth (paramètres dans l'URL ou hash)
    // Cette vérification se fait une seule fois au montage
    if (!hasOAuthParams.current) {
      hasOAuthParams.current = 
        window.location.search.includes('code=') ||
        window.location.search.includes('access_token=') ||
        window.location.hash.includes('code=') ||
        window.location.hash.includes('access_token=');
    }

    // Vérification supplémentaire : si une page d'origine est stockée dans sessionStorage
    // ET qu'une session existe, on peut supposer qu'on vient de OAuth
    const storedRedirectPath = secureSessionStorage.getItem('oauth_redirect_path');
    const mightBeFromOAuth = storedRedirectPath !== null;

    // Si pas de paramètres OAuth ET pas de page d'origine stockée, ne rien faire
    if (!hasOAuthParams.current && !mightBeFromOAuth) {
      return;
    }
    
    // Si on a des paramètres OAuth OU une page d'origine stockée, on traite comme un retour OAuth
    if (!hasOAuthParams.current && mightBeFromOAuth) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[AuthSyncHandler] Page d'origine détectée dans sessionStorage, vérification de la session...");
      }
    }

    // IMPORTANT: Ne jamais rediriger si loading === true
    // Attendre que la session soit hydratée avant de prendre des décisions
    if (loading) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[AuthSyncHandler] ⏳ En attente de l'hydratation de la session...");
      }
      return;
    }

    // Ne s'exécuter qu'une seule fois après que loading === false
    if (hasSynced.current) {
      return;
    }

    // Si loading === false et pas de session, attendre un peu plus (OAuth peut prendre du temps)
    // Mais ne pas rediriger immédiatement vers signin - laisser l'UI décider
    if (!session || !user) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("[AuthSyncHandler] ⚠️ Paramètres OAuth détectés mais aucune session après hydratation");
        console.warn("[AuthSyncHandler] Nettoyage de l'URL... (ne pas rediriger vers signin prématurément)");
      }
      // Nettoyer l'URL mais ne pas rediriger - laisser l'UI décider quoi afficher
      window.history.replaceState({}, '', '/');
      return;
    }

    // Marquer comme traité pour éviter les re-exécutions
    hasSynced.current = true;

    // Si une session existe et qu'on a un utilisateur, synchroniser avec la table User
    if (session && user) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[AuthSyncHandler] ✅ Session détectée après OAuth, synchronisation de l'utilisateur...");
      }

      // Synchroniser l'utilisateur avec la table User
      const syncUser = async () => {
        try {
          const response = await fetch('/api/auth/sync-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
              image: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (process.env.NODE_ENV === 'development') {
              console.log("[AuthSyncHandler] ✅ Utilisateur synchronisé:", result.created ? "créé" : "existant");
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn("[AuthSyncHandler] Erreur lors de la synchronisation de l'utilisateur (non bloquant)");
            }
          }

          // Récupérer la page d'origine depuis sessionStorage (stockée avant OAuth)
          const originalPath = secureSessionStorage.getItem('oauth_redirect_path') || '/dashboard';
          
          // Nettoyer sessionStorage
          secureSessionStorage.removeItem('oauth_redirect_path');
          
          // Nettoyer l'URL en enlevant les paramètres OAuth
          window.history.replaceState({}, '', originalPath);
          
          // Rediriger vers la page d'origine (ou dashboard par défaut)
          // Utiliser router.push au lieu de window.location.href pour une meilleure expérience
          router.push(originalPath);
        } catch (syncError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn("[AuthSyncHandler] Erreur lors de la synchronisation (non bloquant):", syncError);
          }
          
          // Récupérer la page d'origine depuis sessionStorage (stockée avant OAuth)
          const originalPath = secureSessionStorage.getItem('oauth_redirect_path') || '/dashboard';
          
          // Nettoyer sessionStorage
          secureSessionStorage.removeItem('oauth_redirect_path');
          
          // Continuer quand même - l'utilisateur peut être créé plus tard
          window.history.replaceState({}, '', originalPath);
          router.push(originalPath);
        }
      };

      syncUser();
    }
  }, [user, session, loading, router]);

  // Ce composant ne rend rien
  return null;
}
