# 🔐 Exemple Complet : Authentification Google avec Supabase + Next.js App Router

## 📋 Vue d'ensemble

Cet exemple complet montre comment implémenter une authentification Google robuste avec Supabase dans Next.js 16 App Router, avec :
- ✅ Connexion Google OAuth via Supabase
- ✅ Récupération de session côté serveur ET côté client
- ✅ Affichage du vrai nom Google dans le Dashboard
- ✅ Récupération sécurisée des tokens OAuth Google
- ✅ Préparation pour Google Calendar API
- ✅ Gestion correcte des redirects sans erreur `NEXT_REDIRECT`
- ✅ Loader côté client pendant le chargement

## 🔧 Configuration Supabase

### 1. Variables d'environnement (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
```

### 2. Configuration Google OAuth dans Supabase Dashboard

1. Allez dans **Authentication > Providers > Google**
2. Activez Google
3. Ajoutez vos **Google Client ID** et **Google Client Secret**
4. Configurez l'**Authorized Redirect URI** : `https://votre-projet.supabase.co/auth/v1/callback`

### 3. Configuration Google Cloud Console

1. Créez un projet Google Cloud
2. Activez l'API Google Calendar
3. Créez des identifiants OAuth 2.0
4. Ajoutez l'URI de redirection : `https://votre-projet.supabase.co/auth/v1/callback`
5. Ajoutez les scopes nécessaires :
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/calendar.readonly`

## 📁 Structure des fichiers

```
app/
├── lib/
│   ├── supabase/
│   │   ├── client-browser.ts          # Client Supabase côté navigateur
│   │   └── server-client.ts           # Client Supabase côté serveur (NEW)
│   ├── auth/
│   │   ├── server.ts                  # Fonctions auth côté serveur
│   │   ├── client.ts                  # Hook auth côté client avec loader
│   │   └── google-calendar.ts         # Utilitaires Google Calendar (NEW)
│   └── utils/
│       └── user-display.ts            # Utilitaires pour afficher le nom (NEW)
├── components/
│   ├── auth/
│   │   ├── GoogleSignInButton.tsx     # Bouton connexion Google
│   │   └── AuthLoader.tsx             # Loader pendant auth (NEW)
│   └── dashboard/
│       └── UserGreeting.tsx           # Affichage "Bonjour {prenom} {nom}" (NEW)
├── dashboard/
│   └── page.tsx                       # Dashboard avec gestion redirects
└── middleware.ts                      # Middleware Supabase SSR
```

## 🚀 Code Complet

### 1. Client Supabase côté serveur (`app/lib/supabase/server-client.ts`)

```typescript
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
```

### 2. Hook auth côté client avec loader (`app/lib/auth/client.ts`)

```typescript
// app/lib/auth/client.ts
// Hook d'authentification côté client avec gestion du loader

"use client";

import { useState, useEffect } from "react";
import { getBrowserClient } from "@/app/lib/supabase/client-browser";
import type { User, Session } from "@supabase/supabase-js";

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
 * Hook pour gérer l'authentification Supabase côté client
 * Gère automatiquement la synchronisation localStorage -> cookies HTTP
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getBrowserClient();
    let mounted = true;

    // Synchroniser la session de localStorage vers les cookies HTTP
    const syncSessionToCookies = async (session: Session | null) => {
      if (!session || typeof window === 'undefined') return;

      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
        if (!supabaseUrl) return;

        const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
        if (!projectId) return;

        const cookieName = `sb-${projectId}-auth-token`;
        const cookieValue = JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          expires_at: session.expires_at,
          token_type: session.token_type,
          user: session.user,
        });

        const expiresAt = session.expires_at 
          ? new Date(session.expires_at * 1000) 
          : new Date(Date.now() + 3600 * 1000);
        const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

        const isSecure = process.env.NODE_ENV === 'production';
        document.cookie = `${cookieName}=${encodeURIComponent(cookieValue)}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; secure' : ''}`;

        if (process.env.NODE_ENV === 'development') {
          console.log("[useAuth] ✅ Session synchronisée vers cookies HTTP");
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn("[useAuth] Erreur synchronisation:", error);
        }
      }
    };

    // Récupérer la session initiale
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error("[useAuth] Erreur session initiale:", error);
        }
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Synchroniser immédiatement
      if (session) {
        syncSessionToCookies(session);
      }
    });

    // Écouter les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        if (process.env.NODE_ENV === 'development') {
          console.log("[useAuth] Événement:", event);
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);

        // Synchroniser lors de la connexion ou du rafraîchissement du token
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await syncSessionToCookies(newSession);
        } else if (event === 'SIGNED_OUT') {
          // Supprimer le cookie
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
          if (supabaseUrl) {
            const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
            if (projectId) {
              document.cookie = `sb-${projectId}-auth-token=; path=/; max-age=0; SameSite=Lax`;
            }
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const supabase = getBrowserClient();

      // Stocker la page actuelle pour rediriger après OAuth
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem('oauth_redirect_path', currentPath);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${currentPath}`,
          scopes: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.readonly",
          ].join(" "),
          queryParams: {
            access_type: "offline", // OBLIGATOIRE pour obtenir un refresh_token
            prompt: "consent", // OBLIGATOIRE pour forcer le consentement
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("[useAuth] Erreur connexion Google:", error);
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const supabase = getBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = "/";
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("[useAuth] Erreur déconnexion:", error);
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
```

### 3. Fonctions auth côté serveur améliorées (`app/lib/auth/server.ts`)

```typescript
// app/lib/auth/server.ts
// Fonctions d'authentification côté serveur

import { createServerComponentClient } from "@/app/lib/supabase/server-client";
import { supabase } from "@/app/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export class UnauthorizedError extends Error {
  constructor(message = 'Non authentifié') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

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
 * Récupère l'utilisateur actuel côté serveur depuis Supabase Auth
 * Extrait le prénom et nom depuis user_metadata Google
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
    }

    // Priorité: table User > user_metadata OAuth > email
    const displayFirstName = userProfile?.firstName || firstName || null;
    const displayLastName = userProfile?.lastName || lastName || null;
    const displayName = userProfile?.name || fullName || (displayFirstName && displayLastName ? `${displayFirstName} ${displayLastName}` : null) || user.email?.split('@')[0] || "Utilisateur";

    if (process.env.NODE_ENV === 'development') {
      console.log("[getCurrentUser] ✅ Utilisateur:", user.id, displayName);
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
 */
export async function requireUser(): Promise<ServerUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError('Vous devez être authentifié pour accéder à cette ressource');
  }
  return user;
}

/**
 * Récupère l'utilisateur Supabase complet avec toutes les métadonnées
 */
export async function getSupabaseUser(): Promise<User | null> {
  try {
    const supabase = await createServerComponentClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    return error ? null : user;
  } catch {
    return null;
  }
}
```

### 4. Utilitaires Google Calendar (`app/lib/auth/google-calendar.ts`)

```typescript
// app/lib/auth/google-calendar.ts
// Utilitaires pour interagir avec Google Calendar API

import { createServerComponentClient } from "@/app/lib/supabase/server-client";

/**
 * Récupère le provider_token Google depuis la session Supabase (côté serveur)
 * SÉCURISÉ: Ne retourne le token que côté serveur, jamais exposé au client
 */
export async function getGoogleCalendarToken(): Promise<string | null> {
  try {
    const supabase = await createServerComponentClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[getGoogleCalendarToken] Pas de session:", error?.message);
      }
      return null;
    }

    // Récupérer le provider_token (token Google OAuth)
    const providerToken = session.provider_token;

    if (!providerToken) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("[getGoogleCalendarToken] ⚠️ Aucun provider_token dans la session");
        console.warn("[getGoogleCalendarToken] Assurez-vous que les scopes Google Calendar sont demandés lors de la connexion");
      }
      return null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log("[getGoogleCalendarToken] ✅ Token Google récupéré (longueur:", providerToken.length, ")");
    }

    return providerToken;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("[getGoogleCalendarToken] Erreur:", error);
    }
    return null;
  }
}

/**
 * Récupère le refresh_token Google depuis la session Supabase (côté serveur)
 */
export async function getGoogleRefreshToken(): Promise<string | null> {
  try {
    const supabase = await createServerComponentClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.provider_refresh_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Vérifie si l'utilisateur a accès à Google Calendar
 */
export async function hasGoogleCalendarAccess(): Promise<boolean> {
  const accessToken = await getGoogleCalendarToken();
  if (!accessToken) return false;

  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Récupère les événements Google Calendar (exemple d'utilisation)
 * ⚠️ À appeler uniquement depuis une Server Action ou API Route (jamais côté client)
 */
export async function getGoogleCalendarEvents(
  calendarId: string = "primary",
  maxResults: number = 10,
  timeMin?: Date,
  timeMax?: Date
) {
  const accessToken = await getGoogleCalendarToken();
  if (!accessToken) {
    throw new Error("Token Google Calendar non disponible. Veuillez vous reconnecter.");
  }

  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(maxResults),
  });

  if (timeMin) {
    params.append("timeMin", timeMin.toISOString());
  }
  if (timeMax) {
    params.append("timeMax", timeMax.toISOString());
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Erreur Google Calendar: ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.items || [];
}
```

### 5. Utilitaires pour afficher le nom (`app/lib/utils/user-display.ts`)

```typescript
// app/lib/utils/user-display.ts
// Utilitaires pour formater le nom d'utilisateur

export interface UserDisplayInfo {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email?: string | null;
}

/**
 * Formate le nom d'utilisateur pour l'affichage
 * Priorité: firstName + lastName > fullName > email > "Utilisateur"
 */
export function formatUserDisplayName(user: UserDisplayInfo | null): string {
  if (!user) return "Utilisateur";

  // Cas 1: Prénom + Nom séparés (idéal pour "Bonjour Prénom Nom")
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }

  // Cas 2: Prénom seul
  if (user.firstName) {
    return user.firstName;
  }

  // Cas 3: Nom complet
  if (user.fullName) {
    return user.fullName;
  }

  // Cas 4: Nom depuis email (fallback)
  if (user.email) {
    const emailName = user.email.split('@')[0];
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  }

  return "Utilisateur";
}

/**
 * Formate le prénom seul (pour "Bonjour Prénom")
 */
export function formatUserFirstName(user: UserDisplayInfo | null): string {
  if (!user) return "Utilisateur";
  return user.firstName || user.fullName?.split(' ')[0] || user.email?.split('@')[0] || "Utilisateur";
}
```

### 6. Composant Loader Auth (`app/components/auth/AuthLoader.tsx`)

```typescript
// app/components/auth/AuthLoader.tsx
// Loader à afficher pendant le chargement de la session

"use client";

import { useAuth } from "@/app/lib/auth/client";

export function AuthLoader({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement de la session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

### 7. Composant UserGreeting (`app/components/dashboard/UserGreeting.tsx`)

```typescript
// app/components/dashboard/UserGreeting.tsx
// Composant pour afficher "Bonjour {prénom} {nom}"

import { formatUserDisplayName, formatUserFirstName } from "@/app/lib/utils/user-display";
import type { ServerUser } from "@/app/lib/auth/server";

interface UserGreetingProps {
  user: ServerUser;
  variant?: "full" | "first";
}

export function UserGreeting({ user, variant = "full" }: UserGreetingProps) {
  const displayName = variant === "first" 
    ? formatUserFirstName(user)
    : formatUserDisplayName(user);

  return (
    <h1 className="text-4xl sm:text-5xl font-bold mb-2">
      Bonjour {displayName}{" "}
      <span className="inline-block animate-wave">👋</span>
    </h1>
  );
}
```

### 8. Dashboard avec gestion correcte des redirects (`app/dashboard/page.tsx`)

```typescript
// app/dashboard/page.tsx
// Dashboard avec gestion correcte des redirects

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth/server";
import { UserGreeting } from "@/app/components/dashboard/UserGreeting";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Récupérer l'utilisateur côté serveur
  // IMPORTANT: redirect() doit être appelé EN DEHORS de tout try/catch
  const user = await getCurrentUser();

  // Si pas d'utilisateur, rediriger vers signin
  // Cette redirection ne doit PAS être dans un try/catch car redirect() lance NEXT_REDIRECT
  if (!user) {
    redirect("/auth/signin");
  }

  // Reste du code dans un try/catch pour gérer les erreurs métier
  try {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-card">
              <div className="mb-3">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {formattedDate}
                </span>
              </div>
              {/* Affichage du nom complet : "Bonjour Prénom Nom" */}
              <UserGreeting user={user} variant="full" />
              <p className="text-lg text-muted-foreground font-medium">
                Voici votre aperçu personnalisé du jour
              </p>
            </div>
          </div>

          {/* Contenu du dashboard */}
          <div className="space-y-6">
            {/* Vos composants dashboard ici */}
          </div>
        </main>
        <Footer />
      </div>
    );
  } catch (error) {
    // Gérer les erreurs métier (pas de redirect ici, juste log)
    console.error("[DASHBOARD] Erreur:", error);
    
    // Retourner un état d'erreur à l'utilisateur
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Erreur</h1>
          <p className="text-muted-foreground">
            Une erreur est survenue lors du chargement du dashboard.
          </p>
        </div>
      </div>
    );
  }
}
```

### 9. Bouton Connexion Google (`app/components/auth/GoogleSignInButton.tsx`)

```typescript
// app/components/auth/GoogleSignInButton.tsx
// Bouton pour se connecter avec Google

"use client";

import { useState } from "react";
import { useAuth } from "@/app/lib/auth/client";
import { Button } from "@/app/components/ui/button";

export function GoogleSignInButton() {
  const { signInWithGoogle, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error("Erreur connexion Google:", error);
      alert("Erreur lors de la connexion Google");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSignIn}
      disabled={loading || isLoading}
      className="w-full"
      variant="outline"
    >
      {isLoading ? (
        <>
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Connexion...
        </>
      ) : (
        <>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuer avec Google
        </>
      )}
    </Button>
  );
}
```

### 10. Page Sign In avec gestion OAuth callback (`app/auth/signin/page.tsx`)

```typescript
// app/auth/signin/page.tsx
// Page de connexion avec gestion du callback OAuth

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/lib/auth/client";
import { GoogleSignInButton } from "@/app/components/auth/GoogleSignInButton";
import { AuthLoader } from "@/app/components/auth/AuthLoader";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, session } = useAuth();

  useEffect(() => {
    // Si l'utilisateur est déjà connecté, rediriger vers le dashboard
    if (!loading && user && session) {
      // Récupérer le chemin de redirection depuis localStorage (stocké avant OAuth)
      const redirectPath = localStorage.getItem('oauth_redirect_path') || '/dashboard';
      localStorage.removeItem('oauth_redirect_path');
      
      // Nettoyer l'URL des paramètres OAuth
      window.history.replaceState({}, '', redirectPath);
      
      router.push(redirectPath);
    }
  }, [user, session, loading, router]);

  // Afficher un loader pendant le chargement initial
  if (loading) {
    return <AuthLoader><div /></AuthLoader>;
  }

  // Si déjà connecté, ne rien afficher (la redirection va se faire)
  if (user && session) {
    return null;
  }

  // Afficher la page de connexion
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-card p-8 shadow-card">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Connexion</h1>
          <p className="mt-2 text-muted-foreground">
            Connectez-vous avec votre compte Google pour continuer
          </p>
        </div>

        <GoogleSignInButton />

        {searchParams.get('error') && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Erreur d'authentification. Veuillez réessayer.
          </div>
        )}
      </div>
    </div>
  );
}
```

## 🔒 Sécurité des Tokens

### Bonnes Pratiques

1. **Ne JAMAIS exposer `provider_token` côté client** :
   - Le token doit être récupéré uniquement dans les Server Actions ou API Routes
   - Utiliser `getGoogleCalendarToken()` côté serveur uniquement

2. **Utiliser les Server Actions pour les appels Google Calendar** :

```typescript
// app/actions/calendar.ts
"use server";

import { getGoogleCalendarEvents } from "@/app/lib/auth/google-calendar";
import { requireUser } from "@/app/lib/auth/server";

export async function fetchCalendarEvents() {
  // Vérifier l'authentification
  await requireUser();

  // Récupérer les événements (token récupéré côté serveur)
  try {
    const events = await getGoogleCalendarEvents("primary", 10);
    return { success: true, events };
  } catch (error) {
    console.error("[fetchCalendarEvents] Erreur:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
  }
}
```

3. **API Route pour les appels Google Calendar** :

```typescript
// app/api/calendar/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/server";
import { getGoogleCalendarEvents } from "@/app/lib/auth/google-calendar";

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    await requireUser();

    // Récupérer les événements (token récupéré côté serveur)
    const events = await getGoogleCalendarEvents("primary", 10);
    return NextResponse.json({ events });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
```

## 🎯 Scopes Google Calendar

### Scopes recommandés

- `https://www.googleapis.com/auth/calendar.readonly` : Lecture seule des calendriers (recommandé pour débuter)
- `https://www.googleapis.com/auth/calendar` : Lecture et écriture complète (utiliser avec précaution)

### Ajout des scopes dans `signInWithGoogle`

Les scopes sont déjà configurés dans le hook `useAuth()` (voir section 2).

## 📝 Checklist de déploiement

- [ ] Variables d'environnement configurées (`.env.local`)
- [ ] Google OAuth configuré dans Supabase Dashboard
- [ ] Google Cloud Console configuré avec les scopes Calendar
- [ ] URI de redirection configurée : `https://votre-projet.supabase.co/auth/v1/callback`
- [ ] `@supabase/ssr` installé : `npm install @supabase/ssr`
- [ ] Middleware configuré (`app/middleware.ts`)
- [ ] `SessionSync` ajouté dans le layout (`app/layout.tsx`)
- [ ] Test de connexion Google
- [ ] Vérification de l'affichage du nom dans le Dashboard : "Bonjour {Prénom} {Nom}"
- [ ] Vérification des tokens OAuth dans la console (provider_token, provider_refresh_token)
- [ ] Test des appels Google Calendar API (côté serveur uniquement)
- [ ] Vérification que les redirects fonctionnent sans erreur `NEXT_REDIRECT`

## ✅ Points importants

### 1. Scopes Google Calendar
- **Recommandé pour débuter** : `https://www.googleapis.com/auth/calendar.readonly` (lecture seule)
- **Pour l'écriture** : `https://www.googleapis.com/auth/calendar` (lecture + écriture)
- Les scopes sont configurés dans `app/lib/auth/use-auth.ts` dans `signInWithGoogle()`

### 2. Sécurité des tokens
- **NE JAMAIS** exposer `provider_token` côté client
- Utiliser uniquement `getGoogleCalendarToken()` côté serveur (Server Actions, API Routes)
- Les tokens sont automatiquement sécurisés dans les cookies HTTP par Supabase

### 3. Gestion des redirects
- **IMPORTANT** : `redirect()` doit être appelé EN DEHORS de tout `try/catch`
- Dans le dashboard, la vérification de l'utilisateur et le redirect sont séparés du try/catch

### 4. Affichage du nom
- Priorité : `firstName + lastName` > `fullName` > `email` > "Utilisateur"
- Le nom est extrait depuis `user_metadata` Google OAuth (`given_name`, `family_name`, `full_name`)
- Si disponible, récupéré depuis la table `User` en priorité
- Format d'affichage : "Bonjour Prénom Nom" (via `UserGreeting` avec `variant="full"`)

## 🐛 Dépannage

### Problème : `NEXT_REDIRECT` error
**Solution** : Assurez-vous que `redirect()` est appelé EN DEHORS de tout `try/catch`.

### Problème : Session non trouvée côté serveur
**Solution** : Vérifiez que `SessionSync` est monté dans le layout et que les cookies sont synchronisés.

### Problème : `provider_token` null
**Solution** : 
1. Vérifiez que `access_type=offline` et `prompt=consent` sont dans `queryParams`
2. Vérifiez que les scopes sont correctement configurés
3. Déconnectez-vous et reconnectez-vous pour forcer un nouveau consentement

### Problème : Nom "Utilisateur" affiché
**Solution** : Vérifiez que `user_metadata` contient `full_name`, `given_name`, ou `family_name` après la connexion OAuth.

## 📚 Documentation

- [Supabase Auth avec Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [Next.js App Router](https://nextjs.org/docs/app)

---

**✅ Code prêt à l'emploi et compatible avec Supabase + Next.js App Router !**
