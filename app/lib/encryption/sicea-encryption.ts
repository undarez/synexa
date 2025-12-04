/**
 * Chiffrement spécifique pour les données SICEA (RGPD)
 * Chiffre les identifiants de connexion SICEA
 */

import { encrypt, decrypt } from "../encryption";

/**
 * Chiffre les données sensibles SICEA
 */
export function encryptSiceaData(data: {
  username?: string | null;
  password?: string | null;
  contractNumber?: string | null;
}): {
  username?: string | null;
  password?: string | null;
  contractNumber?: string | null;
} {
  const encrypted: {
    username?: string | null;
    password?: string | null;
    contractNumber?: string | null;
  } = {};

  if (data.username) {
    encrypted.username = encrypt(data.username);
  }

  if (data.password) {
    encrypted.password = encrypt(data.password);
  }

  if (data.contractNumber) {
    encrypted.contractNumber = encrypt(data.contractNumber);
  }

  return encrypted;
}

/**
 * Déchiffre les données sensibles SICEA
 */
export function decryptSiceaData(data: {
  username?: string | null;
  password?: string | null;
  contractNumber?: string | null;
}): {
  username?: string | null;
  password?: string | null;
  contractNumber?: string | null;
} {
  const decrypted: {
    username?: string | null;
    password?: string | null;
    contractNumber?: string | null;
  } = {};

  if (data.username) {
    try {
      decrypted.username = decrypt(data.username);
    } catch (error) {
      console.error("Erreur déchiffrement username SICEA:", error);
      decrypted.username = null;
    }
  }

  if (data.password) {
    try {
      decrypted.password = decrypt(data.password);
    } catch (error) {
      console.error("Erreur déchiffrement password SICEA:", error);
      decrypted.password = null;
    }
  }

  if (data.contractNumber) {
    try {
      decrypted.contractNumber = decrypt(data.contractNumber);
    } catch (error) {
      console.error("Erreur déchiffrement numéro de contrat SICEA:", error);
      decrypted.contractNumber = null;
    }
  }

  return decrypted;
}

