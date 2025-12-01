/**
 * Génère un code utilisateur unique au format : 4 chiffres + 2 lettres
 * Exemple : 1234AB
 */
export function generateUserCode(): string {
  // Générer 4 chiffres aléatoires
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Générer 2 lettres majuscules aléatoires
  const letters = String.fromCharCode(
    65 + Math.floor(Math.random() * 26), // A-Z
    65 + Math.floor(Math.random() * 26)  // A-Z
  );
  
  return `${digits}${letters}`;
}

/**
 * Valide le format d'un code utilisateur
 */
export function isValidUserCode(code: string): boolean {
  return /^\d{4}[A-Z]{2}$/.test(code);
}






