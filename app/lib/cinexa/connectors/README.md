# Couche Connectors IoT

## 🎯 Objectif

Cette couche abstrait toutes les interactions avec les APIs IoT externes. Les agents ne connaissent jamais les vendors (Hue, Home Assistant, MQTT, etc.) et utilisent uniquement des interfaces génériques.

## 📁 Structure

```
connectors/
├── types.ts              # Interfaces TypeScript génériques
├── mock-connector.ts     # Connector mock par défaut
├── connector-registry.ts # Gestion centralisée des connectors
├── device-service.ts     # Service d'abstraction pour les agents
└── README.md            # Cette documentation
```

## 🏗️ Architecture

```
Agent (domotic-agent.ts)
    ↓
Device Service (device-service.ts)
    ↓
Connector Registry (connector-registry.ts)
    ↓
Connector (mock-connector.ts, hue-connector.ts, etc.)
    ↓
API IoT réelle (ou mock)
```

## 🔑 Principes

### 1. Agents ne connaissent pas les vendors

Les agents utilisent uniquement `device-service.ts` qui abstrait complètement les vendors.

```typescript
// ✅ Correct : L'agent utilise le service
const result = await turnOnDevice(userId, deviceId);

// ❌ Incorrect : L'agent ne doit jamais appeler directement un connector
const connector = getConnector("hue");
```

### 2. Connectors gèrent les appels externes

Chaque connector implémente `IoTConnector` et gère :
- Les appels API réels (ou mock)
- Les erreurs, retries, timeouts
- La transformation des données

### 3. Mock par défaut

Le `MockConnector` est utilisé par défaut pour :
- Développement sans hardware
- Tests unitaires
- Démonstrations

### 4. Supabase = Source de vérité

- Les devices sont stockés dans Supabase
- L'état est mis à jour **uniquement après succès** du connector
- Le connector ne modifie jamais Supabase directement

## 📝 Utilisation

### Pour les agents

```typescript
import { turnOnDevice, turnOffDevice, setDeviceValue, getDeviceState } from "../connectors/device-service";

// L'agent n'a pas besoin de connaître le vendor
const result = await turnOnDevice(userId, deviceId);
```

### Pour ajouter un nouveau connector

1. **Créer le connector**
   ```typescript
   // connectors/hue-connector.ts
   export class HueConnector implements IoTConnector {
     readonly vendor: IoTVendor = "hue";
     readonly supportedDeviceTypes: DeviceType[] = ["light"];
     
     async turnOn(deviceId: string, config: ConnectorConfig): Promise<ConnectorResult> {
       // Appel API Hue
     }
     // ... autres méthodes
   }
   ```

2. **Enregistrer dans le registry**
   ```typescript
   // Dans connector-registry.ts ou à l'initialisation
   import { HueConnector } from "./hue-connector";
   registerConnector(new HueConnector());
   ```

3. **Configurer les credentials**
   ```typescript
   setDefaultConfig("hue", {
     apiKey: process.env.HUE_API_KEY,
     apiUrl: process.env.HUE_BRIDGE_URL,
   });
   ```

## 🔧 Interfaces

### IoTConnector

Tous les connectors doivent implémenter :

```typescript
interface IoTConnector {
  readonly vendor: IoTVendor;
  readonly supportedDeviceTypes: DeviceType[];
  
  turnOn(deviceId: string, config: ConnectorConfig): Promise<ConnectorResult>;
  turnOff(deviceId: string, config: ConnectorConfig): Promise<ConnectorResult>;
  setValue(deviceId: string, value: number, valueType: string, config: ConnectorConfig): Promise<ConnectorResult>;
  getState(deviceId: string, config: ConnectorConfig): Promise<ConnectorResult>;
  isAvailable(config: ConnectorConfig): Promise<boolean>;
}
```

### ConnectorResult

Résultat standardisé retourné par tous les connectors :

```typescript
interface ConnectorResult {
  success: boolean;
  state?: DeviceState;
  error?: string;
  logs?: string[];
  retryable?: boolean;
}
```

## 🧪 Tests

Le `MockConnector` permet de tester les agents sans hardware :

```typescript
import { mockConnector } from "./mock-connector";

// Réinitialiser l'état
mockConnector.reset();

// Tester une commande
const result = await mockConnector.turnOn("device-123", config);

// Vérifier l'état simulé
const state = mockConnector.getSimulatedState("device-123");
```

## 🚀 Prochaines étapes

Pour ajouter un connector réel (ex: Philips Hue) :

1. Créer `hue-connector.ts` implémentant `IoTConnector`
2. Gérer l'authentification Hue (API key, bridge discovery)
3. Implémenter les appels API Hue
4. Gérer les erreurs spécifiques à Hue
5. Enregistrer dans le registry
6. Configurer les credentials dans Supabase ou variables d'environnement

## ⚠️ Sécurité

- **Jamais de credentials dans le code**
- Stocker les credentials dans Supabase (chiffrés) ou variables d'environnement
- Utiliser HTTPS pour toutes les APIs
- Valider les permissions utilisateur avant d'exécuter une commande
