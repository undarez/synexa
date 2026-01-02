/**
 * Service eWeLink pour l'intégration Sonoff
 * Documentation: https://developers.sonoff.tech/
 * 
 * Appareils supportés:
 * - Sonoff Basic R4 (interrupteur)
 * - Sonoff Mini (interrupteur)
 * - Sonoff S26 / S40 (prises connectées)
 * - Sonoff L3 LED Strip (bande LED)
 * - Sonoff S-Mate + capteurs (capteurs)
 */

import { getEWeLinkCredentials, getEWeLinkApiUrl } from "./ewelink-auth";

// Types d'appareils Sonoff supportés
export type SonoffDeviceModel =
  | "BASIC_R4"
  | "MINI"
  | "S26"
  | "S40"
  | "L3_LED_STRIP"
  | "S_MATE"
  | "UNKNOWN";

interface EWeLinkDevice {
  deviceid: string;
  name: string;
  type: string;
  model?: string; // Modèle Sonoff
  params: {
    switch?: "on" | "off";
    switches?: Array<{ switch: "on" | "off" }>; // Pour Basic R4 (multi-canaux)
    brightness?: number; // Pour L3 LED Strip
    colorR?: number; // Pour L3 LED Strip
    colorG?: number;
  colorB?: number;
    power?: number;
    temperature?: number; // Pour S-Mate capteurs
    humidity?: number; // Pour S-Mate capteurs
    [key: string]: any;
  };
  online: boolean;
  extra?: {
    model?: string;
    uiid?: number; // UIID Sonoff pour identifier le modèle
  };
}

interface EWeLinkRoom {
  id: string;
  name: string;
  deviceIds: string[];
}

/**
 * Récupère toutes les données de la Smart Home
 */
export async function getSmartHomeData(userId: string) {
  try {
    const credentials = await getEWeLinkCredentials(userId);
    
    // Si pas de credentials, retourner des données de démonstration
    if (!credentials) {
      console.log("[eWeLink] Pas de credentials, utilisation des données de démonstration");
      return getDemoData();
    }
    
    const devices = await getDevices(userId, credentials);
    const rooms = await getRooms(userId);
    
    // Calculer les statistiques
    const devicesOn = devices.filter((d) => d.params?.switch === "on" || (d.params?.power !== undefined && d.params.power > 0)).length;
    const devicesOff = devices.length - devicesOn;
    
    // Température moyenne (si capteurs disponibles)
    const tempDevices = devices.filter((d) => d.params?.temperature);
    const avgTemp = tempDevices.length > 0
      ? Math.round(
          tempDevices.reduce((sum, d) => sum + (d.params.temperature || 0), 0) /
            tempDevices.length
        )
      : null;

    // État général (logique simple)
    let status = "Maison sécurisée";
    if (devicesOn === 0) {
      status = "Tous les appareils sont éteints";
    } else if (devicesOn === devices.length) {
      status = "Tous les appareils sont allumés";
    } else {
      status = `${devicesOn} appareil${devicesOn > 1 ? "s" : ""} allumé${devicesOn > 1 ? "s" : ""}`;
    }

    return {
      overview: {
        temperature: avgTemp,
        devicesOn,
        devicesOff,
        status,
      },
      rooms: rooms.map((room) => ({
        id: room.id,
        name: room.name,
        icon: getRoomIcon(room.name),
        color: getRoomColor(room.name),
        deviceCount: room.deviceIds.length,
      })),
      devices: devices.map((device) => {
        const model = identifySonoffModel(device);
        const capabilities = getDeviceCapabilities(model);
        const status = device.params?.switch === "on" || 
                      device.params?.switches?.some((s: any) => s.switch === "on") ||
                      device.params?.power > 0 
                      ? "on" : "off";
        
        return {
          id: device.deviceid,
          name: device.name,
          type: getDeviceType(device.type, model),
          room: getDeviceRoom(device.deviceid, rooms),
          status,
          value: device.params?.brightness || 
                 device.params?.power || 
                 device.params?.temperature ||
                 undefined,
          icon: getDeviceIcon(device.type, model),
          online: device.online,
          model,
          capabilities,
        };
      }),
      routines: getDefaultRoutines(),
    };
  } catch (error) {
    console.error("[eWeLink] Erreur getSmartHomeData:", error);
    throw error;
  }
}

/**
 * Identifie le modèle Sonoff à partir de l'UIID ou du type
 */
function identifySonoffModel(device: EWeLinkDevice): SonoffDeviceModel {
  // UIID Sonoff: https://sonoff.tech/sonoff-diy-mode-api-protocol
  const uiid = device.extra?.uiid;
  
  if (uiid) {
    // Mapping UIID -> Modèle
    const uiidMap: Record<number, SonoffDeviceModel> = {
      1: "BASIC_R4", // Basic
      2: "BASIC_R4", // Basic R2/R3/R4
      3: "MINI", // Mini
      4: "MINI", // Mini R2
      5: "S26", // S26
      6: "S40", // S40
      7: "L3_LED_STRIP", // L3 LED Strip
      8: "S_MATE", // S-Mate
    };
    return uiidMap[uiid] || "UNKNOWN";
  }

  // Fallback sur le modèle dans extra
  if (device.extra?.model) {
    const model = device.extra.model.toUpperCase();
    if (model.includes("BASIC")) return "BASIC_R4";
    if (model.includes("MINI")) return "MINI";
    if (model.includes("S26")) return "S26";
    if (model.includes("S40")) return "S40";
    if (model.includes("L3")) return "L3_LED_STRIP";
    if (model.includes("MATE")) return "S_MATE";
  }

  return "UNKNOWN";
}

/**
 * Récupère les capacités d'un appareil selon son modèle
 */
function getDeviceCapabilities(model: SonoffDeviceModel) {
  const capabilities: Record<SonoffDeviceModel, any> = {
    BASIC_R4: {
      brightness: false,
      temperature: false,
      power: true,
      color: false,
      multiChannel: true, // Peut avoir plusieurs canaux
    },
    MINI: {
      brightness: false,
      temperature: false,
      power: true,
      color: false,
      multiChannel: false,
    },
    S26: {
      brightness: false,
      temperature: false,
      power: true,
      color: false,
      multiChannel: false,
    },
    S40: {
      brightness: false,
      temperature: false,
      power: true,
      color: false,
      multiChannel: false,
    },
    L3_LED_STRIP: {
      brightness: true,
      temperature: false,
      power: true,
      color: true, // RGB
      multiChannel: false,
    },
    S_MATE: {
      brightness: false,
      temperature: true,
      power: false,
      color: false,
      multiChannel: false,
      sensors: ["temperature", "humidity"], // Peut avoir plusieurs capteurs
    },
    UNKNOWN: {
      brightness: false,
      temperature: false,
      power: true,
      color: false,
      multiChannel: false,
    },
  };
  return capabilities[model] || capabilities.UNKNOWN;
}

/**
 * Récupère la liste des appareils depuis eWeLink
 */
async function getDevices(
  userId: string,
  credentials: any
): Promise<EWeLinkDevice[]> {
  try {
    const apiUrl = getEWeLinkApiUrl(credentials.region);
    const response = await fetch(
      `${apiUrl}/api/user/device?lang=fr&getTags=1`,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data.devicelist || [];
  } catch (error: any) {
    console.error("[eWeLink] Erreur getDevices:", error);
    // En cas d'erreur, retourner des données de démonstration
    console.log("[eWeLink] Utilisation des données de démonstration");
    return getDemoDevices();
  }
}

/**
 * Données de démonstration pour les appareils
 */
function getDemoDevices(): EWeLinkDevice[] {
  return [
    {
      deviceid: "1000123456",
      name: "Interrupteur Salon",
      type: "switch",
      params: { switch: "on" },
      online: true,
      extra: { model: "BASIC_R4", uiid: 1 },
    },
    {
      deviceid: "1000123457",
      name: "Prise Cuisine",
      type: "plug",
      params: { switch: "off" },
      online: true,
      extra: { model: "S26", uiid: 5 },
    },
    {
      deviceid: "1000123458",
      name: "Bande LED Chambre",
      type: "light",
      params: { switch: "on", brightness: 75, colorR: 255, colorG: 100, colorB: 150 },
      online: true,
      extra: { model: "L3_LED_STRIP", uiid: 7 },
    },
    {
      deviceid: "1000123459",
      name: "Capteur Température",
      type: "sensor",
      params: { temperature: 21, humidity: 45 },
      online: true,
      extra: { model: "S_MATE", uiid: 8 },
    },
    {
      deviceid: "1000123460",
      name: "Mini Bureau",
      type: "switch",
      params: { switch: "on" },
      online: true,
      extra: { model: "MINI", uiid: 3 },
    },
  ];
}

/**
 * Récupère les pièces configurées
 */
async function getRooms(userId: string): Promise<EWeLinkRoom[]> {
  // TODO: Récupérer depuis la DB
  return [
    { id: "salon", name: "Salon", deviceIds: ["light-1"] },
    { id: "cuisine", name: "Cuisine", deviceIds: ["plug-1"] },
    { id: "chambre", name: "Chambre", deviceIds: ["light-2", "thermo-1"] },
  ];
}

/**
 * Active ou désactive un appareil
 */
export async function toggleDevice(userId: string, deviceId: string) {
  try {
    const credentials = await getEWeLinkCredentials(userId);
    if (!credentials) {
      console.log("[eWeLink] Pas de credentials, simulation du toggle");
      return { success: true };
    }

    // Récupérer l'appareil pour connaître son état actuel
    const devices = await getDevices(userId, credentials);
    const device = devices.find((d) => d.deviceid === deviceId);
    
    if (!device) {
      throw new Error("Appareil non trouvé");
    }

    // Déterminer le nouvel état
    const currentState =
      device.params?.switch ||
      device.params?.switches?.[0]?.switch ||
      "off";
    const newState = currentState === "on" ? "off" : "on";

    const apiUrl = getEWeLinkApiUrl(credentials.region);

    // Pour Basic R4 avec multi-canaux
    if (device.extra?.uiid === 1 && device.params?.switches) {
      const switches = device.params.switches.map(() => ({ switch: newState }));
      await updateDevice(credentials, deviceId, { switches });
    } else {
      await updateDevice(credentials, deviceId, { switch: newState });
    }

    return { success: true };
  } catch (error: any) {
    console.error("[eWeLink] Erreur toggleDevice:", error);
    throw error;
  }
}

/**
 * Met à jour un appareil via l'API eWeLink
 */
async function updateDevice(
  credentials: any,
  deviceId: string,
  params: any
): Promise<void> {
  const apiUrl = getEWeLinkApiUrl(credentials.region);
  const response = await fetch(`${apiUrl}/api/user/device/status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deviceid: deviceId,
      params,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
}

/**
 * Met à jour la valeur d'un appareil (brightness pour LED, etc.)
 */
export async function updateDeviceValue(
  userId: string,
  deviceId: string,
  value: number
) {
  try {
    const credentials = await getEWeLinkCredentials(userId);
    if (!credentials) {
      console.log("[eWeLink] Pas de credentials, simulation de la mise à jour");
      return { success: true };
    }

    const devices = await getDevices(userId, credentials);
    const device = devices.find((d) => d.deviceid === deviceId);
    
    if (!device) {
      throw new Error("Appareil non trouvé");
    }

    const model = identifySonoffModel(device);
    const params: any = {};

    if (model === "L3_LED_STRIP") {
      // Pour la bande LED, mettre à jour la luminosité
      params.brightness = value;
      // Conserver la couleur actuelle si elle existe
      if (device.params?.colorR !== undefined) {
        params.colorR = device.params.colorR;
        params.colorG = device.params.colorG;
        params.colorB = device.params.colorB;
      }
    } else {
      // Pour les autres appareils, ajuster selon le type
      params.power = value;
    }

    await updateDevice(credentials, deviceId, params);
    return { success: true };
  } catch (error: any) {
    console.error("[eWeLink] Erreur updateDeviceValue:", error);
    throw error;
  }
}

/**
 * Exécute une routine
 */
export async function executeRoutine(userId: string, routineId: string) {
  try {
    // TODO: Implémenter la logique des routines
    // Les routines peuvent combiner plusieurs actions sur plusieurs appareils

    const routines: Record<string, () => Promise<void>> = {
      bonsoir: async () => {
        // Éteindre toutes les lumières, baisser l'intensité, activer l'alarme
        console.log("[Routine] Bonsoir exécutée");
      },
      reveil: async () => {
        // Allumer lumière douce, lancer musique
        console.log("[Routine] Réveil exécutée");
      },
      quitter: async () => {
        // Couper tous les appareils
        console.log("[Routine] Je quitte exécutée");
      },
      cinema: async () => {
        // Lumière basse, TV ON
        console.log("[Routine] Mode Cinéma exécutée");
      },
      sport: async () => {
        // Lumière blanche, musique énergie
        console.log("[Routine] Mode Sport exécutée");
      },
    };

    const routine = routines[routineId];
    if (routine) {
      await routine();
    }

    return { success: true };
  } catch (error) {
    console.error("[eWeLink] Erreur executeRoutine:", error);
    throw error;
  }
}

// Helpers
function getDeviceType(type: string, model?: SonoffDeviceModel): string {
  // Priorité au modèle Sonoff
  if (model === "L3_LED_STRIP") return "light";
  if (model === "S_MATE") return "sensor";
  if (model === "BASIC_R4" || model === "MINI") return "switch";
  if (model === "S26" || model === "S40") return "plug";

  // Fallback sur le type
  const typeMap: Record<string, string> = {
    light: "light",
    switch: "switch",
    plug: "plug",
    thermostat: "thermostat",
    sensor: "sensor",
    camera: "camera",
    fan: "fan",
    tv: "tv",
  };
  return typeMap[type] || "plug";
}

function getDeviceIcon(type: string, model?: SonoffDeviceModel): string {
  // Priorité au modèle Sonoff
  if (model === "L3_LED_STRIP") return "Lightbulb";
  if (model === "S_MATE") return "Thermometer";
  if (model === "BASIC_R4" || model === "MINI") return "Power";
  if (model === "S26" || model === "S40") return "Power";

  // Fallback sur le type
  const iconMap: Record<string, string> = {
    light: "Lightbulb",
    switch: "Power",
    plug: "Power",
    thermostat: "Thermometer",
    sensor: "Thermometer",
    camera: "Camera",
    fan: "Wind",
    tv: "Tv",
  };
  return iconMap[type] || "Power";
}

function getRoomIcon(name: string): string {
  const iconMap: Record<string, string> = {
    Salon: "Home",
    Cuisine: "Utensils",
    Chambre: "Bed",
    "Salle de bain": "Droplet",
    Jardin: "TreePine",
    Garage: "Car",
  };
  return iconMap[name] || "Home";
}

function getRoomColor(name: string): string {
  const colorMap: Record<string, string> = {
    Salon: "blue",
    Cuisine: "green",
    Chambre: "purple",
    "Salle de bain": "cyan",
    Jardin: "green",
    Garage: "gray",
  };
  return colorMap[name] || "purple";
}

function getDeviceRoom(deviceId: string, rooms: EWeLinkRoom[]): string {
  const room = rooms.find((r) => r.deviceIds.includes(deviceId));
  return room?.id || "salon";
}

function getDefaultRoutines() {
  return [
    {
      id: "bonsoir",
      name: "Bonsoir",
      icon: "Moon",
      description: "Éteint tout, baisse lumière, active alarme",
    },
    {
      id: "reveil",
      name: "Réveil",
      icon: "Sun",
      description: "Allume lumière douce + musique",
    },
    {
      id: "quitter",
      name: "Je quitte",
      icon: "LogOut",
      description: "Coupe tous les appareils",
    },
    {
      id: "cinema",
      name: "Mode Cinéma",
      icon: "Film",
      description: "Lumière basse + TV ON",
    },
    {
      id: "sport",
      name: "Mode Sport",
      icon: "Dumbbell",
      description: "Lumière blanche + musique énergie",
    },
  ];
}

/**
 * Retourne des données de démonstration
 */
function getDemoData() {
  const devices = getDemoDevices();
  const rooms = [
    { id: "salon", name: "Salon", deviceIds: ["1000123456"] },
    { id: "cuisine", name: "Cuisine", deviceIds: ["1000123457"] },
    { id: "chambre", name: "Chambre", deviceIds: ["1000123458", "1000123459"] },
    { id: "bureau", name: "Bureau", deviceIds: ["1000123460"] },
  ];

  const devicesOn = devices.filter(
    (d) => d.params?.switch === "on" || d.params?.power > 0
  ).length;
  const devicesOff = devices.length - devicesOn;

  const tempDevices = devices.filter((d) => d.params?.temperature);
  const avgTemp =
    tempDevices.length > 0
      ? Math.round(
          tempDevices.reduce((sum, d) => sum + (d.params.temperature || 0), 0) /
            tempDevices.length
        )
      : null;

  let status = "Maison sécurisée";
  if (devicesOn === 0) {
    status = "Tous les appareils sont éteints";
  } else if (devicesOn === devices.length) {
    status = "Tous les appareils sont allumés";
  } else {
    status = `${devicesOn} appareil${devicesOn > 1 ? "s" : ""} allumé${devicesOn > 1 ? "s" : ""}`;
  }

  return {
    overview: {
      temperature: avgTemp,
      devicesOn,
      devicesOff,
      status,
    },
    rooms: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      icon: getRoomIcon(room.name),
      color: getRoomColor(room.name),
      deviceCount: room.deviceIds.length,
    })),
    devices: devices.map((device) => {
      const model = identifySonoffModel(device);
      const capabilities = getDeviceCapabilities(model);
      const status =
        device.params?.switch === "on" ||
        device.params?.switches?.some((s: any) => s.switch === "on") ||
        device.params?.power > 0
          ? "on"
          : "off";

      return {
        id: device.deviceid,
        name: device.name,
        type: getDeviceType(device.type, model),
        room: getDeviceRoom(device.deviceid, rooms),
        status,
        value:
          device.params?.brightness ||
          device.params?.power ||
          device.params?.temperature ||
          undefined,
        icon: getDeviceIcon(device.type, model),
        online: device.online,
        model,
        capabilities,
      };
    }),
    routines: getDefaultRoutines(),
  };
}

