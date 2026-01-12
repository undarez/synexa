// app/lib/supabase/client-browser.ts
// Client Supabase pour le navigateur (côté client uniquement)
// Utilise @supabase/ssr pour synchroniser automatiquement localStorage vers les cookies HTTP

"use client";

import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';
import type { Database } from './client';

/**
 * Crée un client Supabase pour le navigateur avec @supabase/ssr
 * Ce client synchronise automatiquement la session de localStorage vers les cookies HTTP
 * lors des requêtes, permettant aux Server Components d'accéder à la session via le middleware
 */
export function createBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('createBrowserClient ne peut être utilisé que côté client');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Variables d\'environnement Supabase manquantes. ' +
      'Vérifiez que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définies.'
    );
  }

  // Utiliser createBrowserClient de @supabase/ssr
  // Ce client stocke dans localStorage par défaut
  // La synchronisation vers les cookies HTTP est gérée par syncSessionToCookies dans useAuth
  return createSSRBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Instance singleton du client (créée une seule fois)
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Récupère l'instance du client Supabase pour le navigateur
 */
export function getBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('getBrowserClient ne peut être utilisé que côté client');
  }

  if (!browserClient) {
    browserClient = createBrowserClient();
  }

  return browserClient;
}
