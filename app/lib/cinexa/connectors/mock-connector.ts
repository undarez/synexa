/**
 * Mock Connector - Connector par défaut pour le développement et les tests
 * 
 * Ce connector simule des appels IoT sans appeler de vraies APIs.
 * Utilisé par défaut pour :
 * - Développement sans hardware
 * - Tests unitaires
 * - Démonstrations
 * 
 * ⚠️ IMPORTANT : Ce connector ne fait jamais d'appels réseau réels.
 */

import type { IoTConnector, ConnectorConfig, ConnectorResult, DeviceState, DeviceType, IoTVendor } from "./types";

/**
 * Mock Connector - Simule des devices IoT
 * 
 * Comportement :
 * - Toutes les commandes réussissent après un délai simulé
 * - L'état est stocké en mémoire (perdu au redémarrage)
 * - Parfait pour le développement et les tests
 */
export class MockConnector implements IoTConnector {
  readonly vendor: IoTVendor = "mock";
  readonly supportedDeviceTypes: DeviceType[] = [
    "light",
    "lock",
    "camera",
    "thermostat",
    "sensor",
    "outlet",
    "other",
  ];

  // État simulé des devices (en mémoire)
  private deviceStates: Map<string, DeviceState> = new Map();

  /**
   * Simule un délai réseau (50-200ms)
   */
  private async simulateNetworkDelay(): Promise<void> {
    const delay = 50 + Math.random() * 150; // 50-200ms
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Initialise l'état d'un device s'il n'existe pas
   */
  private initializeDeviceState(deviceId: string): DeviceState {
    if (!this.deviceStates.has(deviceId)) {
      this.deviceStates.set(deviceId, {
        status: "off",
        value: 0,
        online: true,
        lastUpdate: new Date().toISOString(),
        metadata: {
          mock: true,
          vendor: "mock",
        },
      });
    }
    return this.deviceStates.get(deviceId)!;
  }

  /**
   * Allume un device (mock)
   */
  async turnOn(deviceId: string, config: ConnectorConfig): Promise<ConnectorResult> {
    await this.simulateNetworkDelay();

    try {
      const state = this.initializeDeviceState(deviceId);
      
      // Simuler un échec aléatoire (5% de chance) pour tester la gestion d'erreur
      if (Math.random() < 0.05) {
        return {
          success: false,
          error: "Mock: Device temporairement indisponible",
          retryable: true,
          logs: [`[Mock] Échec simulé pour ${deviceId}`],
        };
      }

      state.status = "on";
      state.value = state.value || 100; // Brightness par défaut
      state.lastUpdate = new Date().toISOString();

      this.deviceStates.set(deviceId, state);

      return {
        success: true,
        state: { ...state },
        logs: [`[Mock] Device ${deviceId} allumé`],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur mock connector",
        retryable: false,
      };
    }
  }

  /**
   * Éteint un device (mock)
   */
  async turnOff(deviceId: string, config: ConnectorConfig): Promise<ConnectorResult> {
    await this.simulateNetworkDelay();

    try {
      const state = this.initializeDeviceState(deviceId);
      
      if (Math.random() < 0.05) {
        return {
          success: false,
          error: "Mock: Device temporairement indisponible",
          retryable: true,
          logs: [`[Mock] Échec simulé pour ${deviceId}`],
        };
      }

      state.status = "off";
      state.value = 0;
      state.lastUpdate = new Date().toISOString();

      this.deviceStates.set(deviceId, state);

      return {
        success: true,
        state: { ...state },
        logs: [`[Mock] Device ${deviceId} éteint`],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur mock connector",
        retryable: false,
      };
    }
  }

  /**
   * Définit une valeur sur un device (mock)
   */
  async setValue(
    deviceId: string,
    value: number,
    valueType: string,
    config: ConnectorConfig
  ): Promise<ConnectorResult> {
    await this.simulateNetworkDelay();

    try {
      const state = this.initializeDeviceState(deviceId);
      
      if (Math.random() < 0.05) {
        return {
          success: false,
          error: "Mock: Device temporairement indisponible",
          retryable: true,
          logs: [`[Mock] Échec simulé pour ${deviceId}`],
        };
      }

      // Mettre à jour selon le type de valeur
      if (valueType === "brightness") {
        state.value = Math.max(0, Math.min(100, value)); // Clamp 0-100
      } else if (valueType === "temperature") {
        state.temperature = value;
      } else {
        state.value = value;
      }

      state.status = value > 0 ? "on" : "off";
      state.lastUpdate = new Date().toISOString();

      this.deviceStates.set(deviceId, state);

      return {
        success: true,
        state: { ...state },
        logs: [`[Mock] Device ${deviceId} : ${valueType} = ${value}`],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur mock connector",
        retryable: false,
      };
    }
  }

  /**
   * Récupère l'état d'un device (mock)
   */
  async getState(deviceId: string, config: ConnectorConfig): Promise<ConnectorResult> {
    await this.simulateNetworkDelay();

    try {
      const state = this.initializeDeviceState(deviceId);

      return {
        success: true,
        state: { ...state },
        logs: [`[Mock] État récupéré pour ${deviceId}`],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur mock connector",
        retryable: false,
      };
    }
  }

  /**
   * Vérifie si le connector est disponible (toujours true pour mock)
   */
  async isAvailable(config: ConnectorConfig): Promise<boolean> {
    // Le mock est toujours disponible
    return true;
  }

  /**
   * Réinitialise l'état simulé (utile pour les tests)
   */
  reset(): void {
    this.deviceStates.clear();
  }

  /**
   * Obtient l'état simulé d'un device (utile pour les tests)
   */
  getSimulatedState(deviceId: string): DeviceState | undefined {
    return this.deviceStates.get(deviceId);
  }
}

// Export d'une instance singleton par défaut
export const mockConnector = new MockConnector();
