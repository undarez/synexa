/**
 * Surcouche de protection pour sécuriser les communications
 * entre Synexa ↔ box ↔ domotique ↔ cloud
 */

import { NextRequest } from "next/server";
import crypto from "crypto";
import { logger } from "../logger";
import prisma from "../prisma";

// Cache pour les tokens d'accès (en production, utiliser Redis)
const accessTokenCache = new Map<string, { userId: string; expiresAt: number }>();

/**
 * Génère un token d'accès chiffré pour une action spécifique
 */
export function generateAccessToken(
  userId: string,
  action: string,
  deviceId?: string,
  expiresInSeconds: number = 3600 // 1 heure par défaut
): string {
  const payload = {
    userId,
    action,
    deviceId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };

  const secret = process.env.ACCESS_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || "default-secret";
  const token = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  // Stocker dans le cache
  accessTokenCache.set(token, {
    userId,
    expiresAt: payload.expiresAt,
  });

  return token;
}

/**
 * Vérifie un token d'accès
 */
export function verifyAccessToken(token: string): {
  valid: boolean;
  userId?: string;
  error?: string;
} {
  const cached = accessTokenCache.get(token);
  if (!cached) {
    return { valid: false, error: "Token invalide" };
  }

  if (Date.now() > cached.expiresAt) {
    accessTokenCache.delete(token);
    return { valid: false, error: "Token expiré" };
  }

  return { valid: true, userId: cached.userId };
}

/**
 * Vérifie si un appareil est de confiance
 */
export async function isTrustedDevice(
  userId: string,
  deviceId: string
): Promise<boolean> {
  try {
    const device = await prisma.trustedDevice.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
    });

    if (!device || !device.isActive) {
      return false;
    }

    // Mettre à jour lastSeenAt
    await prisma.trustedDevice.update({
      where: {
        id: device.id,
      },
      data: {
        lastSeenAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    logger.error("Erreur vérification appareil de confiance", error);
    return false;
  }
}

/**
 * Enregistre un appareil de confiance
 */
export async function registerTrustedDevice(
  userId: string,
  deviceId: string,
  deviceName: string,
  deviceType?: string,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.trustedDevice.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
      update: {
        deviceName,
        deviceType,
        userAgent,
        ipAddress,
        lastSeenAt: new Date(),
        isActive: true,
      },
      create: {
        userId,
        deviceId,
        deviceName,
        deviceType,
        userAgent,
        ipAddress,
        lastSeenAt: new Date(),
        isActive: true,
      },
    });

    logger.info("Appareil de confiance enregistré", { userId, deviceId, deviceName });
  } catch (error) {
    logger.error("Erreur enregistrement appareil de confiance", error);
    throw error;
  }
}

/**
 * Génère un identifiant unique pour un appareil
 */
export function generateDeviceId(request: NextRequest): string {
  const userAgent = request.headers.get("user-agent") || "";
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

  // Créer un hash unique basé sur l'IP et le User-Agent
  const hash = crypto
    .createHash("sha256")
    .update(`${ip}-${userAgent}`)
    .digest("hex")
    .substring(0, 32);

  return hash;
}

/**
 * Vérifie si une action nécessite une vérification TOTP
 */
export function requiresTotpVerification(action: string): boolean {
  const protectedActions = [
    "add_sicea_credentials",
    "modify_domotic_settings",
    "access_camera",
    "control_heating",
    "control_shutters",
    "generate_api_key",
    "access_security_logs",
    "modify_security_settings",
  ];

  return protectedActions.includes(action);
}

/**
 * Enregistre un événement de sécurité
 */
export async function logSecurityEvent(
  userId: string | null,
  eventType: string,
  severity: "info" | "warning" | "error" | "critical",
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string,
  deviceId?: string
): Promise<void> {
  try {
    await prisma.securityLog.create({
      data: {
        userId,
        eventType,
        severity,
        details: details || {},
        ipAddress,
        userAgent,
        deviceId,
      },
    });

    // Alerter si sévérité critique
    if (severity === "critical") {
      logger.error("Événement de sécurité critique", {
        userId,
        eventType,
        details,
      });
    }
  } catch (error) {
    logger.error("Erreur enregistrement événement de sécurité", error);
  }
}

/**
 * Détecte les activités suspectes
 */
export async function detectSuspiciousActivity(
  userId: string,
  action: string,
  ipAddress?: string,
  deviceId?: string
): Promise<boolean> {
  try {
    // Vérifier les actions récentes de l'utilisateur
    const recentActions = await prisma.securityLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Dernière heure
        },
        severity: {
          in: ["warning", "error", "critical"],
        },
      },
      take: 10,
    });

    // Si trop d'actions suspectes récentes
    if (recentActions.length > 5) {
      await logSecurityEvent(
        userId,
        "suspicious_activity_detected",
        "critical",
        {
          action,
          recentSuspiciousActions: recentActions.length,
        },
        ipAddress,
        undefined,
        deviceId
      );
      return true;
    }

    // Vérifier si l'action est effectuée depuis un appareil non reconnu
    if (deviceId) {
      const isTrusted = await isTrustedDevice(userId, deviceId);
      if (!isTrusted && requiresTotpVerification(action)) {
        await logSecurityEvent(
          userId,
          "untrusted_device_action",
          "warning",
          { action, deviceId },
          ipAddress,
          undefined,
          deviceId
        );
        return true; // Nécessite vérification supplémentaire
      }
    }

    return false;
  } catch (error) {
    logger.error("Erreur détection activité suspecte", error);
    return false;
  }
}

/**
 * Sandbox pour les commandes domotiques
 * Vérifie toutes les conditions avant d'exécuter une commande
 */
export async function validateDomoticCommand(
  userId: string,
  deviceId: string,
  command: string,
  request: NextRequest
): Promise<{
  allowed: boolean;
  reason?: string;
  requiresTotp?: boolean;
}> {
  const clientDeviceId = generateDeviceId(request);
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;

  // 1. Vérifier si l'appareil est de confiance
  const isTrusted = await isTrustedDevice(userId, clientDeviceId);
  if (!isTrusted) {
    return {
      allowed: false,
      reason: "Appareil non reconnu. Veuillez vérifier votre identité avec TOTP.",
      requiresTotp: true,
    };
  }

  // 2. Détecter les activités suspectes
  const isSuspicious = await detectSuspiciousActivity(userId, `domotic_command_${command}`, ipAddress, clientDeviceId);
  if (isSuspicious) {
    return {
      allowed: false,
      reason: "Activité suspecte détectée. Accès refusé.",
    };
  }

  // 3. Vérifier la fréquence des commandes (rate limiting spécifique)
  const recentCommands = await prisma.securityLog.findMany({
    where: {
      userId,
      eventType: "domotic_command",
      createdAt: {
        gte: new Date(Date.now() - 60000), // Dernière minute
      },
    },
    take: 20,
  });

  if (recentCommands.length > 20) {
    return {
      allowed: false,
      reason: "Trop de commandes récentes. Veuillez patienter.",
    };
  }

  // 4. Enregistrer la commande
  await logSecurityEvent(
    userId,
    "domotic_command",
    "info",
    { deviceId, command },
    ipAddress,
    request.headers.get("user-agent") || undefined,
    clientDeviceId
  );

  return { allowed: true };
}

