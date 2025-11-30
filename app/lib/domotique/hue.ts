/**
 * Connecteur Philips Hue
 * 
 * Permet de découvrir et contrôler les ampoules Philips Hue via l'API locale
 */

export interface HueBridge {
  id: string;
  internalipaddress: string;
  name: string;
  macaddress: string;
}

export interface HueLight {
  id: string;
  name: string;
  type: string;
  state: {
    on: boolean;
    bri: number; // Brightness 0-254
    hue?: number; // Color hue 0-65535
    sat?: number; // Saturation 0-254
    ct?: number; // Color temperature 153-500
    xy?: [number, number]; // XY color coordinates
    reachable: boolean;
  };
  modelid: string;
  manufacturername: string;
  uniqueid: string;
}

export interface HueGroup {
  id: string;
  name: string;
  lights: string[];
  type: string;
  state: {
    all_on: boolean;
    any_on: boolean;
  };
}

/**
 * Découvre les ponts Hue sur le réseau local
 * Utilise l'API de découverte Hue (meethue.com/api/nupnp)
 */
export async function discoverHueBridges(): Promise<HueBridge[]> {
  try {
    const response = await fetch('https://discovery.meethue.com/');
    if (!response.ok) {
      throw new Error('Erreur lors de la découverte des ponts Hue');
    }
    const bridges: HueBridge[] = await response.json();
    return bridges;
  } catch (error) {
    console.error('[Hue] Erreur découverte:', error);
    return [];
  }
}

/**
 * Crée un utilisateur sur le pont Hue
 * Nécessite d'appuyer sur le bouton du pont avant d'appeler cette fonction
 */
export async function createHueUser(
  bridgeIp: string,
  deviceType: string = 'Synexa#webapp'
): Promise<string | null> {
  try {
    const response = await fetch(`http://${bridgeIp}/api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        devicetype: deviceType,
      }),
    });

    const data = await response.json();
    
    if (data[0]?.error) {
      // Erreur typique : "link button not pressed"
      if (data[0].error.type === 101) {
        throw new Error('Veuillez appuyer sur le bouton du pont Hue puis réessayer');
      }
      throw new Error(data[0].error.description || 'Erreur inconnue');
    }

    if (data[0]?.success?.username) {
      return data[0].success.username;
    }

    return null;
  } catch (error) {
    console.error('[Hue] Erreur création utilisateur:', error);
    throw error;
  }
}

/**
 * Récupère toutes les lumières d'un pont Hue
 */
export async function getHueLights(
  bridgeIp: string,
  username: string
): Promise<Record<string, HueLight>> {
  try {
    const response = await fetch(`http://${bridgeIp}/api/${username}/lights`);
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des lumières');
    }
    const lights: Record<string, HueLight> = await response.json();
    return lights;
  } catch (error) {
    console.error('[Hue] Erreur récupération lumières:', error);
    throw error;
  }
}

/**
 * Récupère tous les groupes d'un pont Hue
 */
export async function getHueGroups(
  bridgeIp: string,
  username: string
): Promise<Record<string, HueGroup>> {
  try {
    const response = await fetch(`http://${bridgeIp}/api/${username}/groups`);
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des groupes');
    }
    const groups: Record<string, HueGroup> = await response.json();
    return groups;
  } catch (error) {
    console.error('[Hue] Erreur récupération groupes:', error);
    throw error;
  }
}

/**
 * Contrôle une lumière Hue
 */
export async function controlHueLight(
  bridgeIp: string,
  username: string,
  lightId: string,
  command: {
    on?: boolean;
    bri?: number; // 0-254
    hue?: number; // 0-65535
    sat?: number; // 0-254
    ct?: number; // 153-500 (mired)
    xy?: [number, number];
    transitiontime?: number; // Déciseconds (1 = 100ms)
  }
): Promise<boolean> {
  try {
    const response = await fetch(
      `http://${bridgeIp}/api/${username}/lights/${lightId}/state`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      }
    );

    const data = await response.json();
    
    if (data[0]?.error) {
      throw new Error(data[0].error.description || 'Erreur inconnue');
    }

    return data[0]?.success !== undefined;
  } catch (error) {
    console.error('[Hue] Erreur contrôle lumière:', error);
    throw error;
  }
}

/**
 * Contrôle un groupe de lumières Hue
 */
export async function controlHueGroup(
  bridgeIp: string,
  username: string,
  groupId: string,
  command: {
    on?: boolean;
    bri?: number;
    hue?: number;
    sat?: number;
    ct?: number;
    xy?: [number, number];
    transitiontime?: number;
  }
): Promise<boolean> {
  try {
    const response = await fetch(
      `http://${bridgeIp}/api/${username}/groups/${groupId}/action`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      }
    );

    const data = await response.json();
    
    if (data[0]?.error) {
      throw new Error(data[0].error.description || 'Erreur inconnue');
    }

    return data[0]?.success !== undefined;
  } catch (error) {
    console.error('[Hue] Erreur contrôle groupe:', error);
    throw error;
  }
}

/**
 * Convertit une commande générique en commande Hue
 */
export function convertToHueCommand(
  action: string,
  payload?: Record<string, any>
): {
  on?: boolean;
  bri?: number;
  hue?: number;
  sat?: number;
  ct?: number;
  xy?: [number, number];
  transitiontime?: number;
} {
  const command: any = {};

  switch (action) {
    case 'turn_on':
    case 'on':
      command.on = true;
      if (payload?.brightness) {
        // Convertir 0-100 à 0-254
        command.bri = Math.round((payload.brightness / 100) * 254);
      }
      if (payload?.color) {
        // Support couleur hexadécimale
        if (payload.color.startsWith('#')) {
          const rgb = hexToRgb(payload.color);
          if (rgb) {
            const xy = rgbToXy(rgb);
            command.xy = xy;
          }
        }
      }
      if (payload?.colorTemperature) {
        // Convertir Kelvin à mired (153-500)
        command.ct = kelvinToMired(payload.colorTemperature);
      }
      break;

    case 'turn_off':
    case 'off':
      command.on = false;
      break;

    case 'set_brightness':
      command.on = true;
      command.bri = Math.round((payload?.brightness / 100) * 254);
      break;

    case 'set_color':
      command.on = true;
      if (payload?.color?.startsWith('#')) {
        const rgb = hexToRgb(payload.color);
        if (rgb) {
          const xy = rgbToXy(rgb);
          command.xy = xy;
        }
      }
      break;

    case 'set_color_temperature':
      command.on = true;
      command.ct = kelvinToMired(payload?.temperature || 4000);
      break;
  }

  if (payload?.transitionTime) {
    // Convertir secondes à déciseconds
    command.transitiontime = Math.round(payload.transitionTime * 10);
  }

  return command;
}

/**
 * Utilitaires de conversion de couleurs
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToXy(rgb: { r: number; g: number; b: number }): [number, number] {
  // Conversion RGB vers XY (simplifiée)
  // Formule CIE 1931
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  // Appliquer gamma correction
  const r_ = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  const g_ = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  const b_ = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Convertir en XYZ
  const X = r_ * 0.4124 + g_ * 0.3576 + b_ * 0.1805;
  const Y = r_ * 0.2126 + g_ * 0.7152 + b_ * 0.0722;
  const Z = r_ * 0.0193 + g_ * 0.1192 + b_ * 0.9505;

  const x = X / (X + Y + Z);
  const y = Y / (X + Y + Z);

  return [x, y];
}

function kelvinToMired(kelvin: number): number {
  // Convertir Kelvin (2000-6500) à mired (153-500)
  return Math.round(1000000 / kelvin);
}

