/**
 * Connector Registry - Gestion centralisée des connectors IoT
 * 
 * Responsabilités :
 * - Enregistrer les connectors disponibles
 * - Sélectionner le bon connector selon le vendor
 * - Fournir le connector par défaut (mock)
 * - Gérer la configuration des connectors
 * 
 * ⚠️ IMPORTANT : Les agents utilisent ce registry pour obtenir le bon connector.
 * Ils ne connaissent jamais directement les vendors.
 */

import type { IoTConnector, IoTVendor, ConnectorConfig, DeviceInfo } from "./types";
import { mockConnector } from "./mock-connector";

/**
 * Registre des connectors disponibles
 */
const connectorRegistry = new Map<IoTVendor, IoTConnector>();

/**
 * Configuration par défaut des connectors
 */
const defaultConfigs = new Map<IoTVendor, Partial<ConnectorConfig>>();

/**
 * Enregistre un connector
 */
export function registerConnector(connector: IoTConnector): void {
  connectorRegistry.set(connector.vendor, connector);
  console.log(`[Connector Registry] Connector ${connector.vendor} enregistré`);
}

/**
 * Obtient un connector selon le vendor
 * 
 * @param vendor - Vendor IoT (hue, home_assistant, mock, etc.)
 * @returns Le connector correspondant ou le mock par défaut
 */
export function getConnector(vendor: IoTVendor | string): IoTConnector {
  const normalizedVendor = normalizeVendor(vendor);
  const connector = connectorRegistry.get(normalizedVendor);

  if (connector) {
    return connector;
  }

  // Fallback sur mock si le vendor n'est pas trouvé
  console.warn(
    `[Connector Registry] Vendor "${vendor}" non trouvé, utilisation du mock par défaut`
  );
  return mockConnector;
}

/**
 * Obtient le connector pour un device depuis Supabase
 * 
 * @param device - Informations du device depuis Supabase
 * @returns Le connector approprié pour ce device
 */
export function getConnectorForDevice(device: DeviceInfo): IoTConnector {
  const vendor = normalizeVendor(device.provider);
  return getConnector(vendor);
}

/**
 * Normalise le nom du vendor (tolérance aux variations)
 */
function normalizeVendor(vendor: string | IoTVendor): IoTVendor {
  const normalized = vendor.toLowerCase().replace(/[_-]/g, "_");

  // Mapping des variations communes
  const vendorMap: Record<string, IoTVendor> = {
    mock: "mock",
    hue: "hue",
    philips_hue: "hue",
    home_assistant: "home_assistant",
    homeassistant: "home_assistant",
    hass: "home_assistant",
    mqtt: "mqtt",
    tuya: "tuya",
    zigbee: "zigbee",
    other: "other",
  };

  return vendorMap[normalized] || "mock"; // Fallback sur mock
}

/**
 * Configure un connector par défaut
 */
export function setDefaultConfig(vendor: IoTVendor, config: Partial<ConnectorConfig>): void {
  defaultConfigs.set(vendor, config);
}

/**
 * Obtient la configuration par défaut d'un connector
 */
export function getDefaultConfig(vendor: IoTVendor): Partial<ConnectorConfig> {
  return defaultConfigs.get(vendor) || {};
}

/**
 * Construit une configuration complète pour un connector
 * 
 * @param device - Informations du device depuis Supabase
 * @param overrides - Configuration à surcharger
 * @returns Configuration complète pour le connector
 */
export function buildConnectorConfig(
  device: DeviceInfo,
  overrides?: Partial<ConnectorConfig>
): ConnectorConfig {
  const vendor = normalizeVendor(device.provider);
  const defaultConfig = getDefaultConfig(vendor);

  return {
    vendor,
    timeout: 5000, // 5 secondes par défaut
    retries: 2, // 2 tentatives par défaut
    ...defaultConfig,
    ...overrides,
    // Utiliser les credentials du device si disponibles
    credentials: device.metadata?.credentials || defaultConfig.credentials || {},
  };
}

/**
 * Liste tous les vendors enregistrés
 */
export function listRegisteredVendors(): IoTVendor[] {
  return Array.from(connectorRegistry.keys());
}

/**
 * Vérifie si un vendor est disponible
 */
export function isVendorAvailable(vendor: IoTVendor | string): boolean {
  const normalizedVendor = normalizeVendor(vendor);
  return connectorRegistry.has(normalizedVendor);
}

// Initialisation : enregistrer le mock connector par défaut
registerConnector(mockConnector);

// Exporter le mock comme connector par défaut
export { mockConnector };
