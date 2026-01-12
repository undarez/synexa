// app/lib/utils/clean-dom.ts
// Utilitaires pour nettoyer le DOM des attributs ajoutés par les extensions de navigateur

"use client";

/**
 * Nettoie les attributs ajoutés par les extensions de navigateur
 * qui peuvent causer des erreurs d'hydratation
 */
export function cleanBrowserExtensionAttributes() {
  if (typeof window === 'undefined') {
    return;
  }

  // Liste des attributs à supprimer (ajoutés par des extensions)
  const attributesToRemove = [
    'bis_skin_checked',
    'data-new-gr-c-s-check-loaded',
    'data-gr-ext-installed',
    'cz-shortcut-listen',
  ];

  // Nettoyer les attributs sur tous les éléments
  const allElements = document.querySelectorAll('*');
  allElements.forEach((element) => {
    attributesToRemove.forEach((attr) => {
      if (element.hasAttribute(attr)) {
        element.removeAttribute(attr);
      }
    });
  });

  // Observer les changements futurs du DOM pour nettoyer automatiquement
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            attributesToRemove.forEach((attr) => {
              if (element.hasAttribute(attr)) {
                element.removeAttribute(attr);
              }
            });
            // Nettoyer aussi les enfants
            const children = element.querySelectorAll('*');
            children.forEach((child) => {
              attributesToRemove.forEach((attr) => {
                if (child.hasAttribute(attr)) {
                  child.removeAttribute(attr);
                }
              });
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: attributesToRemove,
    });

    // Nettoyer l'observer lors du démontage
    return () => observer.disconnect();
  }
}
