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
 */
export async function discoverBluetoothDevicesClient(): Promise<BluetoothDeviceInfo[]> {
  if (typeof window === "undefined") {
    throw new Error("Web Bluetooth API n'est disponible que côté client");
  }

  if (!("bluetooth" in navigator)) {
    throw new Error("Web Bluetooth API n'est pas supporté par ce navigateur");
  }

  const devices: BluetoothDeviceInfo[] = [];

  try {
    // Demander l'accès Bluetooth (nécessite interaction utilisateur)
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        "battery_service",
        "device_information",
        "environmental_sensing",
        "generic_access",
        "heart_rate",
        "human_interface_device",
      ],
    });

    const deviceInfo: BluetoothDeviceInfo = {
      id: device.id || `ble-${Date.now()}`,
      name: device.name || "Device Bluetooth",
      address: device.id,
    };

    // Récupérer les services si connecté
    if (device.gatt) {
      try {
        const server = await device.gatt.connect();
        const services = await server.getPrimaryServices();
        deviceInfo.services = services.map((s: any) => s.uuid);

        // Lire le RSSI si disponible
        if (device.gatt.connected) {
          // Le RSSI n'est pas directement accessible via Web Bluetooth
          // Il faudrait utiliser une extension ou une API native
        }

        await server.disconnect();
      } catch (err) {
        console.warn("Impossible de se connecter au device:", err);
      }
    }

    devices.push(deviceInfo);
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      // L'utilisateur a annulé ou aucun device trouvé
      return [];
    }
    if (error.name === "SecurityError") {
      throw new Error("Bluetooth nécessite HTTPS (ou localhost)");
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



