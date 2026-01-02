"use client";

import { useEffect } from "react";

/**
 * Composant pour gérer silencieusement les erreurs causées par les extensions de navigateur
 * (comme MetaMask, AdBlock, etc.) qui modifient le DOM avant que React ne charge.
 * 
 * Ces erreurs sont normales et n'affectent pas le fonctionnement de l'application.
 */
export function BrowserExtensionHandler() {
  useEffect(() => {
    // Intercepter les erreurs liées aux extensions de navigateur
    const originalError = window.console.error;
    const originalWarn = window.console.warn;

    // Filtrer les erreurs MetaMask, extensions, géolocalisation et Bluetooth
    const extensionErrors = [
      "MetaMask",
      "nkbihfbeogaeaoehlefnkodbefgpgknn", // ID de l'extension MetaMask
      "chrome-extension://",
      "moz-extension://",
      "safari-extension://",
      "Failed to connect to MetaMask",
      "Content script",
      "Erreur géolocalisation",
      "geolocation",
      "getCurrentPosition",
      "Erreur découverte Bluetooth",
      "Bluetooth nécessite HTTPS",
      "Bluetooth n'est pas supporté",
      "Web Bluetooth API",
      "SecurityError",
      "NotFoundError",
    ];

    window.console.error = (...args: any[]) => {
      const errorMessage = args.join(" ");
      const isExtensionError = extensionErrors.some((pattern) =>
        errorMessage.includes(pattern)
      );

      // Ne pas afficher les erreurs d'extensions dans la console
      if (!isExtensionError) {
        originalError.apply(window.console, args);
      }
    };

    window.console.warn = (...args: any[]) => {
      const warningMessage = args.join(" ");
      const isExtensionWarning = extensionErrors.some((pattern) =>
        warningMessage.includes(pattern)
      );

      // Ne pas afficher les avertissements d'extensions dans la console
      if (!isExtensionWarning) {
        originalWarn.apply(window.console, args);
      }
    };

    // Gérer les erreurs non capturées liées aux extensions
    const handleUnhandledError = (event: ErrorEvent) => {
      const errorMessage = event.message || "";
      const isExtensionError = extensionErrors.some((pattern) =>
        errorMessage.includes(pattern)
      );

      if (isExtensionError) {
        // Empêcher l'erreur d'être affichée dans la console
        event.preventDefault();
        return true;
      }
    };

    window.addEventListener("error", handleUnhandledError);

    // Nettoyer lors du démontage
    return () => {
      window.console.error = originalError;
      window.console.warn = originalWarn;
      window.removeEventListener("error", handleUnhandledError);
    };
  }, []);

  // Ce composant ne rend rien
  return null;
}



