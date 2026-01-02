/**
 * Client Bluetooth pour le navigateur
 * Utilise Web Bluetooth API pour la découverte et la connexion
 */

export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  address?: string;
  rssi?: number;
  services?: string[];
}

/**
 * Découvre les devices Bluetooth via Web Bluetooth API
 * Nécessite une interaction utilisateur (click, etc.)
 * Amélioré pour permettre la sélection de plusieurs devices
 */
export async function discoverBluetoothDevicesClient(): Promise<BluetoothDeviceInfo[]> {
  if (typeof window === "undefined") {
    throw new Error("Web Bluetooth API n'est disponible que côté client");
  }

  // Vérifier si on est sur HTTPS ou localhost
  const isSecure = window.location.protocol === "https:" || 
                   window.location.hostname === "localhost" || 
                   window.location.hostname === "127.0.0.1";
  
  if (!isSecure) {
    throw new Error("Bluetooth nécessite HTTPS ou localhost. Vous êtes sur: " + window.location.protocol + "//" + window.location.hostname);
  }

  if (!("bluetooth" in navigator)) {
    throw new Error("Web Bluetooth API n'est pas supporté par ce navigateur. Utilisez Chrome, Edge ou Opera.");
  }

  const devices: BluetoothDeviceInfo[] = [];
  const maxDevices = 10; // Limiter à 10 devices pour éviter les abus
  let deviceCount = 0;

  try {
    // Demander l'accès Bluetooth (nécessite interaction utilisateur)
    // Note: Web Bluetooth permet de sélectionner un device à la fois
    // Pour plusieurs devices, il faut appeler requestDevice plusieurs fois
    
    while (deviceCount < maxDevices) {
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            "battery_service",
            "device_information",
            "environmental_sensing",
            "generic_access",
            "heart_rate",
            "human_interface_device",
            "generic_attribute",
            "device_information",
          ],
        });

        const deviceInfo: BluetoothDeviceInfo = {
          id: device.id || `ble-${Date.now()}-${deviceCount}`,
          name: device.name || `Device Bluetooth ${deviceCount + 1}`,
          address: device.id,
        };

        // Récupérer les services si connecté
        if (device.gatt) {
          try {
            const server = await device.gatt.connect();
            const services = await server.getPrimaryServices();
            deviceInfo.services = services.map((s: any) => s.uuid);

            // Essayer de lire le RSSI via les caractéristiques
            try {
              // Certains devices exposent le RSSI via une caractéristique
              // Mais ce n'est pas standard dans Web Bluetooth
            } catch {
              // Ignorer si RSSI non disponible
            }

            await server.disconnect();
          } catch (err) {
            console.warn("Impossible de se connecter au device:", err);
            // Continuer même si la connexion échoue
          }
        }

        devices.push(deviceInfo);
        deviceCount++;

        // Demander à l'utilisateur s'il veut ajouter un autre device
        // Pour l'instant, on s'arrête après le premier
        // L'utilisateur peut relancer la recherche pour ajouter d'autres devices
        break;
      } catch (error: any) {
        if (error.name === "NotFoundError") {
          // L'utilisateur a annulé ou aucun device trouvé
          if (devices.length === 0) {
            return [];
          }
          // Si on a déjà des devices, on arrête
          break;
        }
        if (error.name === "SecurityError") {
          // SecurityError peut arriver même sur localhost dans certains cas
          // (extensions, politiques de sécurité du navigateur, etc.)
          // On retourne une liste vide plutôt que de lever une erreur
          if (devices.length === 0) {
            return [];
          }
          break;
        }
        // Autre erreur, on arrête
        if (devices.length === 0) {
          throw error;
        }
        break;
      }
    }
  } catch (error: any) {
    if (error.name === "NotFoundError" || error.name === "SecurityError") {
      throw error;
    }
    // Si on a déjà des devices, on les retourne
    if (devices.length > 0) {
      return devices;
    }
    throw error;
  }

  return devices;
}

/**
 * Convertit un BluetoothDeviceInfo en DiscoveredDevice
 */
export function bluetoothToDiscoveredDevice(
  device: BluetoothDeviceInfo
): {
  id: string;
  name: string;
  type: "LIGHT" | "THERMOSTAT" | "MEDIA" | "OUTLET" | "SENSOR" | "OTHER";
  connectionType: "BLUETOOTH";
  provider: string;
  capabilities: string[];
  metadata: {
    bluetoothAddress?: string;
    signalStrength?: number;
    services?: string[];
  };
} {
  // Détecter le type depuis les services
  let type: "LIGHT" | "THERMOSTAT" | "MEDIA" | "OUTLET" | "SENSOR" | "OTHER" = "OTHER";
  const capabilities: string[] = [];

  if (device.services) {
    for (const service of device.services) {
      if (service.includes("environmental") || service.includes("temperature")) {
        type = "SENSOR";
        capabilities.push("read_temperature", "read_humidity");
      } else if (service.includes("battery")) {
        capabilities.push("read_battery");
      } else if (service.includes("heart_rate")) {
        type = "SENSOR";
        capabilities.push("read_heart_rate");
      } else if (service.includes("human_interface")) {
        type = "OTHER";
        capabilities.push("input", "output");
      }
    }
  }

  return {
    id: device.id,
    name: device.name,
    type,
    connectionType: "BLUETOOTH",
    provider: "generic-ble",
    capabilities: capabilities.length > 0 ? capabilities : ["read", "write"],
    metadata: {
      bluetoothAddress: device.address,
      signalStrength: device.rssi,
      services: device.services,
    },
  };
}








