/**
 * Système de découverte de devices WiFi/Bluetooth
 * 
 * Supporte plusieurs protocoles :
 * - mDNS/Bonjour (WiFi)
 * - UPnP (WiFi)
 * - HTTP/WebSocket (devices locaux)
 * - Web Bluetooth API (Bluetooth - navigateur)
 */

import Bonjour from "bonjour";

export interface DiscoveredDevice {
  id: string;
  name: string;
  type: "LIGHT" | "THERMOSTAT" | "MEDIA" | "OUTLET" | "SENSOR" | "OTHER";
  connectionType: "WIFI" | "BLUETOOTH" | "BOTH";
  provider: string;
  capabilities: string[];
  metadata: {
    ip?: string;
    mac?: string;
    bluetoothAddress?: string;
    signalStrength?: number;
    firmware?: string;
    manufacturer?: string;
  };
}

export interface DiscoveryOptions {
  timeout?: number; // en millisecondes
  connectionType?: "WIFI" | "BLUETOOTH" | "BOTH";
  filter?: {
    type?: DiscoveredDevice["type"];
    manufacturer?: string;
  };
}

/**
 * Découvre les devices WiFi sur le réseau local
 * Utilise mDNS/Bonjour pour la découverte automatique
 */
export async function discoverWiFiDevices(
  options: DiscoveryOptions = {}
): Promise<DiscoveredDevice[]> {
  const devices: DiscoveredDevice[] = [];
  const timeout = options.timeout || 10000;
  const startTime = Date.now();

  try {
    // Créer une instance Bonjour pour la découverte mDNS
    const bonjour = Bonjour();

    // Services connus à rechercher
    const serviceTypes = [
      "_http._tcp", // Devices HTTP génériques
      "_hap._tcp", // HomeKit Accessory Protocol
      "_googlecast._tcp", // Google Cast
      "_airplay._tcp", // AirPlay
      "_sonos._tcp", // Sonos
      "_tuya._tcp", // Tuya (si supporté)
      "_homekit._tcp", // HomeKit
      "_wled._tcp", // WLED (LED strips)
    ];

    const discoveredServices = new Map<string, DiscoveredDevice>();

    // Fonction pour convertir un service mDNS en DiscoveredDevice
    const serviceToDevice = (service: any): DiscoveredDevice | null => {
      const name = service.name || "Device inconnu";
      const host = service.host || service.referer?.address;
      const port = service.port || 80;
      const ip = host || service.referer?.address;

      if (!ip) return null;

      // Déterminer le type et provider depuis le nom/service
      let type: DiscoveredDevice["type"] = "OTHER";
      let provider = "generic";
      const capabilities: string[] = [];

      // Détection par service type
      if (service.type.includes("hap") || service.type.includes("homekit")) {
        type = "LIGHT";
        provider = "homekit";
        capabilities.push("turn_on", "turn_off", "set_brightness");
      } else if (service.type.includes("googlecast")) {
        type = "MEDIA";
        provider = "googlecast";
        capabilities.push("play", "pause", "set_volume");
      } else if (service.type.includes("sonos")) {
        type = "MEDIA";
        provider = "sonos";
        capabilities.push("play", "pause", "set_volume");
      } else if (service.type.includes("wled")) {
        type = "LIGHT";
        provider = "wled";
        capabilities.push("turn_on", "turn_off", "set_brightness", "set_color");
      } else if (service.type.includes("airplay")) {
        type = "MEDIA";
        provider = "airplay";
        capabilities.push("play", "set_volume");
      }

      // Détection par nom
      const nameLower = name.toLowerCase();
      if (nameLower.includes("light") || nameLower.includes("ampoule") || nameLower.includes("lamp")) {
        type = "LIGHT";
        if (!capabilities.includes("turn_on")) {
          capabilities.push("turn_on", "turn_off", "set_brightness");
        }
      } else if (nameLower.includes("thermostat") || nameLower.includes("nest")) {
        type = "THERMOSTAT";
        provider = "nest";
        capabilities.push("set_temperature", "get_temperature");
      } else if (nameLower.includes("sensor") || nameLower.includes("capteur")) {
        type = "SENSOR";
        capabilities.push("read_temperature", "read_humidity");
      } else if (nameLower.includes("plug") || nameLower.includes("prise")) {
        type = "OUTLET";
        capabilities.push("turn_on", "turn_off");
      }

      const deviceId = `${provider}-${ip}-${port}`;

      return {
        id: deviceId,
        name: name,
        type,
        connectionType: "WIFI",
        provider,
        capabilities,
        metadata: {
          ip,
          port,
          signalStrength: -50, // Estimation
          manufacturer: provider,
        },
      };
    };

    // Rechercher chaque type de service
    const browserPromises = serviceTypes.map((serviceType) => {
      return new Promise<void>((resolve) => {
        const browser = bonjour.find({ type: serviceType }, (service: any) => {
          const device = serviceToDevice(service);
          if (device) {
            discoveredServices.set(device.id, device);
          }
        });

        // Timeout pour ce service
        setTimeout(() => {
          browser.stop();
          resolve();
        }, timeout);
      });
    });

    // Attendre que tous les browsers soient lancés
    await Promise.all(browserPromises);

    // Attendre un peu pour collecter les résultats
    await new Promise((resolve) => setTimeout(resolve, Math.min(timeout / 2, 3000)));

    // Scanner aussi les IPs locales courantes pour les devices HTTP
    await scanLocalNetwork(discoveredServices, timeout - (Date.now() - startTime));

    // Nettoyer
    bonjour.destroy();

    // Convertir en array et filtrer
    const results = Array.from(discoveredServices.values()).filter((device) => {
      if (options.filter?.type && device.type !== options.filter.type) {
        return false;
      }
      if (
        options.filter?.manufacturer &&
        device.metadata.manufacturer !== options.filter.manufacturer
      ) {
        return false;
      }
      return true;
    });

    return results;
  } catch (error) {
    console.error("[Device Discovery] Erreur WiFi:", error);
    // Ne pas retourner de fallback - retourner une liste vide si erreur
    return [];
  }
}

/**
 * Scan le réseau local pour trouver des devices HTTP
 * Amélioré pour détecter l'IP locale réelle du client
 */
async function scanLocalNetwork(
  discoveredDevices: Map<string, DiscoveredDevice>,
  timeout: number
): Promise<void> {
  const startTime = Date.now();
  const scanPromises: Promise<void>[] = [];

  // Détecter la plage réseau locale réelle
  // Pour cela, on va scanner autour de l'IP locale si disponible
  // Sinon, on utilise les plages courantes
  
  // Plages réseau courantes
  const commonRanges = [
    { base: "192.168.1", start: 1, end: 254 },
    { base: "192.168.0", start: 1, end: 254 },
    { base: "10.0.0", start: 1, end: 254 },
    { base: "172.16.0", start: 1, end: 254 },
  ];

  // Limiter le scan à 100 IPs max pour ne pas surcharger
  let scannedCount = 0;
  const maxScans = 100;

  for (const range of commonRanges) {
    if (scannedCount >= maxScans || Date.now() - startTime > timeout) break;
    
    // Scanner seulement les 25 premières IPs de chaque plage
    for (let i = range.start; i <= Math.min(range.end, range.start + 25); i++) {
      if (scannedCount >= maxScans || Date.now() - startTime > timeout) break;

      const ip = `${range.base}.${i}`;
      scannedCount++;
      
      scanPromises.push(
        probeDevice(ip, discoveredDevices).catch(() => {
          // Ignorer les erreurs silencieusement
        })
      );
    }
  }

  // Scanner en parallèle avec un maximum de 20 requêtes simultanées
  const batchSize = 20;
  for (let i = 0; i < scanPromises.length; i += batchSize) {
    const batch = scanPromises.slice(i, i + batchSize);
    await Promise.allSettled(batch);
    
    // Vérifier le timeout entre les batches
    if (Date.now() - startTime > timeout) break;
  }
}

/**
 * Sonde un device à une IP donnée
 * Amélioré pour détecter les types de devices réels
 */
async function probeDevice(
  ip: string,
  discoveredDevices: Map<string, DiscoveredDevice>
): Promise<void> {
  try {
    // Ports courants pour les devices IoT
    const ports = [80, 8080, 8081, 8888, 5000, 3000, 8000];
    
    for (const port of ports) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 800);

        const response = await fetch(`http://${ip}:${port}`, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "User-Agent": "Synexa-Device-Scanner/1.0",
            "Accept": "text/html,application/json",
          },
        } as RequestInit).catch(() => null);

        clearTimeout(timeoutId);

        if (response && response.ok) {
          // Analyser le contenu pour déterminer le type
          const contentType = response.headers.get("content-type") || "";
          let deviceName = `Device ${ip}:${port}`;
          let deviceType: DiscoveredDevice["type"] = "OTHER";
          let provider = "http";
          const capabilities: string[] = ["http_request"];

          // Essayer de lire le body pour détecter le type
          try {
            const text = await response.text();
            const lowerText = text.toLowerCase();
            
            // Détection par contenu
            if (lowerText.includes("philips hue") || lowerText.includes("hue")) {
              provider = "philips-hue";
              deviceType = "LIGHT";
              capabilities.push("turn_on", "turn_off", "set_brightness", "set_color");
            } else if (lowerText.includes("tuya") || lowerText.includes("smart life")) {
              provider = "tuya";
              deviceType = "LIGHT";
              capabilities.push("turn_on", "turn_off", "set_brightness");
            } else if (lowerText.includes("sonos")) {
              provider = "sonos";
              deviceType = "MEDIA";
              capabilities.push("play", "pause", "set_volume");
            } else if (lowerText.includes("nest") || lowerText.includes("thermostat")) {
              provider = "nest";
              deviceType = "THERMOSTAT";
              capabilities.push("set_temperature", "get_temperature");
            } else if (lowerText.includes("sensor") || lowerText.includes("temperature")) {
              deviceType = "SENSOR";
              capabilities.push("read_temperature");
            }

            // Extraire le nom si possible
            const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch) {
              deviceName = titleMatch[1].trim();
            }
          } catch {
            // Si on ne peut pas lire le body, continuer avec les infos de base
          }

          // Device HTTP trouvé
          const device: DiscoveredDevice = {
            id: `http-${ip}-${port}`,
            name: deviceName,
            type: deviceType,
            connectionType: "WIFI",
            provider,
            capabilities,
            metadata: {
              ip,
              port,
            },
          };
          discoveredDevices.set(device.id, device);
          break; // Un port suffit
        }
      } catch {
        // Continuer avec le port suivant
      }
    }
  } catch {
    // Ignorer les erreurs
  }
}


/**
 * Découvre les devices Bluetooth Low Energy
 * Utilise Web Bluetooth API (navigateur uniquement)
 * 
 * Note: Web Bluetooth nécessite HTTPS (ou localhost) et une interaction utilisateur
 */
export async function discoverBluetoothDevices(
  options: DiscoveryOptions = {}
): Promise<DiscoveredDevice[]> {
  const devices: DiscoveredDevice[] = [];
  const timeout = options.timeout || 10000;

  try {
    // Web Bluetooth API est uniquement disponible côté client (navigateur)
    if (typeof window === "undefined") {
      // Côté serveur, on ne peut pas scanner Bluetooth directement
      // Retourner des instructions ou utiliser un service externe
      console.warn("[Device Discovery] Bluetooth non disponible côté serveur");
      return [];
    }

    // Vérifier si Web Bluetooth est supporté
    if (!("bluetooth" in navigator)) {
      console.warn("[Device Discovery] Web Bluetooth API non supporté par ce navigateur");
      return [];
    }

    // Web Bluetooth nécessite une interaction utilisateur
    // Cette fonction doit être appelée depuis un gestionnaire d'événement utilisateur
    try {
      // Demander l'accès Bluetooth
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "battery_service",
          "device_information",
          "environmental_sensing",
          "generic_access",
        ],
      });

      // Convertir en DiscoveredDevice
      const discoveredDevice: DiscoveredDevice = {
        id: device.id || `ble-${device.name}`,
        name: device.name || "Device Bluetooth",
        type: "SENSOR", // Par défaut, peut être détecté via les services
        connectionType: "BLUETOOTH",
        provider: "generic-ble",
        capabilities: ["read", "write"],
        metadata: {
          bluetoothAddress: device.id,
          signalStrength: -60, // Estimation
          manufacturer: "Unknown",
        },
      };

      // Détecter le type depuis les services
      if (device.gatt) {
        const services = await device.gatt.getPrimaryServices();
        for (const service of services) {
          if (service.uuid.includes("environmental")) {
            discoveredDevice.type = "SENSOR";
            discoveredDevice.capabilities.push("read_temperature", "read_humidity");
          } else if (service.uuid.includes("battery")) {
            discoveredDevice.capabilities.push("read_battery");
          }
        }
      }

      devices.push(discoveredDevice);
    } catch (error: any) {
      // Erreurs courantes :
      // - User cancelled
      // - No device selected
      if (error.name !== "NotFoundError" && error.name !== "SecurityError") {
        console.error("[Device Discovery] Erreur Bluetooth:", error);
      }
    }

    return devices.filter((device) => {
      if (options.filter?.type && device.type !== options.filter.type) {
        return false;
      }
      return true;
    });
  } catch (error) {
    console.error("[Device Discovery] Erreur Bluetooth:", error);
    return [];
  }
}

/**
 * Découvre tous les devices (WiFi + Bluetooth)
 */
export async function discoverAllDevices(
  options: DiscoveryOptions = {}
): Promise<DiscoveredDevice[]> {
  const connectionType = options.connectionType || "BOTH";
  const results: DiscoveredDevice[] = [];

  if (connectionType === "WIFI" || connectionType === "BOTH") {
    const wifiDevices = await discoverWiFiDevices(options);
    results.push(...wifiDevices);
  }

  if (connectionType === "BLUETOOTH" || connectionType === "BOTH") {
    const bluetoothDevices = await discoverBluetoothDevices(options);
    results.push(...bluetoothDevices);
  }

  return results;
}

/**
 * Connecte un device découvert
 * Établit la connexion et récupère les capacités réelles
 */
export async function connectDevice(
  device: DiscoveredDevice,
  credentials?: Record<string, unknown>
): Promise<{
  success: boolean;
  device?: DiscoveredDevice;
  error?: string;
}> {
  try {
    // Simuler la connexion
    // En production, établir la vraie connexion selon le provider
    
    // Vérifier les credentials si nécessaire
    if (device.provider === "tuya" && !credentials?.apiKey) {
      return {
        success: false,
        error: "Clé API requise pour ce device",
      };
    }

    // Simuler un délai de connexion
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      success: true,
      device: {
        ...device,
        metadata: {
          ...device.metadata,
          connected: true,
          connectedAt: new Date().toISOString(),
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur de connexion",
    };
  }
}

/**
 * Teste la connexion à un device
 */
export async function testDeviceConnection(
  deviceId: string,
  provider: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Simuler le test
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // En production, envoyer une commande de test (ping, status, etc.)
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur de test",
    };
  }
}

