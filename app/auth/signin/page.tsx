"use client";

import { signIn, useSession, getProviders } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

function SignInContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<any>(null);
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  
  // Utiliser window.location.search au lieu de useSearchParams pour éviter le blocage Suspense
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setSearchParams(params);
    }
  }, []);
  
  // Vérifier les providers disponibles
  useEffect(() => {
    const loadProviders = async () => {
      console.log("=========================================");
      console.log("🔍 [D-LOG CLIENT] CHARGEMENT PROVIDERS");
      console.log("=========================================");
      try {
        const res = await getProviders();
        setProviders(res);
        console.log("[D-LOG CLIENT] ✅ Providers disponibles:", res);
        console.log("[D-LOG CLIENT] Google disponible:", !!res?.google);
        console.log("[D-LOG CLIENT] Facebook disponible:", !!res?.facebook);
        console.log("[D-LOG CLIENT] Credentials disponible:", !!res?.credentials);
        if (!res?.google) {
          console.error("[D-LOG CLIENT] ❌ Google provider non disponible !");
          console.error("[D-LOG CLIENT] ❌ Vérifiez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET");
        }
        console.log("=========================================");
      } catch (err) {
        console.error("=========================================");
        console.error("❌ [D-LOG CLIENT] ERREUR CHARGEMENT PROVIDERS");
        console.error("=========================================");
        console.error("[D-LOG CLIENT] Erreur:", err);
        if (err instanceof Error) {
          console.error("[D-LOG CLIENT] Message:", err.message);
          console.error("[D-LOG CLIENT] Stack:", err.stack);
        }
        console.error("=========================================");
      }
    };
    loadProviders();
  }, []);
  
  // Rediriger si l'utilisateur est déjà connecté
  useEffect(() => {
    if (status === "authenticated" && session) {
      console.log("[SignIn] Utilisateur déjà connecté, redirection vers /dashboard");
      // Utiliser router.push au lieu de window.location pour une meilleure gestion
      router.push("/dashboard");
    }
  }, [status, session, router]);
  
  // Vérifier périodiquement la session après OAuth (pour gérer les callbacks)
  useEffect(() => {
    if (status === "loading") {
      // Vider le cache du Service Worker si disponible (pour éviter les problèmes de cache avec OAuth)
      if (typeof window !== "undefined" && "serviceWorker" in navigator && "caches" in window) {
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => {
            caches.delete(cacheName).catch(() => {
              // Ignorer les erreurs de suppression de cache
            });
          });
        });
      }

      // Vérifier la session toutes les 500ms pendant le chargement
      const checkSession = setInterval(async () => {
        try {
          const sessionRes = await fetch("/api/auth/session", { 
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache",
            },
          });
          const sessionData = await sessionRes.json();
          if (sessionData?.user) {
            console.log("[SignIn] Session détectée après OAuth, redirection");
            router.push("/dashboard");
            clearInterval(checkSession);
          }
        } catch (err) {
          console.error("[SignIn] Erreur vérification session:", err);
        }
      }, 500);
      
      // Nettoyer après 20 secondes (augmenté pour laisser plus de temps)
      setTimeout(() => clearInterval(checkSession), 20000);
      
      return () => clearInterval(checkSession);
    }
  }, [status, router]);
  
  // Normaliser le callbackUrl : extraire le chemin si c'est une URL absolue
  let callbackUrl = "/dashboard";
  try {
    const rawCallbackUrl = searchParams?.get("callbackUrl") || "/dashboard";
    if (rawCallbackUrl) {
      callbackUrl = rawCallbackUrl;
    }
    
    // Si c'est une URL absolue, extraire le chemin
    if (rawCallbackUrl.startsWith("http://") || rawCallbackUrl.startsWith("https://")) {
      const url = new URL(rawCallbackUrl);
      callbackUrl = url.pathname + url.search;
    }
    
    // S'assurer que ce n'est pas la page de connexion elle-même
    if (callbackUrl.startsWith("/auth/signin")) {
      callbackUrl = "/dashboard";
    }
  } catch (e) {
    // Si l'URL n'est pas valide, utiliser le dashboard par défaut
    console.error("[SignIn] Erreur parsing callbackUrl:", e);
    callbackUrl = "/dashboard";
  }
  
  // Vérifier s'il y a une erreur dans l'URL
  useEffect(() => {
    if (!searchParams) return;
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const errorUri = searchParams.get("error_uri");
    
    if (errorParam) {
      console.log("=========================================");
      console.log("❌ [D-LOG CLIENT] ERREUR DÉTECTÉE DANS URL");
      console.log("=========================================");
      console.log("[D-LOG CLIENT] Error:", errorParam);
      console.log("[D-LOG CLIENT] Error Description:", errorDescription || "Non fourni");
      console.log("[D-LOG CLIENT] Error URI:", errorUri || "Non fourni");
      console.log("[D-LOG CLIENT] URL complète:", window.location.href);
      console.log("=========================================");
      
      if (errorParam === "Callback") {
        setError("Erreur lors de la connexion OAuth. Cela peut être dû à : 1) NEXTAUTH_URL non configuré sur Vercel (doit être https://synexa-xi.vercel.app sans slash final), 2) Redéploiement nécessaire après modification des variables d'environnement, 3) URI de callback non autorisé dans Google Console.");
      } else if (errorParam === "Configuration") {
        setError("Erreur de configuration OAuth. Vérifiez que GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont correctement configurés.");
      } else if (errorParam === "AccessDenied") {
        setError("Accès refusé. Vous avez annulé la connexion ou les permissions ont été refusées.");
      } else {
        setError(`Erreur de connexion: ${errorParam}${errorDescription ? ` - ${errorDescription}` : ''}`);
      }
    }
  }, [searchParams]);
  
  // Afficher un loader pendant le chargement initial
  if (!searchParams) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
            Connexion à Synexa
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Connexion à Synexa
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Connectez-vous pour accéder à votre assistant personnel
        </p>
        <div className="flex flex-col gap-3">
          {providers?.google ? (
            <button
              onClick={() => {
                console.log("=========================================");
                console.log("🔍 [D-LOG CLIENT] CLIC SUR GOOGLE OAUTH");
                console.log("=========================================");
                console.log("[D-LOG CLIENT] Callback URL:", "/dashboard");
                console.log("[D-LOG CLIENT] Window location:", window.location.href);
                // NEXTAUTH_URL n'est pas disponible côté client (c'est normal)
                console.log("[D-LOG CLIENT] Appel signIn('google')...");
                console.log("=========================================");
                signIn("google", { callbackUrl: "/dashboard" });
              }}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
            >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuer avec Google
          </button>
          ) : (
            <div className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-zinc-100 px-4 text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google (non configuré)
            </div>
          )}
          {providers?.facebook ? (
            <button
              onClick={() => {
                console.log("[SignIn] Clic sur Facebook OAuth");
                signIn("facebook", { callbackUrl: "/dashboard" });
              }}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
            >
            <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Continuer avec Facebook
          </button>
          ) : (
            <div className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-zinc-100 px-4 text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-600">
              <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook (non configuré)
            </div>
          )}
        </div>
        <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <p className="mb-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Ou connectez-vous avec email et mot de passe
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsLoading(true);
              setError(null);
              const formData = new FormData(e.currentTarget);
              
              try {
                const result = await signIn("credentials", {
                  email: formData.get("email") as string,
                  password: formData.get("password") as string,
                  callbackUrl: "/dashboard",
                  redirect: false,
                });
                
                console.log("[SignIn] Résultat:", result);
                
                if (result?.error) {
                  console.error("[SignIn] Erreur:", result.error);
                  setError("Email ou mot de passe incorrect");
                  setIsLoading(false);
                } else if (result?.ok) {
                  console.log("[SignIn] Connexion réussie, attente de la session...");
                  
                  // Attendre que le cookie de session soit créé
                  let attempts = 0;
                  const maxAttempts = 10;
                  
                  const checkSessionAndRedirect = async () => {
                    try {
                      const sessionResponse = await fetch("/api/auth/session", {
                        cache: "no-store",
                      });
                      const session = await sessionResponse.json();
                      
                      console.log("[SignIn] Vérification session, tentative", attempts + 1, session);
                      
                      if (session?.user?.id || attempts >= maxAttempts) {
                        // Session disponible ou trop de tentatives
                        console.log("[SignIn] Redirection vers /dashboard");
                        // Utiliser replace pour éviter de revenir en arrière
                        window.location.replace("/dashboard");
                      } else {
                        attempts++;
                        setTimeout(checkSessionAndRedirect, 300);
                      }
                    } catch (err) {
                      console.error("[SignIn] Erreur vérification session:", err);
                      // Rediriger quand même après quelques tentatives
                      if (attempts >= 3) {
                        window.location.replace("/dashboard");
                      } else {
                        attempts++;
                        setTimeout(checkSessionAndRedirect, 300);
                      }
                    }
                  };
                  
                  // Démarrer la vérification après un court délai
                  setTimeout(checkSessionAndRedirect, 200);
                } else {
                  console.warn("[SignIn] Résultat inattendu:", result);
                  setError("Une erreur est survenue lors de la connexion");
                  setIsLoading(false);
                }
              } catch (error) {
                console.error("[SignIn] Erreur exception:", error);
                setError("Une erreur est survenue lors de la connexion");
                setIsLoading(false);
              }
            }}
            className="flex flex-col gap-3"
          >
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="h-12 rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-500"
            />
            <input
              name="password"
              type="password"
              placeholder="Mot de passe"
              required
              className="h-12 rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-500"
            />
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="h-12 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              {isLoading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  // Plus besoin de Suspense puisque useSearchParams n'est plus utilisé
  return <SignInContent />;
}

