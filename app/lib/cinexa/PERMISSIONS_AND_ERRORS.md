# Permissions & Gestion d'Erreurs - Documentation

## 🎯 Vue d'ensemble

Cette implémentation ajoute deux couches critiques à l'architecture Cinexa :

1. **Permission Service** : Vérification des permissions avant toute action IoT
2. **Error Handler** : Gestion centralisée des erreurs avec retry et logging

## 📁 Fichiers créés

```
app/lib/cinexa/
├── services/
│   └── permission-service.ts    # Vérification des permissions
└── connectors/
    ├── error-handler.ts          # Gestion d'erreurs et retries
    └── device-service.ts         # Mis à jour avec permissions + retries
```

## 🔐 Permission Service

### Fonctionnalités

- **Vérification hiérarchique** : `read` < `control` < `automate` < `admin`
- **Propriétaire par défaut** : Le propriétaire d'un device a toutes les permissions
- **Partage futur** : Architecture prête pour le partage de devices avec permissions granulaires

### Utilisation

```typescript
import { canUserControlDevice, canUserReadDevice } from "../services/permission-service";

// Vérifier avant d'exécuter une action
if (await canUserControlDevice(userId, deviceId)) {
  // Exécuter l'action
} else {
  // Refuser l'accès
}
```

### Permissions disponibles

- `canUserReadDevice()` : Lire l'état d'un device
- `canUserControlDevice()` : Contrôler un device (on/off, set value)
- `canUserAutomateDevice()` : Créer des automatisations
- `canUserAdminDevice()` : Administrer un device (delete, configure)

## 🔄 Error Handler

### Fonctionnalités

- **Retry avec backoff exponentiel** : 1s → 2s → 4s → 8s (max 10s)
- **Détection d'erreurs retryables** : Timeout, réseau, etc.
- **Logging structuré** : Toutes les tentatives sont loggées
- **Messages utilisateur clairs** : Erreurs formatées pour l'utilisateur final

### Utilisation

```typescript
import { executeWithRetry, formatUserErrorMessage } from "./error-handler";

const result = await executeWithRetry(
  async () => {
    return await connector.turnOn(deviceId, config);
  },
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoff: "exponential",
    retryable: (error) => {
      // Déterminer si l'erreur est retryable
      return error.message.includes("timeout");
    },
  }
);
```

### Stratégies de backoff

- **exponential** : `delay * 2^attempt` (recommandé)
- **linear** : `delay * (attempt + 1)`
- **fixed** : `delay` constant

## 🔧 Device Service - Mise à jour

### Flux d'exécution

```
1. Vérifier les permissions (AVANT toute action)
   ↓
2. Récupérer le device depuis Supabase
   ↓
3. Obtenir le connector approprié
   ↓
4. Exécuter avec retry et gestion d'erreurs
   ↓
5. Mettre à jour Supabase uniquement si succès
   ↓
6. Formater le résultat pour l'utilisateur
```

### Exemple : `turnOnDevice`

```typescript
export async function turnOnDevice(
  userId: string,
  deviceId: string,
  configOverrides?: Partial<ConnectorConfig>
): Promise<ConnectorResult> {
  try {
    // 1. Vérifier les permissions
    await checkControlPermission(userId, deviceId);

    // 2. Récupérer le device
    const device = await getDeviceFromSupabase(userId, deviceId);
    
    // 3. Obtenir le connector
    const connector = getConnectorForDevice(device);
    const config = buildConnectorConfig(device, { userId, deviceId });

    // 4. Exécuter avec retry
    const retryResult = await executeWithRetry(
      async () => await connector.turnOn(device.externalId, config),
      { maxRetries: 3, backoff: "exponential" }
    );

    // 5. Mettre à jour Supabase si succès
    if (retryResult.success) {
      await updateDeviceInSupabase(device.id, retryResult.result.state);
    }

    // 6. Formater le résultat
    return formatResult(retryResult, device);
  } catch (error) {
    return handleError(error);
  }
}
```

## 🔒 Sécurité

### Principe de moindre privilège

- **Vérification systématique** : Toutes les actions vérifient les permissions AVANT l'exécution
- **Refus par défaut** : En cas d'erreur de permission, refuser l'accès
- **Isolation** : Les permissions sont vérifiées indépendamment des connectors

### Messages d'erreur

- **Pas d'informations sensibles** : Les messages d'erreur ne révèlent pas de détails techniques
- **User-friendly** : Messages clairs et actionnables pour l'utilisateur
- **Logging détaillé** : Les détails techniques sont dans les logs, pas dans les messages utilisateur

## 📊 ConnectorConfig - Clarification

### Structure mise à jour

```typescript
interface ConnectorConfig {
  vendor: IoTVendor;
  
  // Identifiants de connexion
  apiKey?: string;
  apiUrl?: string;
  credentials?: Record<string, any>; // Chiffrés en DB
  
  // Paramètres d'exécution
  timeout?: number; // Défaut: 5000ms
  retries?: number; // Défaut: 2
  
  // Métadonnées
  scope?: "global" | "device"; // Portée de la configuration
  deviceId?: string; // ID du device si scope = "device"
  userId?: string; // Propriétaire de la configuration
}
```

### Stockage recommandé

**Table Supabase : `connector_configs`**

```sql
CREATE TABLE "connector_configs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "vendor" TEXT NOT NULL,
  "deviceId" TEXT, -- NULL si scope = "global"
  "scope" TEXT NOT NULL DEFAULT 'global',
  "config" JSONB NOT NULL, -- Chiffré
  "createdAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
```

## 🚀 Prochaines étapes

1. **Implémenter le stockage ConnectorConfig** dans Supabase
2. **Ajouter le chiffrement** des credentials
3. **Créer le premier vrai connector** (Home Assistant recommandé)
4. **Tests unitaires** pour permissions et error handler
5. **Monitoring** des erreurs et retries

## ✅ Avantages

- **Sécurité** : Permissions vérifiées systématiquement
- **Robustesse** : Retry automatique sur les erreurs réseau
- **Maintenabilité** : Gestion d'erreurs centralisée
- **Expérience utilisateur** : Messages d'erreur clairs
- **Extensibilité** : Architecture prête pour le partage de devices
