// app/lib/utils/storage.ts
// Wrapper sécurisé pour le stockage côté client
// RÈGLE D'OR: localStorage = UI ONLY (thème, préférences d'affichage non sensibles)

/**
 * Clés autorisées pour localStorage
 * WHITELIST STRICTE: Seules ces clés peuvent être stockées
 */
const ALLOWED_LOCALSTORAGE_KEYS = [
  // Thème (géré par next-themes, mais documenté ici)
  'theme',
  'next-themes',
  
  // Préférences UI non sensibles (à ajouter si nécessaire)
  // 'ui-sidebar-collapsed',
  // 'ui-view-mode',
] as const;

type AllowedKey = typeof ALLOWED_LOCALSTORAGE_KEYS[number];

/**
 * Clés autorisées pour sessionStorage
 * Utilisé pour des données temporaires de navigation (moins persistant que localStorage)
 */
const ALLOWED_SESSIONSTORAGE_KEYS = [
  // Redirection OAuth (temporaire, supprimé après utilisation)
  'oauth_redirect_path',
] as const;

type AllowedSessionKey = typeof ALLOWED_SESSIONSTORAGE_KEYS[number];

/**
 * Wrapper sécurisé pour localStorage
 * Vérifie que la clé est dans la whitelist avant de stocker
 */
export const secureStorage = {
  /**
   * Stocke une valeur dans localStorage (UI ONLY)
   * @throws Error si la clé n'est pas dans la whitelist
   */
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    
    // Vérifier que la clé est autorisée
    if (!ALLOWED_LOCALSTORAGE_KEYS.includes(key as AllowedKey)) {
      console.error(`[secureStorage] Tentative de stockage d'une clé non autorisée: ${key}`);
      console.error(`[secureStorage] Clés autorisées: ${ALLOWED_LOCALSTORAGE_KEYS.join(', ')}`);
      throw new Error(`Clé localStorage non autorisée: ${key}. Utilisez uniquement des clés de la whitelist.`);
    }
    
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`[secureStorage] Erreur lors du stockage de ${key}:`, error);
      throw error;
    }
  },

  /**
   * Récupère une valeur depuis localStorage
   * @returns La valeur ou null si absente
   */
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    
    // Vérifier que la clé est autorisée
    if (!ALLOWED_LOCALSTORAGE_KEYS.includes(key as AllowedKey)) {
      console.warn(`[secureStorage] Tentative de lecture d'une clé non autorisée: ${key}`);
      return null;
    }
    
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`[secureStorage] Erreur lors de la lecture de ${key}:`, error);
      return null;
    }
  },

  /**
   * Supprime une valeur de localStorage
   */
  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    
    // Vérifier que la clé est autorisée
    if (!ALLOWED_LOCALSTORAGE_KEYS.includes(key as AllowedKey)) {
      console.warn(`[secureStorage] Tentative de suppression d'une clé non autorisée: ${key}`);
      return;
    }
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`[secureStorage] Erreur lors de la suppression de ${key}:`, error);
    }
  },
};

/**
 * Wrapper sécurisé pour sessionStorage
 * Utilisé pour des données temporaires de navigation
 */
export const secureSessionStorage = {
  /**
   * Stocke une valeur dans sessionStorage (temporaire, navigation uniquement)
   * @throws Error si la clé n'est pas dans la whitelist
   */
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    
    // Vérifier que la clé est autorisée
    if (!ALLOWED_SESSIONSTORAGE_KEYS.includes(key as AllowedSessionKey)) {
      console.error(`[secureSessionStorage] Tentative de stockage d'une clé non autorisée: ${key}`);
      console.error(`[secureSessionStorage] Clés autorisées: ${ALLOWED_SESSIONSTORAGE_KEYS.join(', ')}`);
      throw new Error(`Clé sessionStorage non autorisée: ${key}. Utilisez uniquement des clés de la whitelist.`);
    }
    
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.error(`[secureSessionStorage] Erreur lors du stockage de ${key}:`, error);
      throw error;
    }
  },

  /**
   * Récupère une valeur depuis sessionStorage
   * @returns La valeur ou null si absente
   */
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    
    // Vérifier que la clé est autorisée
    if (!ALLOWED_SESSIONSTORAGE_KEYS.includes(key as AllowedSessionKey)) {
      console.warn(`[secureSessionStorage] Tentative de lecture d'une clé non autorisée: ${key}`);
      return null;
    }
    
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.error(`[secureSessionStorage] Erreur lors de la lecture de ${key}:`, error);
      return null;
    }
  },

  /**
   * Supprime une valeur de sessionStorage
   */
  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    
    // Vérifier que la clé est autorisée
    if (!ALLOWED_SESSIONSTORAGE_KEYS.includes(key as AllowedSessionKey)) {
      console.warn(`[secureSessionStorage] Tentative de suppression d'une clé non autorisée: ${key}`);
      return;
    }
    
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error(`[secureSessionStorage] Erreur lors de la suppression de ${key}:`, error);
    }
  },
};

/**
 * Nettoie toutes les données sensibles du localStorage
 * À appeler lors de la déconnexion ou pour un audit de sécurité
 */
export function clearSensitiveData(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Lister toutes les clés du localStorage
    const allKeys = Object.keys(localStorage);
    
    // Supprimer toutes les clés qui ne sont pas dans la whitelist
    allKeys.forEach((key) => {
      if (!ALLOWED_LOCALSTORAGE_KEYS.includes(key as AllowedKey)) {
        console.warn(`[clearSensitiveData] Suppression de clé non autorisée: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    // Nettoyer aussi sessionStorage
    const allSessionKeys = Object.keys(sessionStorage);
    allSessionKeys.forEach((key) => {
      if (!ALLOWED_SESSIONSTORAGE_KEYS.includes(key as AllowedSessionKey)) {
        console.warn(`[clearSensitiveData] Suppression de clé sessionStorage non autorisée: ${key}`);
        sessionStorage.removeItem(key);
      }
    });
    
    // Note: Supabase gère son propre localStorage (sb-*-auth-token)
    // On ne le supprime pas ici car Supabase le gère via auth.signOut()
  } catch (error) {
    console.error('[clearSensitiveData] Erreur lors du nettoyage:', error);
  }
}
