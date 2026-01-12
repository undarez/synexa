// app/lib/auth/mock-client.ts
// Exports côté client pour remplacer next-auth/react
// À remplacer par Supabase Auth plus tard

"use client";

export { useSession, signOut } from "./use-session";
export type { Session } from "./use-session";

/**
 * Fonction signIn mock pour remplacer NextAuth signIn
 * TODO: Implémenter avec Supabase Auth
 */
export async function signIn(
  provider?: string,
  options?: {
    email?: string;
    password?: string;
    callbackUrl?: string;
    redirect?: boolean;
  }
): Promise<{ error?: string; ok?: boolean; url?: string } | undefined> {
  // Pour l'instant, en mode mock, on simule une connexion réussie
  // ou on redirige vers la page de connexion
  
  if (provider === "credentials" && options?.email && options?.password) {
    // Simulation d'une connexion credentials
    // TODO: Implémenter avec Supabase Auth
    console.log("[signIn Mock] Tentative de connexion avec credentials");
    
    // Simuler un délai
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Pour l'instant, toujours réussir en mode mock
    if (options.redirect !== false) {
      window.location.href = options.callbackUrl || "/dashboard";
    }
    
    return { ok: true };
  }
  
  // Pour les providers OAuth (Google, Facebook), rediriger vers la page de connexion
  if (provider === "google" || provider === "facebook") {
    const callbackUrl = options?.callbackUrl || "/dashboard";
    const signInUrl = `/auth/signin?provider=${provider}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
    
    if (options?.redirect !== false) {
      window.location.href = signInUrl;
    }
    
    return { ok: true, url: signInUrl };
  }
  
  // Par défaut, rediriger vers la page de connexion
  const signInUrl = `/auth/signin${options?.callbackUrl ? `?callbackUrl=${encodeURIComponent(options.callbackUrl)}` : ""}`;
  
  if (options?.redirect !== false) {
    window.location.href = signInUrl;
  }
  
  return { ok: true, url: signInUrl };
}

