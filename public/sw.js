// Service Worker pour PWA et notifications push
const CACHE_NAME = "synexa-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  console.log("[SW] Service Worker installé");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Service Worker activé");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

// Cache strategy: Network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;
  
  // Ignorer complètement les requêtes non-GET
  if (request.method !== "GET") {
    return;
  }

  try {
    const url = new URL(request.url);

    // Ne pas mettre en cache les requêtes API
    if (url.pathname.startsWith("/api/")) {
      return;
    }

    // Ne pas mettre en cache les requêtes avec des schémas non supportés
    // (chrome-extension:, data:, blob:, etc.)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return;
    }

    // Ne mettre en cache que les requêtes de la même origine
    if (url.origin !== self.location.origin) {
      return;
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          // Mettre en cache uniquement les réponses GET réussies avec un type "basic"
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
          // Fallback vers le cache si le réseau échoue
          return caches.match(request);
        })
    );
  } catch (err) {
    // Si l'URL ne peut pas être parsée, ignorer la requête
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


