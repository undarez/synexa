// app/lib/utils/user-display.ts
// Utilitaires pour formater le nom d'utilisateur

export interface UserDisplayInfo {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
}

/**
 * Formate le nom d'utilisateur pour l'affichage complet
 * Priorité: firstName + lastName > fullName > email > "Utilisateur"
 * 
 * Exemple: "Bonjour Florian Billard"
 */
export function formatUserDisplayName(user: UserDisplayInfo | null): string {
  if (!user) return "Utilisateur";

  // Cas 1: Prénom + Nom séparés (idéal pour "Bonjour Prénom Nom")
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }

  // Cas 2: Prénom seul
  if (user.firstName) {
    return user.firstName;
  }

  // Cas 3: Nom complet depuis fullName ou name
  if (user.fullName) {
    return user.fullName;
  }
  if (user.name) {
    return user.name;
  }

  // Cas 4: Nom depuis email (fallback)
  if (user.email) {
    const emailName = user.email.split('@')[0];
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  }

  return "Utilisateur";
}

/**
 * Formate uniquement le prénom (pour "Bonjour Prénom")
 * 
 * Exemple: "Bonjour Florian"
 */
export function formatUserFirstName(user: UserDisplayInfo | null): string {
  if (!user) return "Utilisateur";
  
  // Priorité: firstName > premier mot de fullName > premier mot de name > email
  if (user.firstName) {
    return user.firstName;
  }

  if (user.fullName) {
    const firstWord = user.fullName.split(' ')[0];
    if (firstWord) return firstWord;
  }

  if (user.name) {
    const firstWord = user.name.split(' ')[0];
    if (firstWord) return firstWord;
  }

  if (user.email) {
    return user.email.split('@')[0];
  }

  return "Utilisateur";
}
