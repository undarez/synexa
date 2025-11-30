# Configuration OAuth Google Fit

Ce guide explique comment ajouter les scopes fitness à votre configuration OAuth Google pour permettre la synchronisation avec Google Fit.

## 📋 Prérequis

- Un projet Google Cloud existant (le même que pour Google Calendar)
- Les credentials OAuth déjà configurés (`GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`)

## ✅ Étape 1 : Ajouter l'URI de redirection (DÉJÀ FAIT ✅)

Vous avez déjà ajouté l'URI de redirection dans **Credentials** → **OAuth 2.0 Client ID** → **Authorized redirect URIs** :

```
https://votre-domaine.com/api/health/sync/google-fit/callback
```

ou pour le développement :

```
http://localhost:3000/api/health/sync/google-fit/callback
```

✅ **C'est bon !** Cette étape est complète.

## 🔧 Étape 2 : Activer l'API Google Fitness

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Allez dans **APIs & Services** → **Library** (ou utilisez ce lien direct : [Activer Fitness API](https://console.cloud.google.com/apis/library/fitness.googleapis.com))
4. Recherchez **"Fitness API"** ou **"Google Fitness API"**
5. Cliquez sur **Enable** (Activer)
6. ⚠️ **Attendez quelques minutes** après l'activation pour que les changements se propagent

## 🔐 Étape 3 : Ajouter les scopes fitness dans OAuth Consent Screen

**⚠️ IMPORTANT : Cette étape est OBLIGATOIRE !**

1. Dans Google Cloud Console, allez dans **APIs & Services** → **OAuth consent screen**
2. Si vous n'avez pas encore configuré l'écran de consentement, suivez d'abord le guide [google-calendar-setup.md](./google-calendar-setup.md)

3. **Si l'écran de consentement existe déjà** :

   - Cliquez sur **Edit App** (Modifier l'application)
   - Allez à l'onglet **Scopes** (ou cliquez sur **"Add or Remove Scopes"**)
   - Cliquez sur **"Add or Remove Scopes"**

4. Dans la fenêtre qui s'ouvre, recherchez et ajoutez les scopes suivants :

   ```
   https://www.googleapis.com/auth/fitness.activity.read
   https://www.googleapis.com/auth/fitness.heart_rate.read
   https://www.googleapis.com/auth/fitness.sleep.read
   https://www.googleapis.com/auth/fitness.body.read
   https://www.googleapis.com/auth/fitness.location.read
   ```

5. **Méthode rapide** : Dans la barre de recherche, tapez "fitness" et cochez tous les scopes qui commencent par `https://www.googleapis.com/auth/fitness`

6. Cliquez sur **Update** (Mettre à jour)

7. Cliquez sur **Save and Continue** (Enregistrer et continuer)

8. Si vous êtes en mode **Testing** (Test), vous devrez peut-être :
   - Ajouter vos utilisateurs de test (si ce n'est pas déjà fait)
   - Cliquez sur **Save and Continue** jusqu'à la fin

## 📝 Étape 4 : Vérifier la configuration complète

Vérifiez que vous avez :

✅ **URI de redirection** ajoutée dans Credentials (déjà fait)

- `http://localhost:3000/api/health/sync/google-fit/callback` (dev)
- `https://votre-domaine.com/api/health/sync/google-fit/callback` (prod)

✅ **Fitness API** activée dans Library

✅ **Scopes fitness** ajoutés dans OAuth consent screen

## ✅ Étape 5 : Tester la connexion

1. Dans Synexa, allez dans **Profil** → Section **Synchronisation des métriques**
2. Cliquez sur **Connecter** à côté de **Google Fit**
3. Vous devriez voir une page Google demandant l'autorisation avec les nouveaux scopes fitness
4. Autorisez l'accès
5. Vous serez redirigé vers Synexa avec votre compte connecté

## 🔍 Vérification des scopes

Pour vérifier que les scopes sont bien configurés, vous pouvez :

1. Aller dans **APIs & Services** → **OAuth consent screen**
2. Cliquez sur **Edit App**
3. Allez à l'onglet **Scopes**
4. Vous devriez voir tous les scopes fitness listés :
   - `fitness.activity.read`
   - `fitness.heart_rate.read`
   - `fitness.sleep.read`
   - `fitness.body.read`
   - `fitness.location.read`

## ⚠️ Dépannage

### Les scopes n'apparaissent pas dans la liste

- Assurez-vous d'avoir activé **Fitness API** (Étape 2)
- Attendez quelques minutes après l'activation
- Rafraîchissez la page

### Erreur "Access blocked: This app's request is invalid"

- Vérifiez que tous les scopes sont bien ajoutés dans OAuth consent screen
- Vérifiez que Fitness API est activée
- Assurez-vous que l'application est en mode "Testing" ou "In production"
- Vérifiez que l'URI de redirection est correcte

### Erreur "redirect_uri_mismatch"

- Vérifiez que l'URI de redirection dans Credentials correspond exactement à celle utilisée
- Pour le développement : `http://localhost:3000/api/health/sync/google-fit/callback`
- Pour la production : `https://votre-domaine.com/api/health/sync/google-fit/callback`
- Les URIs sont sensibles à la casse et aux trailing slashes

### Le token ne fonctionne pas

- Les utilisateurs doivent **ré-autoriser** l'application après l'ajout des scopes
- Si vous avez déjà connecté Google Calendar, vous devrez peut-être reconnecter pour obtenir les nouveaux scopes
- Supprimez l'ancienne connexion et reconnectez

### Les données ne se synchronisent pas

- Vérifiez que votre montre Android/Wear OS est bien connectée à Google Fit
- Vérifiez que Google Fit a des données (ouvrez l'app Google Fit sur votre téléphone)
- Essayez une synchronisation manuelle depuis Synexa

## 📱 Scopes détaillés

| Scope                     | Description                      | Données accessibles      |
| ------------------------- | -------------------------------- | ------------------------ |
| `fitness.activity.read`   | Lire les données d'activité      | Pas, calories, distance  |
| `fitness.heart_rate.read` | Lire la fréquence cardiaque      | BPM, mesures cardiaques  |
| `fitness.sleep.read`      | Lire les données de sommeil      | Durée, phases de sommeil |
| `fitness.body.read`       | Lire les données corporelles     | Poids, IMC, masse grasse |
| `fitness.location.read`   | Lire les données de localisation | GPS des activités        |

## 🔄 Mise à jour des scopes existants

Si vous avez déjà une application OAuth configurée :

1. Les nouveaux scopes seront automatiquement disponibles après l'ajout
2. Les utilisateurs existants devront **ré-autoriser** l'application pour obtenir les nouveaux scopes
3. Pour forcer la ré-autorisation, supprimez leur connexion et demandez-leur de reconnecter

## 📚 Ressources

- [Documentation Google Fitness API](https://developers.google.com/fit/rest)
- [Google OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)
- [Guide Google Calendar Setup](./google-calendar-setup.md) (pour la configuration OAuth de base)
