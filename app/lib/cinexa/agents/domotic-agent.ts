/**
 * Agent Domotique
 * 
 * Responsabilités :
 * - Contrôler les devices (lumières, prises, etc.)
 * - Récupérer l'état des devices
 * - Gérer les valeurs (brightness, temperature, etc.)
 * 
 * ⚠️ IMPORTANT : 
 * - Aucune IA ici. Juste de la logique métier.
 * - Les agents ne connaissent jamais les vendors IoT.
 * - Toute interaction externe passe par la couche connectors.
 */

import type { AgentInput, AgentOutput } from "../types";
import {
  turnOnDevice,
  turnOffDevice,
  setDeviceValue,
  getDeviceState,
  getDeviceFromSupabase,
} from "../connectors/device-service";

/**
 * Agent domotique principal
 */
export async function domoticAgent(input: AgentInput): Promise<AgentOutput> {
  const { action, parameters, userId } = input;

  try {
    switch (action) {
      case "turn_on":
        return await turnOnDeviceAction(userId, parameters);
      
      case "turn_off":
        return await turnOffDeviceAction(userId, parameters);
      
      case "set_value":
        return await setDeviceValueAction(userId, parameters);
      
      case "get_status":
        return await getDeviceStatusAction(userId, parameters);
      
      default:
        return {
          success: false,
          error: `Action non supportée: ${action}`,
        };
    }
  } catch (error) {
    console.error("[Domotic Agent] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Allume un device
 * 
 * Utilise la couche connectors pour exécuter la commande.
 * L'agent ne connaît pas le vendor (hue, home_assistant, mock, etc.).
 */
async function turnOnDeviceAction(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const deviceId = params.deviceId || params.id;
  const deviceName = params.deviceName || params.name;

  if (!deviceId && !deviceName) {
    return {
      success: false,
      error: "deviceId ou deviceName requis",
    };
  }

  // Récupérer le device depuis Supabase
  const device = await getDeviceFromSupabase(userId, deviceId, deviceName);

  if (!device) {
    return {
      success: false,
      error: "Device non trouvé",
    };
  }

  // Exécuter la commande via le connector approprié
  const result = await turnOnDevice(userId, device.id);

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Erreur contrôle device",
      logs: result.logs,
    };
  }

  return {
    success: true,
    result: {
      deviceId: device.id,
      deviceName: device.name,
      status: result.state?.status || "on",
    },
    logs: result.logs || [`Device ${device.name} allumé`],
  };
}

/**
 * Éteint un device
 */
async function turnOffDeviceAction(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const deviceId = params.deviceId || params.id;
  const deviceName = params.deviceName || params.name;

  if (!deviceId && !deviceName) {
    return {
      success: false,
      error: "deviceId ou deviceName requis",
    };
  }

  const device = await getDeviceFromSupabase(userId, deviceId, deviceName);

  if (!device) {
    return {
      success: false,
      error: "Device non trouvé",
    };
  }

  const result = await turnOffDevice(userId, device.id);

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Erreur contrôle device",
      logs: result.logs,
    };
  }

  return {
    success: true,
    result: {
      deviceId: device.id,
      deviceName: device.name,
      status: result.state?.status || "off",
    },
    logs: result.logs || [`Device ${device.name} éteint`],
  };
}

/**
 * Définit une valeur sur un device (brightness, temperature, etc.)
 */
async function setDeviceValueAction(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const deviceId = params.deviceId || params.id;
  const value = params.value;
  const valueType = params.valueType || "brightness";

  if (!deviceId || value === undefined) {
    return {
      success: false,
      error: "deviceId et value requis",
    };
  }

  const device = await getDeviceFromSupabase(userId, deviceId);

  if (!device) {
    return {
      success: false,
      error: "Device non trouvé",
    };
  }

  const result = await setDeviceValue(userId, device.id, value, valueType);

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Erreur modification device",
      logs: result.logs,
    };
  }

  return {
    success: true,
    result: {
      deviceId: device.id,
      deviceName: device.name,
      value,
      valueType,
      status: result.state?.status,
    },
    logs: result.logs || [`Device ${device.name} : ${valueType} = ${value}`],
  };
}

/**
 * Récupère l'état d'un device
 */
async function getDeviceStatusAction(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const deviceId = params.deviceId || params.id;
  const deviceName = params.deviceName || params.name;

  if (!deviceId && !deviceName) {
    return {
      success: false,
      error: "deviceId ou deviceName requis",
    };
  }

  const device = await getDeviceFromSupabase(userId, deviceId, deviceName);

  if (!device) {
    return {
      success: false,
      error: "Device non trouvé",
    };
  }

  const result = await getDeviceState(userId, device.id);

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Erreur récupération état",
      logs: result.logs,
    };
  }

  return {
    success: true,
    result: {
      deviceId: device.id,
      deviceName: device.name,
      status: result.state?.status || "unknown",
      value: result.state?.value,
      temperature: result.state?.temperature,
      online: result.state?.online ?? true,
    },
    logs: result.logs,
  };
}
