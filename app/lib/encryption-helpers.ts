/**
 * Helpers pour chiffrer/déchiffrer automatiquement les données utilisateur
 */

import { encrypt, decrypt, encryptNumber, decryptNumber } from "./encryption";

/**
 * Champs sensibles à chiffrer dans le modèle User
 */
export const ENCRYPTED_USER_FIELDS = [
  "homeAddress",
  "workAddress",
  "workLat",
  "workLng",
  "wifiSSID",
  "bluetoothDeviceName",
  "firstName",
  "lastName",
] as const;

export type EncryptedUserField = (typeof ENCRYPTED_USER_FIELDS)[number];

/**
 * Chiffre les données sensibles d'un objet utilisateur avant sauvegarde
 */
export function encryptUserData<T extends Record<string, any>>(
  data: T
): Partial<T> {
  const encrypted: Partial<T> = { ...data };

  for (const field of ENCRYPTED_USER_FIELDS) {
    if (field in data && data[field] !== null && data[field] !== undefined) {
      if (field === "workLat" || field === "workLng") {
        // Chiffrer les nombres (coordonnées GPS)
        (encrypted as any)[field] = encryptNumber(data[field]);
      } else {
        // Chiffrer les strings
        (encrypted as any)[field] = encrypt(data[field]);
      }
    }
  }

  return encrypted;
}

/**
 * Déchiffre les données sensibles d'un objet utilisateur après récupération
 */
export function decryptUserData<T extends Record<string, any>>(
  data: T
): T {
  const decrypted: T = { ...data };

  for (const field of ENCRYPTED_USER_FIELDS) {
    if (field in data && data[field] !== null && data[field] !== undefined) {
      if (field === "workLat" || field === "workLng") {
        // Déchiffrer les nombres (coordonnées GPS)
        (decrypted as any)[field] = decryptNumber(data[field]);
      } else {
        // Déchiffrer les strings
        (decrypted as any)[field] = decrypt(data[field]);
      }
    }
  }

  return decrypted;
}

/**
 * Chiffre un champ spécifique
 */
export function encryptField(
  field: EncryptedUserField,
  value: string | number | null | undefined
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (field === "workLat" || field === "workLng") {
    return encryptNumber(value as number);
  }

  return encrypt(value as string);
}

/**
 * Déchiffre un champ spécifique
 */
export function decryptField(
  field: EncryptedUserField,
  encryptedValue: string | null | undefined
): string | number | null {
  if (!encryptedValue) {
    return null;
  }

  if (field === "workLat" || field === "workLng") {
    return decryptNumber(encryptedValue);
  }

  return decrypt(encryptedValue);
}


