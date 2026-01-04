// Service Worker pour PWA et notifications push
// Version corrigée pour éviter les conflits avec NextAuth OAuth
const CACHE_NAME = "synexa-v3"; // Version incrémentée pour forcer la mise à jour (v3: fix NextAuth session)
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
];

// Routes qui ne doivent JAMAIS être mises en cache
const NEVER_CACHE = [
  "/api/",
  "/auth/",
  "/dashboard",
  "/profile",
  "/calendar",
  "/tasks",
  "/reminders",
  "/routines",
  "/devices",
  "/admin",
];

// Vérifier si une URL ne doit jamais être mise en cache
function shouldNeverCache(url) {
  return NEVER_CACHE.some((route) => url.pathname.startsWith(route));
}

// Vérifier si une réponse contient des cookies de session
function hasSessionCookies(response) {
  const setCookie = response.headers.get("set-cookie");
  return setCookie && (
    setCookie.includes("next-auth") ||
    setCookie.includes("__Secure-next-auth") ||
    setCookie.includes("session-token")
  );
}

self.addEventListener("install", (event) => {
  console.log("[SW] Service Worker installé");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Ne pas utiliser skipWaiting() pour éviter d'interrompre les flux OAuth
  // self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Service Worker activé");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Suppression ancien cache:", name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Supprimer aussi toutes les entrées de cache pour les routes NextAuth
      // pour éviter de servir d'anciennes réponses mises en cache
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.keys().then((keys) => {
          const nextAuthKeys = keys.filter((request) => {
            try {
              const url = new URL(request.url);
              return url.pathname.startsWith("/api/auth/");
            } catch {
              return false;
            }
          });
          return Promise.all(
            nextAuthKeys.map((key) => {
              console.log("[SW] Suppression cache NextAuth:", key.url);
              return cache.delete(key);
            })
          );
        });
      });
    })
  );
  // Retarder clients.claim() pour éviter de prendre le contrôle trop tôt
  event.waitUntil(
    new Promise((resolve) => {
      setTimeout(() => {
        self.clients.claim();
        resolve();
      }, 100);
    })
  );
});

// Cache strategy: Network first, fallback to cache (sauf pour routes critiques)
self.addEventListener("fetch", (event) => {
  const { request } = event;

  try {
    const url = new URL(request.url);

    // IGNORER COMPLÈTEMENT les routes NextAuth - NE PAS les intercepter
    // Selon la documentation officielle NextAuth.js, les routes /api/auth/* ne doivent
    // JAMAIS être interceptées par le Service Worker pour garantir le bon fonctionnement
    // de l'authentification. Ne pas appeler event.respondWith() = la requête passe
    // directement au réseau sans aucune intervention du SW.
    if (url.pathname.startsWith("/api/auth/")) {
      console.log("[SW] Route NextAuth ignorée (pas d'interception):", url.pathname, request.method);
      // Ne pas appeler event.respondWith() = la requête passe directement au réseau
      // C'est la méthode recommandée par la documentation officielle NextAuth.js
      return;
    }

    // Ignorer complètement les requêtes non-GET (sauf pour NextAuth qui est déjà géré ci-dessus)
    if (request.method !== "GET") {
      return;
    }

    // Vérifier AVANT d'intercepter si on doit ignorer cette requête
    if (shouldNeverCache(url)) {
      // Pour les routes critiques, forcer le rechargement depuis le réseau
      // et ne jamais servir depuis le cache
      event.respondWith(
        fetch(request, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
          },
        }).catch(() => {
          // Même en cas d'erreur réseau, ne pas servir depuis le cache
          // pour les routes critiques
          return new Response("Network error", { status: 503 });
        })
      );
      return;
    }

    // Ne pas mettre en cache les requêtes avec des schémas non supportés
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return;
    }

    // Ne mettre en cache que les requêtes de la même origine
    if (url.origin !== self.location.origin) {
      return;
    }

    // Pour les autres routes, utiliser network-first avec cache
    event.respondWith(
      fetch(request, {
        cache: "no-cache", // Forcer la vérification avec le serveur
        headers: {
          "Cache-Control": "no-cache",
        },
      })
        .then((response) => {
          // Ne jamais mettre en cache les réponses avec des cookies de session
          if (hasSessionCookies(response)) {
            console.log("[SW] Réponse avec cookies de session, pas de cache");
            return response;
          }

          // Mettre en cache uniquement les réponses GET réussies avec un type "basic"
          // et qui ne contiennent pas de cookies de session
          if (response.status === 200 && response.type === "basic") {
            try {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache).catch(() => {
                  // Ignorer silencieusement les erreurs de cache
                });
              });
            } catch (err) {
              // Ignorer silencieusement les erreurs de clonage
            }
          }
          return response;
        })
        .catch(() => {
          // Fallback vers le cache uniquement pour les routes non critiques
          return caches.match(request);
        })
    );
  } catch (err) {
    // Si l'URL ne peut pas être parsée, ignorer la requête
    console.error("[SW] Erreur parsing URL:", err);
    return;
  }
});

self.addEventListener("push", (event) => {
  console.log("[SW] Notification push reçue");

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "Rappel", body: event.data.text() };
    }
  }

  const title = data.title || "Rappel Synexa";
  const options = {
    body: data.body || "Vous avez un nouveau rappel",
    icon: data.icon || "/icon-192x192.png",
    badge: data.badge || "/badge-72x72.png",
    data: data.data || {},
    tag: data.tag || "reminder",
    requireInteraction: false,
    actions: data.url
      ? [
          {
            action: "open",
            title: "Ouvrir",
          },
        ]
      : [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification cliquée");

  event.notification.close();

  const data = event.notification.data;
  const url = data?.url || "/reminders";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Si une fenêtre est déjà ouverte, on la focus
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        // Sinon, on ouvre une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});




