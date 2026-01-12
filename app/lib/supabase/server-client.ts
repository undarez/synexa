// app/lib/supabase/server-client.ts
// Client Supabase pour les Server Components avec @supabase/ssr

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "./client";

/**
 * Crée un client Supabase pour les Server Components
 * Utilise @supabase/ssr pour lire depuis les cookies HTTP
 * 
 * IMPORTANT: Dans Next.js 16+, cookies() retourne une Promise
 * 
 * Note: Dans @supabase/ssr, il n'y a plus de createServerComponentClient.
 * On utilise directement createServerClient avec les cookies de Next.js.
 */
export async function createServerComponentClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Variables d\'environnement Supabase manquantes. ' +
      'Vérifiez que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définies.'
    );
  }

  // ⚠️ IMPORTANT: await cookies() car ça retourne une Promise dans Next.js 16+
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Les cookies ne peuvent être définis que dans Server Actions ou Route Handlers
          // Ignorer silencieusement dans les Server Components
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Les cookies ne peuvent être supprimés que dans Server Actions ou Route Handlers
        }
      },
    },
  });
}
