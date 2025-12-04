# Configuration Smart Home - Sonoff eWeLink

## 📋 Vue d'ensemble

La page Smart Home de Synexa est maintenant compatible avec les appareils Sonoff les plus populaires en France :

- **Sonoff Basic R4** (interrupteur)
- **Sonoff Mini** (interrupteur)
- **Sonoff S26 / S40** (prises connectées)
- **Sonoff L3 LED Strip** (bande LED RGB)
- **Sonoff S-Mate** (capteurs température/humidité)

## 🏗️ Architecture

### Stores Zustand

L'application utilise Zustand pour gérer l'état de manière réactive :

- **`/app/lib/stores/smart-home/devices.ts`** : Gestion des appareils
- **`/app/lib/stores/smart-home/rooms.ts`** : Gestion des pièces
- **`/app/lib/stores/smart-home/logs.ts`** : Système de logs

### Service eWeLink

Le service `/app/lib/services/ewelink.ts` gère :

- Identification automatique des modèles Sonoff (via UIID)
- Support des capacités spécifiques à chaque modèle
- Gestion des multi-canaux (Basic R4)
- Support RGB pour L3 LED Strip
- Lecture des capteurs S-Mate

## 🔧 Configuration API eWeLink

### 1. Obtenir les credentials

1. Créer un compte sur [eWeLink Developer](https://developers.sonoff.tech/)
2. Créer une application
3. Obtenir `App ID` et `App Secret`

### 2. Authentification

L'API eWeLink utilise OAuth 2.0. Le flux d'authentification :

```typescript
// 1. Obtenir le code d'autorisation
const authUrl = `https://eu-api.coolkit.cc:8080/api/user/login?appid=${APP_ID}&appsecret=${APP_SECRET}`;

// 2. Échanger le code contre un access token
const tokenResponse = await fetch(`https://eu-api.coolkit.cc:8080/api/user/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    appid: APP_ID,
    appsecret: APP_SECRET,
    email: USER_EMAIL,
    password: USER_PASSWORD,
  }),
});
```

### 3. Stocker les credentials

Les credentials doivent être stockés dans la base de données (à ajouter au schéma Prisma) :

```prisma
model EWeLinkCredentials {
  id          String   @id @default(cuid())
  userId      String   @unique
  accessToken String
  refreshToken String?
  expiresAt   DateTime?
  region      String   @default("eu") // eu, us, cn
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## 📱 Utilisation

### Récupérer les appareils

```typescript
const response = await fetch(
  `https://eu-api.coolkit.cc:8080/api/user/device?lang=fr&getTags=1`,
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }
);
```

### Contrôler un appareil

```typescript
// Allumer/éteindre
await fetch(`https://eu-api.coolkit.cc:8080/api/user/device/status`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    deviceid: "1000123456",
    params: { switch: "on" },
  }),
});
```

### Contrôler la luminosité (L3 LED Strip)

```typescript
await fetch(`https://eu-api.coolkit.cc:8080/api/user/device/status`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    deviceid: "1000123458",
    params: { 
      switch: "on",
      brightness: 75,
      colorR: 255,
      colorG: 100,
      colorB: 150,
    },
  }),
});
```

## 🎨 Style Fratech95

L'interface suit les principes de Fratech95 :

- **Cartes simples** : Fond blanc, bordures nettes
- **Icônes claires** : Lucide Icons, taille cohérente
- **Boutons ronds ON/OFF** : Toggle visuels
- **Liste par pièce** : Organisation claire
- **Affichage de statut direct** : Couleurs simples (vert=on, gris=off)
- **Vue d'ensemble propre** : Statistiques en un coup d'œil

## 📊 Système de logs

Toutes les actions sont loggées automatiquement :

- Toggle d'appareil
- Changement de valeur
- Exécution de routine
- Erreurs système

Les logs sont stockés dans le store Zustand et peuvent être consultés via l'API `/api/smart-home/logs`.

## 🚀 Prochaines étapes

1. **Ajouter les credentials eWeLink au schéma Prisma**
2. **Implémenter l'authentification OAuth**
3. **Connecter les vrais appels API**
4. **Ajouter le support Tuya**
5. **Ajouter le support Philips Hue**
6. **Intégrer Matter/Zigbee**

## 📚 Ressources

- [Documentation eWeLink](https://developers.sonoff.tech/)
- [API Reference](https://developers.sonoff.tech/ewelink-open-api/api-reference)
- [UIID Mapping](https://sonoff.tech/sonoff-diy-mode-api-protocol)




