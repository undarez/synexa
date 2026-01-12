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
    // Nettoyer les attributs ajoutés par les extensions de navigateur qui causent des erreurs d'hydratation
    const attributesToRemove = [
      'bis_skin_checked',
      'data-new-gr-c-s-check-loaded',
      'data-gr-ext-installed',
      'cz-shortcut-listen',
    ];

    const cleanAttributes = () => {
      const allElements = document.querySelectorAll('*');
      allElements.forEach((element) => {
        attributesToRemove.forEach((attr) => {
          if (element.hasAttribute(attr)) {
            element.removeAttribute(attr);
          }
        });
      });
    };

    // Nettoyer immédiatement (avant l'hydratation si possible)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cleanAttributes);
    } else {
      cleanAttributes();
    }
    
    // Nettoyer aussi après un court délai pour capturer les éléments ajoutés par les extensions
    setTimeout(cleanAttributes, 0);

    // Observer les changements futurs du DOM pour nettoyer automatiquement
    const observer = new MutationObserver(() => {
      cleanAttributes();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: attributesToRemove,
    });

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
      "bis_skin_checked", // Attribut ajouté par des extensions de thème
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
      observer.disconnect();
      window.console.error = originalError;
      window.console.warn = originalWarn;
      window.removeEventListener("error", handleUnhandledError);
    };
  }, []);

  // Ce composant ne rend rien
  return null;
}



