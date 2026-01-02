# Configuration de la Synchronisation des Métriques de Santé

Ce guide explique comment configurer la synchronisation automatique avec vos montres connectées (Fitbit, Withings, Apple Health).

## 🎯 Fonctionnalités

- **Synchronisation automatique** : Les métriques sont synchronisées périodiquement
- **Synchronisation manuelle** : Bouton pour synchroniser à tout moment
- **Multi-sources** : Support de plusieurs sources simultanément
- **Sécurisé** : Tokens stockés de manière sécurisée

## ⌚ Fitbit

### 1. Créer une application Fitbit

1. Allez sur [dev.fitbit.com](https://dev.fitbit.com)
2. Créez un compte développeur
3. Créez une nouvelle application
4. Configurez les paramètres :
   - **OAuth 2.0 Application Type** : Server
   - **Callback URL** : `https://votre-domaine.com/api/health/sync/fitbit/callback`
   - **Default Access Type** : Read Only
   - **Scopes** : `activity`, `heartrate`, `sleep`, `weight`

### 2. Obtenir les credentials

1. Dans votre application Fitbit, copiez :
   - **OAuth 2.0 Client ID**
   - **Client Secret**

### 3. Configurer les variables d'environnement

Ajoutez à votre fichier `.env` :

```env
FITBIT_CLIENT_ID=votre_client_id
FITBIT_CLIENT_SECRET=votre_client_secret
NEXTAUTH_URL=http://localhost:3000  # ou votre URL de production
```

### 4. Connecter votre compte

1. Allez dans **Profil** → Section **Synchronisation des métriques**
2. Cliquez sur **Connecter** à côté de Fitbit
3. Autorisez l'application à accéder à vos données Fitbit
4. Vous serez redirigé vers Synexa avec votre compte connecté

### 5. Métriques synchronisées

- **Pas** (STEPS)
- **Calories** (CALORIES)
- **Sommeil** (SLEEP)
- **Fréquence cardiaque** (HEART_RATE)

## ⚖️ Withings

### 1. Créer une application Withings

1. Allez sur [developer.withings.com](https://developer.withings.com)
2. Créez un compte développeur
3. Créez une nouvelle application
4. Configurez les paramètres :
   - **Callback URL** : `https://votre-domaine.com/api/health/sync/withings/callback`

### 2. Obtenir les credentials

1. Dans votre application Withings, copiez :
   - **Client ID**
   - **Client Secret**

### 3. Configurer les variables d'environnement

```env
WITHINGS_CLIENT_ID=votre_client_id
WITHINGS_CLIENT_SECRET=votre_client_secret
```

### 4. Métriques synchronisées

- **Poids** (WEIGHT)
- **IMC** (dans metadata)
- **Masse grasse** (dans metadata)

## 🤖 Google Fit (Montres Android/Wear OS)

### Support des montres Android

Google Fit supporte toutes les montres Android et Wear OS, notamment :
- **Fossil** (Gen 5, Gen 6, etc.)
- **Samsung Galaxy Watch**
- **TicWatch**
- **Huawei Watch**
- Et toutes les autres montres compatibles Wear OS

### 1. Utiliser les credentials Google existants

Google Fit utilise les mêmes credentials que Google Calendar. Si vous avez déjà configuré Google Calendar, vous pouvez utiliser les mêmes credentials.

### 2. Activer l'API Google Fitness

1. Dans Google Cloud Console, allez dans **APIs & Services** → **Library**
2. Recherchez "Fitness API"
3. Cliquez sur **Enable**

### 4. Connecter votre compte

1. Allez dans **Profil** → Section **Synchronisation des métriques**
2. Cliquez sur **Connecter** à côté de Google Fit
3. Autorisez l'application à accéder à vos données Google Fit
4. Vous serez redirigé vers Synexa avec votre compte connecté

### 5. Métriques synchronisées

- **Pas** (STEPS)
- **Calories** (CALORIES)
- **Fréquence cardiaque** (HEART_RATE)
- **Sommeil** (SLEEP)
- **Poids** (WEIGHT)
- **Activité** (ACTIVITY)

### Compatibilité

✅ **Montres compatibles** :
- Fossil Gen 5, Gen 6, Gen 7
- Samsung Galaxy Watch (toutes versions)
- TicWatch Pro, TicWatch E3
- Huawei Watch GT, Watch 3
- Toutes les montres Wear OS

## 🍎 Apple Health

**Note** : Apple Health nécessite une application iOS native pour accéder à HealthKit. Pour l'instant, la structure est prête mais nécessite une implémentation native.

### Options pour Apple Health

1. **App iOS native** : Créer une app iOS qui lit HealthKit et envoie les données à Synexa
2. **Proxy/API** : Utiliser un service tiers qui expose les données HealthKit
3. **Extension Safari** : Limité, mais possible sur iOS

## 🔄 Synchronisation automatique

### Configuration d'un cron job

Pour synchroniser automatiquement toutes les sources, configurez un cron job qui appelle :

```
POST /api/health/sync/auto
Authorization: Bearer <CRON_SECRET>
```

**Exemple avec Vercel Cron** (dans `vercel.json`) :

```json
{
  "crons": [
    {
      "path": "/api/health/sync/auto",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Cela synchronisera toutes les sources toutes les 6 heures.

### Variables d'environnement

```env
CRON_SECRET=votre_secret_securise  # Pour sécuriser l'endpoint cron
```

## 📱 Utilisation

### Synchronisation manuelle

1. Allez dans **Profil** → Section **Synchronisation des métriques**
2. Cliquez sur **Synchroniser** à côté de la source souhaitée
3. Les métriques seront récupérées et ajoutées automatiquement

### Synchronisation depuis le dashboard

1. Allez dans **Dashboard** → Section **Tableau de bord Bien-être**
2. Cliquez sur **Synchroniser les sources**
3. Toutes les sources configurées seront synchronisées

## 🔒 Sécurité

- Les tokens sont stockés de manière sécurisée dans les préférences utilisateur
- Les tokens sont chiffrés si le chiffrement est activé
- Les tokens peuvent être rafraîchis automatiquement (Fitbit)
- Chaque utilisateur voit uniquement ses propres données

## 🐛 Dépannage

### Le token a expiré

Si vous voyez une erreur "Token expiré", reconnectez votre compte :
1. Allez dans **Profil** → **Synchronisation des métriques**
2. Déconnectez et reconnectez la source

### Aucune donnée synchronisée

- Vérifiez que la source est bien connectée (icône verte)
- Vérifiez que vous avez des données dans votre compte Fitbit/Withings
- Essayez une synchronisation manuelle

### Erreur de configuration

- Vérifiez que les variables d'environnement sont bien configurées
- Vérifiez que les Callback URLs sont correctes dans les applications Fitbit/Withings
- Vérifiez les logs serveur pour plus de détails

