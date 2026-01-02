/**
 * Chiffrement spécifique pour les données Enedis (RGPD)
 * Chiffre le numéro de série du compteur et le RPM
 */

import { encrypt, decrypt } from "../encryption";

/**
 * Chiffre les données sensibles Enedis
 */
export function encryptEnedisData(data: {
  meterSerialNumber?: string | null;
  rpm?: string | null;
  linkyToken?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
}): {
  meterSerialNumber?: string | null;
  rpm?: string | null;
  linkyToken?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
} {
  const encrypted: {
    meterSerialNumber?: string | null;
    rpm?: string | null;
    linkyToken?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
  } = {};

  if (data.meterSerialNumber) {
    encrypted.meterSerialNumber = encrypt(data.meterSerialNumber);
  }

  if (data.rpm) {
    encrypted.rpm = encrypt(data.rpm);
  }

  if (data.linkyToken) {
    encrypted.linkyToken = encrypt(data.linkyToken);
  }

  if (data.accessToken) {
    encrypted.accessToken = encrypt(data.accessToken);
  }

  if (data.refreshToken) {
    encrypted.refreshToken = encrypt(data.refreshToken);
  }

  return encrypted;
}

/**
 * Déchiffre les données sensibles Enedis
 */
export function decryptEnedisData(data: {
  meterSerialNumber?: string | null;
  rpm?: string | null;
  linkyToken?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
}): {
  meterSerialNumber?: string | null;
  rpm?: string | null;
  linkyToken?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
} {
  const decrypted: {
    meterSerialNumber?: string | null;
    rpm?: string | null;
    linkyToken?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
  } = {};

  if (data.meterSerialNumber) {
    try {
      decrypted.meterSerialNumber = decrypt(data.meterSerialNumber);
    } catch (error) {
      console.error("Erreur déchiffrement numéro de série:", error);
      decrypted.meterSerialNumber = null;
    }
  }

  if (data.rpm) {
    try {
      decrypted.rpm = decrypt(data.rpm);
    } catch (error) {
      console.error("Erreur déchiffrement RPM:", error);
      decrypted.rpm = null;
    }
  }

  if (data.linkyToken) {
    try {
      decrypted.linkyToken = decrypt(data.linkyToken);
    } catch (error) {
      console.error("Erreur déchiffrement token Linky:", error);
      decrypted.linkyToken = null;
    }
  }

  if (data.accessToken) {
    try {
      decrypted.accessToken = decrypt(data.accessToken);
    } catch (error) {
      console.error("Erreur déchiffrement access token:", error);
      decrypted.accessToken = null;
    }
  }

  if (data.refreshToken) {
    try {
      decrypted.refreshToken = decrypt(data.refreshToken);
    } catch (error) {
      console.error("Erreur déchiffrement refresh token:", error);
      decrypted.refreshToken = null;
    }
  }

  return decrypted;
}

