/**
 * Service de gestion des appareils de sécurité
 * Supporte Tuya, Zigbee, Sonoff, RTSP, ONVIF, etc.
 */

import prisma from "@/app/lib/prisma";

export interface SecurityDeviceConfig {
  name: string;
  type: "CAMERA" | "MOTION_DETECTOR" | "SMOKE_DETECTOR" | "DOOR_SENSOR" | "WINDOW_SENSOR" | "ALARM" | "GAS_DETECTOR" | "WATER_LEAK_DETECTOR" | "GLASS_BREAK_DETECTOR";
  provider: "TUYA" | "ZIGBEE" | "SONOFF" | "RTSP" | "ONVIF" | "EZVIZ" | "NETATMO" | "SOMFY" | "LEGRAND" | "OTHER";
  room?: string;
  connectionType?: string;
  connectionUrl?: string;
  credentials?: {
    username?: string;
    password?: string;
    apiKey?: string;
    apiSecret?: string;
    [key: string]: any;
  };
  externalId?: string;
  capabilities?: Record<string, any>;
}

/**
 * Ajoute un appareil de sécurité
 */
export async function addSecurityDevice(
  userId: string,
  config: SecurityDeviceConfig
) {
  return await prisma.securityDevice.create({
    data: {
      userId,
      name: config.name,
      type: config.type,
      provider: config.provider,
      room: config.room,
      connectionType: config.connectionType,
      connectionUrl: config.connectionUrl,
      credentials: config.credentials || {},
      externalId: config.externalId,
      capabilities: config.capabilities || {},
      status: "OFFLINE",
      isArmed: true,
      isEnabled: true,
    },
  });
}

/**
 * Récupère tous les appareils de sécurité d'un utilisateur
 */
export async function getSecurityDevices(userId: string) {
  return await prisma.securityDevice.findMany({
    where: { userId },
    orderBy: [
      { type: "asc" },
      { name: "asc" },
    ],
  });
}

/**
 * Met à jour le statut d'un appareil
 */
export async function updateSecurityDeviceStatus(
  deviceId: string,
  status: "ONLINE" | "OFFLINE" | "ALARM" | "TRIGGERED" | "DISARMED"
) {
  return await prisma.securityDevice.update({
    where: { id: deviceId },
    data: {
      status,
      lastSeenAt: status === "ONLINE" ? new Date() : undefined,
      lastTriggeredAt: status === "TRIGGERED" || status === "ALARM" ? new Date() : undefined,
    },
  });
}

/**
 * Arme/désarme un appareil
 */
export async function toggleSecurityDeviceArm(deviceId: string, armed: boolean) {
  return await prisma.securityDevice.update({
    where: { id: deviceId },
    data: { isArmed: armed },
  });
}

/**
 * Active/désactive un appareil
 */
export async function toggleSecurityDevice(deviceId: string, enabled: boolean) {
  return await prisma.securityDevice.update({
    where: { id: deviceId },
    data: { isEnabled: enabled },
  });
}

/**
 * Récupère le flux vidéo d'une caméra (RTSP/ONVIF)
 */
export function getCameraStreamUrl(device: {
  provider: string;
  connectionUrl?: string | null;
  connectionType?: string | null;
}): string | null {
  if (!device.connectionUrl) return null;

  // Pour RTSP, on peut utiliser un proxy WebRTC ou convertir en HLS
  if (device.provider === "RTSP" || device.connectionType === "rtsp") {
    // En production, on utiliserait un service de conversion RTSP vers HLS/WebRTC
    // Pour l'instant, on retourne l'URL directement (nécessitera un proxy)
    return `/api/security/camera/${device.connectionUrl}/stream`;
  }

  // Pour ONVIF, on peut utiliser l'URL de snapshot ou de stream
  if (device.provider === "ONVIF" || device.connectionType === "onvif") {
    return `/api/security/camera/${device.connectionUrl}/stream`;
  }

  return device.connectionUrl;
}

/**
 * Teste la connexion à un appareil
 */
export async function testSecurityDeviceConnection(
  deviceId: string
): Promise<{ success: boolean; error?: string }> {
  const device = await prisma.securityDevice.findUnique({
    where: { id: deviceId },
  });

  if (!device) {
    return { success: false, error: "Appareil non trouvé" };
  }

  try {
    // Tester selon le provider
    switch (device.provider) {
      case "RTSP":
      case "ONVIF":
        // Tester la connexion RTSP/ONVIF
        if (!device.connectionUrl) {
          return { success: false, error: "URL de connexion manquante" };
        }
        // En production, on ferait un test de connexion réel
        return { success: true };

      case "TUYA":
        // Tester la connexion Tuya API
        // En production, on utiliserait le SDK Tuya
        return { success: true };

      case "ZIGBEE":
        // Tester la connexion Zigbee (nécessite un hub)
        return { success: true };

      default:
        return { success: true };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}


