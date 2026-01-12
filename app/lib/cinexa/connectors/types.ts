/**
 * Types et interfaces pour la couche de connectors IoT
 * 
 * Les connectors sont responsables de :
 * - Gérer les appels aux APIs IoT réelles (ou mock)
 * - Gérer les erreurs, retries, timeouts
 * - Retourner un résultat structuré
 * 
 * ⚠️ IMPORTANT : Les agents ne connaissent jamais les vendors.
 * Ils utilisent uniquement les interfaces génériques.
 */

/**
 * Vendor IoT supporté
 */
export type IoTVendor = "mock" | "hue" | "home_assistant" | "mqtt" | "tuya" | "zigbee" | "other";

/**
 * Type de device IoT
 */
export type DeviceType = "light" | "lock" | "camera" | "thermostat" | "sensor" | "outlet" | "other";

/**
 * État d'un device IoT
 */
export interface DeviceState {
  status: "on" | "off" | "unknown";
  value?: number; // Brightness, temperature, etc. (0-100 ou autre selon le type)
  temperature?: number; // Pour les thermostats
  online: boolean;
  lastUpdate: string;
  metadata?: Record<string, any>; // Données spécifiques au vendor
}

/**
 * Résultat d'une commande IoT
 */
export interface ConnectorResult {
  success: boolean;
  state?: DeviceState;
  error?: string;
  logs?: string[];
  retryable?: boolean; // Si l'erreur peut être retentée
}

/**
 * Configuration d'un connector
 * 
 * Cette configuration peut être :
 * - Globale (pour tous les devices d'un vendor)
 * - Par device (spécifique à un device)
 * 
 * Stockage recommandé : Table `connector_configs` dans Supabase (chiffrée)
 * Structure :
 * - user_id: Propriétaire de la configuration
 * - vendor: Vendor IoT (hue, home_assistant, etc.)
 * - device_id: Optionnel, null si global
 * - scope: "global" | "device"
 * - config: JSONB chiffré contenant les credentials
 */
export interface ConnectorConfig {
  vendor: IoTVendor;
  
  // Identifiants de connexion
  apiKey?: string;
  apiUrl?: string;
  credentials?: Record<string, any>; // Credentials spécifiques au vendor (chiffrés en DB)
  
  // Paramètres d'exécution
  timeout?: number; // Timeout en millisecondes (défaut: 5000)
  retries?: number; // Nombre de tentatives (défaut: 2)
  
  // Métadonnées
  scope?: "global" | "device"; // Portée de la configuration
  deviceId?: string; // ID du device si scope = "device"
  userId?: string; // Propriétaire de la configuration
}

/**
 * Interface générique d'un connector IoT
 * 
 * Tous les connectors doivent implémenter cette interface.
 * Les agents utilisent uniquement cette interface, sans connaître le vendor.
 */
export interface IoTConnector {
  /**
   * Vendor supporté par ce connector
   */
  readonly vendor: IoTVendor;

  /**
   * Types de devices supportés
   */
  readonly supportedDeviceTypes: DeviceType[];

  /**
   * Allume un device
   */
  turnOn(deviceId: string, config: ConnectorConfig): Promise<ConnectorResult>;

  /**
   * Éteint un device
   */
  turnOff(deviceId: string, config: ConnectorConfig): Promise<ConnectorResult>;

  /**
   * Définit une valeur sur un device (brightness, temperature, etc.)
   */
  setValue(
    deviceId: string,
    value: number,
    valueType: string,
    config: ConnectorConfig
  ): Promise<ConnectorResult>;

  /**
   * Récupère l'état actuel d'un device
   */
  getState(deviceId: string, config: ConnectorConfig): Promise<ConnectorResult>;

  /**
   * Vérifie si le connector est disponible/connecté
   */
  isAvailable(config: ConnectorConfig): Promise<boolean>;
}

/**
 * Informations d'un device depuis Supabase
 */
export interface DeviceInfo {
  id: string;
  userId: string;
  name: string;
  type: DeviceType;
  provider: string; // Vendor (hue, home_assistant, mock, etc.)
  externalId: string; // ID dans le système externe
  capabilities?: Record<string, any>;
  metadata?: Record<string, any>;
}
