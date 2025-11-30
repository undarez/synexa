# Configuration Google Calendar

Ce document explique comment configurer la synchronisation avec Google Calendar.

## Configuration OAuth Google

### 1. Créer un projet Google Cloud et activer l'API

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. **IMPORTANT** : Activez l'API Google Calendar :
   - Allez dans "APIs & Services" > "Library" (ou utilisez ce lien direct : [Activer Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com))
   - Recherchez "Google Calendar API"
   - Cliquez sur "Enable"
   - ⚠️ **Attendez quelques minutes** après l'activation pour que les changements se propagent

### 2. Configurer l'écran de consentement OAuth

1. Allez dans "APIs & Services" > "OAuth consent screen"
2. Choisissez "External" (pour le développement) ou "Internal" (si vous utilisez Google Workspace)
3. Remplissez les informations requises :
   - **App name** : Synexa
   - **User support email** : Votre email
   - **Developer contact information** : Votre email
4. Cliquez sur "Save and Continue"
5. Sur la page "Scopes", cliquez sur "Add or Remove Scopes"
6. Ajoutez les scopes suivants :
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
7. Cliquez sur "Update" puis "Save and Continue"
8. Sur la page "Test users" (si en mode Test) :
   - Cliquez sur "Add Users"
   - Ajoutez votre adresse email (ex: `fortuna77320@gmail.com`)
   - Cliquez sur "Add"
9. Cliquez sur "Save and Continue" puis "Back to Dashboard"

### 3. Créer les identifiants OAuth

1. Allez dans "APIs & Services" > "Credentials"
2. Cliquez sur "Create Credentials" > "OAuth client ID"
3. Sélectionnez "Web application"
4. Donnez un nom (ex: "Synexa Web Client")
5. Ajoutez les **Authorized redirect URIs** :
   - `http://localhost:3000/api/auth/callback/google` (développement)
   - `https://votre-domaine.com/api/auth/callback/google` (production)
6. Cliquez sur "Create"
7. Copiez le **Client ID** et le **Client Secret**

### 3. Variables d'environnement

Ajoutez ces variables dans votre fichier `.env.local` :

```env
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre_secret_nextauth
```

Pour la production, ajoutez ces variables dans les paramètres de votre plateforme d'hébergement (Vercel, etc.).

## Utilisation

### Connexion

1. Allez sur la page Calendrier
2. Cliquez sur "Se connecter avec Google" dans la carte Google Calendar
3. Autorisez l'application à accéder à votre calendrier

### Synchronisation manuelle

1. Sur la page Calendrier, cliquez sur "Synchroniser maintenant"
2. Les événements des 30 prochains jours seront importés depuis Google Calendar

### Création d'événements

1. Créez un nouvel événement depuis l'application
2. Cochez "Synchroniser avec Google Calendar" si vous êtes connecté
3. L'événement sera créé à la fois localement et dans Google Calendar

### Synchronisation automatique

Pour activer la synchronisation automatique, configurez un cron job qui appelle l'endpoint `/api/calendar/auto-sync`.

#### Avec Vercel

Créez un fichier `vercel.json` à la racine du projet :

```json
{
  "crons": [
    {
      "path": "/api/calendar/auto-sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

Cela synchronisera toutes les heures. Vous pouvez ajuster le schedule selon vos besoins.

#### Avec un service externe

Vous pouvez utiliser un service comme [cron-job.org](https://cron-job.org/) ou [EasyCron](https://www.easycron.com/) pour appeler l'endpoint :

```
POST https://votre-domaine.com/api/calendar/auto-sync
Authorization: Bearer <CRON_SECRET>
```

Ajoutez `CRON_SECRET` dans vos variables d'environnement pour sécuriser l'endpoint.

## Fonctionnalités

- ✅ Import automatique des événements Google Calendar
- ✅ Création d'événements dans Google Calendar depuis l'app
- ✅ Mise à jour bidirectionnelle (modifications dans l'app synchronisées avec Google)
- ✅ Suppression synchronisée (suppression dans l'app supprime aussi dans Google)
- ✅ Rafraîchissement automatique des tokens OAuth
- ✅ Synchronisation automatique via cron job

## Limitations

- Les événements créés localement ne sont synchronisés avec Google que si l'option est cochée
- Les modifications d'événements Google existants nécessitent une synchronisation manuelle ou automatique
- La synchronisation automatique nécessite une configuration de cron job

## Dépannage

### "Token Google Calendar non disponible"

- Vérifiez que vous êtes connecté avec Google
- Vérifiez que les scopes Google Calendar sont bien demandés dans NextAuth
- Vérifiez que les variables d'environnement sont correctement configurées

### "Erreur lors de la synchronisation"

- Vérifiez que l'API Google Calendar est activée dans Google Cloud Console
- Vérifiez que les tokens OAuth ne sont pas expirés (ils sont rafraîchis automatiquement)
- Consultez les logs serveur pour plus de détails

