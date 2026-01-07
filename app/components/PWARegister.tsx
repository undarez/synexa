"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    // ⚠️ TEMPORAIRE : Désactiver le Service Worker pour tester la connexion Google
    // Le SW peut bloquer les callbacks OAuth même avec les corrections
    // TODO: Réactiver une fois la connexion Google fonctionnelle
    // 
    // Pour désactiver : décommentez la ligne suivante
    // return; // Service Worker désactivé temporairement
    
    // Enregistrer le service worker pour PWA
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      // Désinscrire tous les Service Workers existants d'abord
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
          console.log("[PWA] Ancien Service Worker désinscrit");
        });
      });

      // Attendre un peu avant de réenregistrer
      setTimeout(() => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[PWA] Service Worker enregistré:", registration);
          })
          .catch((error) => {
            console.error("[PWA] Erreur enregistrement Service Worker:", error);
          });
      }, 1000);
    }
  }, []);

  return null;
}







