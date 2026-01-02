/**
 * Fonctions d'administration pour vérifier les droits d'accès
 */

const ADMIN_EMAIL = "fortuna77320@gmail.com";

/**
 * Vérifie si l'utilisateur est administrateur
 * @param email - Email de l'utilisateur
 * @returns true si l'utilisateur est admin
 */
export function isAdmin(email: string | null | undefined): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Vérifie si l'utilisateur actuel est administrateur
 * Nécessite une session active
 */
export async function requireAdmin() {
  const { getCurrentUser } = await import("./session");
  const user = await getCurrentUser();
  
  if (!user?.email) {
    throw new Error("Vous devez être connecté pour accéder à cette ressource");
  }
  
  if (!isAdmin(user.email)) {
    throw new Error("Accès refusé : droits administrateur requis");
  }
  
  return user;
}

