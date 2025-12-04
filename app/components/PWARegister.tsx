"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    // Enregistrer le service worker pour PWA
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker enregistré:", registration);
        })
        .catch((error) => {
          console.error("[PWA] Erreur enregistrement Service Worker:", error);
        });
    }
  }, []);

  return null;
}







