// app/lib/auth/mock.ts
// ⚠️ DÉPRÉCIÉ : Ce fichier est conservé pour la compatibilité avec les imports existants
// Toutes les fonctions sont maintenant redirigées vers app/lib/auth/server.ts
// TODO: Remplacer progressivement tous les imports de ce fichier

// Réexporter depuis le module serveur
export { getCurrentUser, requireUser, UnauthorizedError } from './server';

/**
 * @deprecated Utilisez getCurrentUser() depuis app/lib/auth/server.ts
 * Cette fonction est conservée pour la compatibilité
 */
export function isAuthenticated(): boolean {
  // Cette fonction n'est plus utilisée, toujours retourner false pour forcer l'utilisation de getCurrentUser()
  return false;
}

/**
 * @deprecated Utilisez requireUser() depuis app/lib/auth/server.ts
 * Cette fonction est conservée pour la compatibilité
 */
export function requireAuth() {
  throw new Error('requireAuth() est déprécié. Utilisez requireUser() depuis app/lib/auth/server.ts');
}

