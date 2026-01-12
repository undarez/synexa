/**
 * Device Service - Service pour interagir avec les devices via les connectors
 * 
 * Ce service abstrait l'interaction entre les agents et les connectors.
 * Il gère :
 * - La vérification des permissions (AVANT toute action)
 * - La récupération des devices depuis Supabase
 * - La sélection du bon connector
 * - L'exécution des commandes avec retry et gestion d'erreurs
 * - La mise à jour de Supabase après succès uniquement
 * 
 * ⚠️ IMPORTANT : 
 * - Les agents utilisent ce service, pas directement les connectors.
 * - Toutes les actions vérifient les permissions AVANT l'exécution.
 * - Les erreurs sont gérées centralement avec retry et logging.
 */

import { createServerComponentClient } from "@/app/lib/supabase/server-client";
import type { DeviceInfo, ConnectorResult, ConnectorConfig } from "./types";
import { getConnectorForDevice, buildConnectorConfig } from "./connector-registry";
import {
  canUserControlDevice,
  canUserReadDevice,
} from "../services/permission-service";
import {
  executeWithRetry,
  formatUserErrorMessage,
  shouldInformGrok,
  type RetryOptions,
} from "./error-handler";

/**
 * Récupère un device depuis Supabase
 */
export async function getDeviceFromSupabase(
  userId: string,
  deviceId?: string,
  deviceName?: string
): Promise<DeviceInfo | null> {
  const supabase = await createServerComponentClient();

  let query = supabase.from("Device").select("*").eq("userId", userId);

  if (deviceId) {
    query = query.eq("id", deviceId);
  } else if (deviceName) {
    query = query.eq("name", deviceName);
  } else {
    return null;
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return null;
  }

  // Mapper vers DeviceInfo
  return {
    id: data.id,
    userId: data.userId,
    name: data.name,
    type: mapDeviceType(data.type),
    provider: data.provider || "mock",
    externalId: data.externalId || data.id,
    capabilities: data.capabilities || {},
    metadata: data.metadata || {},
  };
}

/**
 * Mappe le type de device Supabase vers DeviceType
 */
function mapDeviceType(supabaseType: string): DeviceInfo["type"] {
  const typeMap: Record<string, DeviceInfo["type"]> = {
    LIGHT: "light",
    THERMOSTAT: "thermostat",
    MEDIA: "other",
    OUTLET: "outlet",
    SENSOR: "sensor",
    CAMERA: "camera",
    MOTION_DETECTOR: "sensor",
    SMOKE_DETECTOR: "sensor",
    DOOR_SENSOR: "sensor",
    WINDOW_SENSOR: "sensor",
    ALARM: "other",
    OTHER: "other",
  };

  return typeMap[supabaseType] || "other";
}

/**
 * Vérifie les permissions avant d'exécuter une action de contrôle
 */
async function checkControlPermission(
  userId: string,
  deviceId: string
): Promise<void> {
  const hasPermission = await canUserControlDevice(userId, deviceId);
  if (!hasPermission) {
    throw new Error("Permission refusée: contrôle du device non autorisé");
  }
}

/**
 * Vérifie les permissions avant de lire l'état d'un device
 */
async function checkReadPermission(userId: string, deviceId: string): Promise<void> {
  const hasPermission = await canUserReadDevice(userId, deviceId);
  if (!hasPermission) {
    throw new Error("Permission refusée: lecture du device non autorisée");
  }
}

/**
 * Allume un device via son connector
 * 
 * Flux :
 * 1. Vérifier les permissions
 * 2. Récupérer le device
 * 3. Obtenir le connector approprié
 * 4. Exécuter avec retry
 * 5. Mettre à jour Supabase uniquement si succès
 */
export async function turnOnDevice(
  userId: string,
  deviceId: string,
  configOverrides?: Partial<ConnectorConfig>
): Promise<ConnectorResult> {
  try {
    // 1. Vérifier les permissions AVANT toute action
    await checkControlPermission(userId, deviceId);

    // 2. Récupérer le device
    const device = await getDeviceFromSupabase(userId, deviceId);
    if (!device) {
      return {
        success: false,
        error: "Device non trouvé",
        retryable: false,
        logs: ["Device non trouvé dans Supabase"],
      };
    }

    // 3. Obtenir le connector et la config
    const connector = getConnectorForDevice(device);
    const config = buildConnectorConfig(device, {
      ...configOverrides,
      userId,
      deviceId: device.id,
    });

    // 4. Exécuter avec retry et gestion d'erreurs centralisée
    const retryOptions: RetryOptions = {
      maxRetries: config.retries || 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoff: "exponential",
      retryable: (error) => {
        const errorMessage = error?.error || error?.message || String(error);
        return (
          errorMessage.includes("timeout") ||
          errorMessage.includes("network") ||
          error?.retryable === true
        );
      },
    };

    const retryResult = await executeWithRetry(
      async () => {
        const result = await connector.turnOn(device.externalId, config);
        if (!result.success) {
          throw new Error(result.error || "Erreur connector");
        }
        return result;
      },
      retryOptions
    );

    // 5. Mettre à jour Supabase uniquement si succès
    if (retryResult.success && retryResult.result?.state) {
      await updateDeviceInSupabase(device.id, retryResult.result.state);
    }

    // 6. Formater le résultat
    if (retryResult.success) {
      return {
        success: true,
        state: retryResult.result?.state,
        logs: [
          ...retryResult.logs,
          `Device ${device.name} allumé avec succès`,
        ],
      };
    } else {
      return {
        success: false,
        error: formatUserErrorMessage(
          retryResult.error || "Erreur inconnue",
          device.name,
          "allumer"
        ),
        retryable: false,
        logs: retryResult.logs,
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erreur inconnue";

    // Si c'est une erreur de permission, message clair
    if (errorMessage.includes("Permission refusée")) {
      return {
        success: false,
        error: "Vous n'avez pas la permission de contrôler ce device",
        retryable: false,
        logs: ["Permission refusée"],
      };
    }

    return {
      success: false,
      error: formatUserErrorMessage(errorMessage),
      retryable: false,
      logs: [errorMessage],
    };
  }
}

/**
 * Éteint un device via son connector
 */
export async function turnOffDevice(
  userId: string,
  deviceId: string,
  configOverrides?: Partial<ConnectorConfig>
): Promise<ConnectorResult> {
  try {
    await checkControlPermission(userId, deviceId);

    const device = await getDeviceFromSupabase(userId, deviceId);
    if (!device) {
      return {
        success: false,
        error: "Device non trouvé",
        retryable: false,
        logs: ["Device non trouvé dans Supabase"],
      };
    }

    const connector = getConnectorForDevice(device);
    const config = buildConnectorConfig(device, {
      ...configOverrides,
      userId,
      deviceId: device.id,
    });

    const retryOptions: RetryOptions = {
      maxRetries: config.retries || 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoff: "exponential",
      retryable: (error) => {
        const errorMessage = error?.error || error?.message || String(error);
        return (
          errorMessage.includes("timeout") ||
          errorMessage.includes("network") ||
          error?.retryable === true
        );
      },
    };

    const retryResult = await executeWithRetry(
      async () => {
        const result = await connector.turnOff(device.externalId, config);
        if (!result.success) {
          throw new Error(result.error || "Erreur connector");
        }
        return result;
      },
      retryOptions
    );

    if (retryResult.success && retryResult.result?.state) {
      await updateDeviceInSupabase(device.id, retryResult.result.state);
    }

    if (retryResult.success) {
      return {
        success: true,
        state: retryResult.result?.state,
        logs: [...retryResult.logs, `Device ${device.name} éteint avec succès`],
      };
    } else {
      return {
        success: false,
        error: formatUserErrorMessage(
          retryResult.error || "Erreur inconnue",
          device.name,
          "éteindre"
        ),
        retryable: false,
        logs: retryResult.logs,
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erreur inconnue";

    if (errorMessage.includes("Permission refusée")) {
      return {
        success: false,
        error: "Vous n'avez pas la permission de contrôler ce device",
        retryable: false,
        logs: ["Permission refusée"],
      };
    }

    return {
      success: false,
      error: formatUserErrorMessage(errorMessage),
      retryable: false,
      logs: [errorMessage],
    };
  }
}

/**
 * Définit une valeur sur un device via son connector
 */
export async function setDeviceValue(
  userId: string,
  deviceId: string,
  value: number,
  valueType: string,
  configOverrides?: Partial<ConnectorConfig>
): Promise<ConnectorResult> {
  try {
    await checkControlPermission(userId, deviceId);

    const device = await getDeviceFromSupabase(userId, deviceId);
    if (!device) {
      return {
        success: false,
        error: "Device non trouvé",
        retryable: false,
        logs: ["Device non trouvé dans Supabase"],
      };
    }

    const connector = getConnectorForDevice(device);
    const config = buildConnectorConfig(device, {
      ...configOverrides,
      userId,
      deviceId: device.id,
    });

    const retryOptions: RetryOptions = {
      maxRetries: config.retries || 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoff: "exponential",
      retryable: (error) => {
        const errorMessage = error?.error || error?.message || String(error);
        return (
          errorMessage.includes("timeout") ||
          errorMessage.includes("network") ||
          error?.retryable === true
        );
      },
    };

    const retryResult = await executeWithRetry(
      async () => {
        const result = await connector.setValue(
          device.externalId,
          value,
          valueType,
          config
        );
        if (!result.success) {
          throw new Error(result.error || "Erreur connector");
        }
        return result;
      },
      retryOptions
    );

    if (retryResult.success && retryResult.result?.state) {
      await updateDeviceInSupabase(device.id, retryResult.result.state);
    }

    if (retryResult.success) {
      return {
        success: true,
        state: retryResult.result?.state,
        logs: [
          ...retryResult.logs,
          `Device ${device.name} : ${valueType} = ${value}`,
        ],
      };
    } else {
      return {
        success: false,
        error: formatUserErrorMessage(
          retryResult.error || "Erreur inconnue",
          device.name,
          "modifier"
        ),
        retryable: false,
        logs: retryResult.logs,
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erreur inconnue";

    if (errorMessage.includes("Permission refusée")) {
      return {
        success: false,
        error: "Vous n'avez pas la permission de contrôler ce device",
        retryable: false,
        logs: ["Permission refusée"],
      };
    }

    return {
      success: false,
      error: formatUserErrorMessage(errorMessage),
      retryable: false,
      logs: [errorMessage],
    };
  }
}

/**
 * Récupère l'état d'un device via son connector
 */
export async function getDeviceState(
  userId: string,
  deviceId: string,
  configOverrides?: Partial<ConnectorConfig>
): Promise<ConnectorResult> {
  try {
    await checkReadPermission(userId, deviceId);

    const device = await getDeviceFromSupabase(userId, deviceId);
    if (!device) {
      return {
        success: false,
        error: "Device non trouvé",
        retryable: false,
        logs: ["Device non trouvé dans Supabase"],
      };
    }

    const connector = getConnectorForDevice(device);
    const config = buildConnectorConfig(device, {
      ...configOverrides,
      userId,
      deviceId: device.id,
    });

    const retryOptions: RetryOptions = {
      maxRetries: config.retries || 2, // Moins de retries pour la lecture
      initialDelay: 1000,
      maxDelay: 5000,
      backoff: "exponential",
      retryable: (error) => {
        const errorMessage = error?.error || error?.message || String(error);
        return (
          errorMessage.includes("timeout") ||
          errorMessage.includes("network") ||
          error?.retryable === true
        );
      },
    };

    const retryResult = await executeWithRetry(
      async () => {
        const result = await connector.getState(device.externalId, config);
        if (!result.success) {
          throw new Error(result.error || "Erreur connector");
        }
        return result;
      },
      retryOptions
    );

    if (retryResult.success && retryResult.result?.state) {
      await updateDeviceInSupabase(device.id, retryResult.result.state);
    }

    if (retryResult.success) {
      return {
        success: true,
        state: retryResult.result?.state,
        logs: retryResult.logs,
      };
    } else {
      return {
        success: false,
        error: formatUserErrorMessage(
          retryResult.error || "Erreur inconnue",
          device.name,
          "récupérer l'état"
        ),
        retryable: false,
        logs: retryResult.logs,
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erreur inconnue";

    if (errorMessage.includes("Permission refusée")) {
      return {
        success: false,
        error: "Vous n'avez pas la permission de lire ce device",
        retryable: false,
        logs: ["Permission refusée"],
      };
    }

    return {
      success: false,
      error: formatUserErrorMessage(errorMessage),
      retryable: false,
      logs: [errorMessage],
    };
  }
}

/**
 * Met à jour un device dans Supabase avec l'état du connector
 * 
 * ⚠️ IMPORTANT : Supabase reste la source de vérité.
 * On met à jour uniquement après succès du connector.
 */
async function updateDeviceInSupabase(
  deviceId: string,
  state: ConnectorResult["state"]
): Promise<void> {
  if (!state) return;

  const supabase = await createServerComponentClient();

  const updateData: Record<string, any> = {
    lastSeenAt: new Date().toISOString(),
  };

  // Mapper l'état vers les champs Supabase
  // Note: La table Device peut avoir des champs différents selon le schéma
  // Ici, on fait une mise à jour générique
  if (state.status) {
    // Le champ "status" peut ne pas exister dans Device
    // On le stocke dans metadata si nécessaire
    updateData.metadata = {
      ...updateData.metadata,
      status: state.status,
      value: state.value,
      temperature: state.temperature,
      lastUpdate: state.lastUpdate,
    };
  }

  try {
    await supabase.from("Device").update(updateData).eq("id", deviceId);
  } catch (error) {
    console.error("[Device Service] Erreur mise à jour Supabase:", error);
    // Ne pas faire échouer la commande si Supabase échoue
    // Le connector a réussi, c'est l'essentiel
  }
}
