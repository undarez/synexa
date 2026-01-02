# Gestion des Devices Connectés

## 🎯 Fonctionnalité

Système complet de gestion des devices connectés (WiFi et Bluetooth) directement depuis l'application. Découverte automatique, connexion et contrôle en un seul endroit.

## ✨ Fonctionnalités

### Découverte automatique
- ✅ **WiFi** : Scan du réseau local (mDNS, UPnP)
- ✅ **Bluetooth** : Découverte BLE (Bluetooth Low Energy)
- ✅ **Filtrage** : Par type, fabricant, signal
- ✅ **Détection** : Capacités et métadonnées automatiques

### Gestion des devices
- ✅ **Ajout** : Connexion en un clic
- ✅ **Contrôle** : Commandes directes (allumer, éteindre, etc.)
- ✅ **Statut** : Suivi de la connexion et dernière activité
- ✅ **Suppression** : Retrait facile

### Intégration
- ✅ **Automatisations** : Utilisation dans les routines
- ✅ **Langage naturel** : "Allumer les lumières" dans les routines
- ✅ **Multi-providers** : Support de différents protocoles

## 🚀 Utilisation

### 1. Accéder à la page Devices

1. Cliquez sur **"Devices"** dans la navigation
2. Ou allez directement sur `/devices`

### 2. Découvrir des devices

1. Cliquez sur **"Ajouter un device"**
2. Choisissez le type de connexion :
   - **WiFi** : Pour les devices connectés au réseau
   - **Bluetooth** : Pour les devices BLE
   - **Les deux** : Recherche combinée
3. Cliquez sur **"Lancer la recherche"**
4. Attendez quelques secondes (scan réseau)

### 3. Connecter un device

1. Une fois découvert, cliquez sur **"Ajouter"**
2. Le device est automatiquement connecté et ajouté
3. Il apparaît dans votre liste de devices

### 4. Contrôler un device

1. Dans la liste des devices, utilisez les boutons :
   - **Allumer** / **Éteindre** : Pour les ampoules, prises, etc.
   - **⚙️ Paramètres** : Pour configurer
   - **🗑️ Supprimer** : Pour retirer le device

## 🔌 Types de devices supportés

| Type | Exemples | Connexion |
|------|----------|-----------|
| **LIGHT** | Ampoules connectées, LED strips | WiFi / Bluetooth |
| **THERMOSTAT** | Thermostats intelligents | WiFi |
| **MEDIA** | Enceintes, TV connectées | WiFi / Bluetooth |
| **OUTLET** | Prises intelligentes | WiFi |
| **SENSOR** | Capteurs température, mouvement | Bluetooth / WiFi |
| **OTHER** | Autres devices | WiFi / Bluetooth |

## 🏠 Providers supportés

### Actuellement implémenté
- **Tuya** : Ampoules, prises, capteurs
- **Nest** : Thermostats
- **Generic BLE** : Capteurs Bluetooth
- **HTTP/WebSocket** : Devices locaux

### À venir
- **HomeKit** : Apple HomeKit
- **Matter** : Standard Matter/Thread
- **Zigbee** : Via passerelle
- **Z-Wave** : Via passerelle

## 🔧 Configuration avancée

### Découverte manuelle

Si un device n'est pas détecté automatiquement, vous pouvez l'ajouter manuellement :

1. Allez dans **Devices** → **Ajouter un device**
2. Cliquez sur **"Ajouter manuellement"** (à venir)
3. Entrez les informations :
   - Nom
   - Type
   - Adresse IP (WiFi) ou MAC (Bluetooth)
   - Provider
   - Credentials si nécessaire

### Credentials

Certains providers nécessitent des credentials :

- **Tuya** : Clé API et Secret
- **Nest** : Token OAuth
- **Custom** : Selon le provider

Ces credentials sont stockés de manière sécurisée dans les métadonnées du device.

## 📱 Utilisation dans les automatisations

Une fois vos devices ajoutés, vous pouvez les utiliser dans les automatisations :

### Exemple en langage naturel :
```
Quand je dis 'Bonjour', allumer les lumières du salon
Tous les soirs à 22h, éteindre toutes les lumières
Quand je rentre, allumer le chauffage
```

L'IA reconnaît automatiquement vos devices par nom !

## 🔒 Sécurité

- ✅ **Authentification** : Seuls vos devices sont accessibles
- ✅ **Isolation** : Chaque utilisateur voit uniquement ses devices
- ✅ **Credentials** : Stockés de manière sécurisée
- ✅ **Connexion locale** : Priorité au réseau local

## 🐛 Dépannage

### Le device n'apparaît pas lors de la découverte

1. **Vérifiez la connexion** :
   - WiFi : Le device est-il sur le même réseau ?
   - Bluetooth : Le Bluetooth est-il activé ?

2. **Vérifiez le mode** :
   - Certains devices doivent être en "mode appairage"
   - Consultez la documentation du device

3. **Essayez manuellement** :
   - Ajoutez le device manuellement avec son adresse IP/MAC

### Le device ne répond pas aux commandes

1. **Vérifiez la connexion** :
   - Le device est-il en ligne ?
   - Le signal est-il suffisant ?

2. **Vérifiez les credentials** :
   - Les credentials sont-ils corrects ?
   - Ont-ils expiré ?

3. **Vérifiez le provider** :
   - Le provider est-il correctement configuré ?

### Erreur de connexion Bluetooth

- **Navigateur** : Web Bluetooth nécessite HTTPS (ou localhost)
- **Permissions** : Autorisez l'accès Bluetooth dans votre navigateur
- **Compatibilité** : Vérifiez que votre navigateur supporte Web Bluetooth

## ✅ Implémentation actuelle

### Découverte WiFi
- ✅ **mDNS/Bonjour** : Découverte automatique des services (HomeKit, Google Cast, Sonos, WLED, etc.)
- ✅ **Scan réseau HTTP** : Détection des devices HTTP sur le réseau local
- ✅ **Multi-protocoles** : Support de plusieurs types de services simultanément
- ✅ **Fallback** : Devices de démonstration si la découverte échoue

### Découverte Bluetooth
- ✅ **Web Bluetooth API** : Découverte côté navigateur (nécessite HTTPS ou localhost)
- ✅ **Interaction utilisateur** : Sélection du device via le navigateur
- ✅ **Détection de services** : Identification automatique du type de device
- ✅ **Multi-services** : Support de plusieurs services BLE

### Contrôle
- Les commandes sont routées via le système de routines
- Support des providers via `dispatchDeviceCommand`
- À étendre selon les besoins

## 🔮 Améliorations futures

- [ ] Découverte réelle WiFi (mDNS, UPnP)
- [ ] Découverte réelle Bluetooth (Web Bluetooth)
- [ ] Support Matter/Thread
- [ ] Interface de configuration avancée
- [ ] Groupes de devices
- [ ] Scènes (plusieurs devices à la fois)
- [ ] Historique des commandes
- [ ] Notifications de statut

## 📚 Ressources

- [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [mDNS/Bonjour](https://en.wikipedia.org/wiki/Multicast_DNS)
- [Matter Protocol](https://csa-iot.org/all-solutions/matter/)

