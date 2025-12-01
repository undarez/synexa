/**
 * Module de chiffrement pour protéger les données sensibles des utilisateurs
 * Utilise AES-256-GCM pour un chiffrement sécurisé
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const ITERATIONS = 100000; // Pour PBKDF2

/**
 * Génère une clé de chiffrement à partir d'une clé maître
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, "sha512");
}

/**
 * Récupère la clé maître depuis les variables d'environnement
 */
function getMasterKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY n'est pas définie dans les variables d'environnement"
    );
  }
  if (key.length < 32) {
    throw new Error(
      "ENCRYPTION_KEY doit contenir au moins 32 caractères pour la sécurité"
    );
  }
  return key;
}

/**
 * Chiffre une valeur string
 * Format: salt:iv:tag:encryptedData (tout en base64)
 */
export function encrypt(value: string | null | undefined): string | null {
  if (!value || value.trim() === "") {
    return null;
  }

  try {
    const masterKey = getMasterKey();
    
    // Générer un salt unique pour chaque chiffrement
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Dériver la clé à partir du master key et du salt
    const key = deriveKey(masterKey, salt);
    
    // Générer un IV (Initialization Vector) unique
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Créer le cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Chiffrer les données
    let encrypted = cipher.update(value, "utf8", "base64");
    encrypted += cipher.final("base64");
    
    // Récupérer le tag d'authentification
    const tag = cipher.getAuthTag();
    
    // Combiner salt:iv:tag:encrypted en base64
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, "base64"),
    ]);
    
    return combined.toString("base64");
  } catch (error) {
    console.error("[encrypt] Erreur:", error);
    throw new Error("Erreur lors du chiffrement des données");
  }
}

/**
 * Déchiffre une valeur string chiffrée
 */
export function decrypt(encryptedValue: string | null | undefined): string | null {
  if (!encryptedValue || encryptedValue.trim() === "") {
    return null;
  }

  try {
    const masterKey = getMasterKey();
    
    // Décoder depuis base64
    const combined = Buffer.from(encryptedValue, "base64");
    
    // Extraire les composants
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Dériver la clé à partir du master key et du salt
    const key = deriveKey(masterKey, salt);
    
    // Créer le decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Déchiffrer les données
    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("[decrypt] Erreur:", error);
    // Si le déchiffrement échoue, la valeur n'est peut-être pas chiffrée
    // Retourner null pour permettre la migration progressive
    return null;
  }
}

/**
 * Chiffre un nombre (coordonnées GPS, etc.)
 */
export function encryptNumber(value: number | null | undefined): string | null {
  if (value === null || value === undefined || isNaN(value)) {
    return null;
  }
  return encrypt(value.toString());
}

/**
 * Déchiffre un nombre
 */
export function decryptNumber(encryptedValue: string | null | undefined): number | null {
  const decrypted = decrypt(encryptedValue);
  if (!decrypted) {
    return null;
  }
  const num = parseFloat(decrypted);
  return isNaN(num) ? null : num;
}

/**
 * Chiffre un objet JSON
 */
export function encryptObject<T>(obj: T | null | undefined): string | null {
  if (!obj) {
    return null;
  }
  return encrypt(JSON.stringify(obj));
}

/**
 * Déchiffre un objet JSON
 */
export function decryptObject<T>(encryptedValue: string | null | undefined): T | null {
  const decrypted = decrypt(encryptedValue);
  if (!decrypted) {
    return null;
  }
  try {
    return JSON.parse(decrypted) as T;
  } catch {
    return null;
  }
}

/**
 * Vérifie si une valeur est chiffrée (format base64 valide avec la bonne longueur)
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || value.trim() === "") {
    return false;
  }
  try {
    const combined = Buffer.from(value, "base64");
    // Vérifier la longueur minimale (salt + iv + tag = 96 bytes minimum)
    return combined.length >= SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Génère une clé de chiffrement aléatoire (pour initialisation)
 * À utiliser une seule fois pour générer ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("base64");
}



