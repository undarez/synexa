import prisma from "@/app/lib/prisma";
import {
  controlHueLight,
  controlHueGroup,
  convertToHueCommand,
} from "@/app/lib/domotique/hue";

export type DeviceCommandRequest = {
  action?: string;
  payload?: unknown;
};

export type DeviceCommandResponse = {
  deviceId: string;
  provider: string;
  action: string;
  payload?: unknown;
  status: "queued" | "sent" | "error";
  detail?: string;
};

export async function dispatchDeviceCommand(
  deviceId: string | null | undefined,
  command: DeviceCommandRequest
): Promise<DeviceCommandResponse> {
  if (!deviceId) {
    throw new Error("deviceId requis pour cette action");
  }

  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) {
    throw new Error("Appareil introuvable");
  }

  const action = command.action ?? "execute";

  // Router vers le connecteur approprié selon le provider
  try {
    switch (device.provider.toLowerCase()) {
      case "hue":
        return await dispatchHueCommand(device, command);

      // Autres providers à venir (Matter, HomeKit, etc.)
      default:
        return {
          deviceId: device.id,
          provider: device.provider,
          action,
          payload: command.payload,
          status: "queued",
          detail: `Connecteur ${device.provider} non implémenté`,
        };
    }
  } catch (error) {
    return {
      deviceId: device.id,
      provider: device.provider,
      action,
      payload: command.payload,
      status: "error",
      detail: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Dispatch une commande vers un device Hue
 */
async function dispatchHueCommand(
  device: { id: string; metadata: any },
  command: DeviceCommandRequest
): Promise<DeviceCommandResponse> {
  const metadata = device.metadata as any;
  const bridgeIp = metadata?.bridgeIp;
  const username = metadata?.username;
  const hueId = metadata?.hueId;
  const isGroup = metadata?.isGroup || false;

  if (!bridgeIp || !username || !hueId) {
    throw new Error("Configuration Hue incomplète pour ce device");
  }

  // Convertir la commande générique en commande Hue
  const hueCommand = convertToHueCommand(command.action || "execute", command.payload as any);

  // Exécuter la commande
  let success: boolean;
  if (isGroup) {
    success = await controlHueGroup(bridgeIp, username, hueId, hueCommand);
  } else {
    success = await controlHueLight(bridgeIp, username, hueId, hueCommand);
  }

  // Mettre à jour lastSeenAt
  await prisma.device.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() },
  });

  return {
    deviceId: device.id,
    provider: "hue",
    action: command.action || "execute",
    payload: command.payload,
    status: success ? "sent" : "error",
    detail: success ? "Commande exécutée avec succès" : "Échec de l'exécution",
  };
}

