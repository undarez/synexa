/**
 * Service de double authentification TOTP (RFC 6238)
 * Compatible avec Google Authenticator, Microsoft Authenticator, Authy, etc.
 */

import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import { encrypt, decrypt } from "../encryption";

/**
 * Génère un secret TOTP pour un utilisateur
 */
export function generateTotpSecret(userId: string, email: string): {
  secret: string;
  encryptedSecret: string;
  qrCodeUrl: string;
} {
  // Générer le secret
  const secret = speakeasy.generateSecret({
    name: `Synexa (${email})`,
    issuer: "Synexa",
    length: 32,
  });

  // Chiffrer le secret avant stockage
  const encryptedSecret = encrypt(secret.base32!) || "";

  // Générer le QR code
  const qrCodeUrl = secret.otpauth_url || "";

  return {
    secret: secret.base32!,
    encryptedSecret,
    qrCodeUrl,
  };
}

/**
 * Génère le QR code en base64 pour l'affichage
 */
export async function generateTotpQRCode(otpauthUrl: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    console.error("[TOTP] Erreur génération QR code:", error);
    throw new Error("Erreur lors de la génération du QR code");
  }
}

/**
 * Vérifie un code TOTP
 */
export function verifyTotpToken(
  encryptedSecret: string,
  token: string,
  window: number = 2 // Fenêtre de tolérance (2 périodes avant/après)
): boolean {
  try {
    // Déchiffrer le secret
    const secret = decrypt(encryptedSecret);
    if (!secret) {
      return false;
    }

    // Vérifier le token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window,
    });

    return verified === true;
  } catch (error) {
    console.error("[TOTP] Erreur vérification token:", error);
    return false;
  }
}

