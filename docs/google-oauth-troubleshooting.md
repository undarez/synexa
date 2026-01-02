# Dépannage OAuth Google

## Erreur 403 : access_denied - "L'appli est en cours de test"

### Problème

Vous voyez ce message :
```
Accès bloqué : synexa n'a pas terminé la procédure de validation de Google
synexa n'a pas terminé la procédure de validation de Google. L'appli est en cours de test et seuls les testeurs approuvés par le développeur y ont accès.
Erreur 403 : access_denied
```

### Cause

L'application OAuth est en mode "Test" dans Google Cloud Console et votre adresse email n'est pas ajoutée comme testeur.

### Solution

#### Option 1 : Ajouter votre email comme testeur (Recommandé pour le développement)

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Allez dans **"APIs & Services"** > **"OAuth consent screen"**
4. Faites défiler jusqu'à la section **"Test users"**
5. Cliquez sur **"Add Users"**
6. Entrez votre adresse email (ex: `fortuna77320@gmail.com`)
7. Cliquez sur **"Add"**
8. Cliquez sur **"Save"**

Maintenant, vous devriez pouvoir vous connecter avec cette adresse email.

#### Option 2 : Passer en mode Production (Pour la production uniquement)

⚠️ **Attention** : Le passage en production nécessite une vérification par Google qui peut prendre plusieurs jours.

1. Allez dans **"APIs & Services"** > **"OAuth consent screen"**
2. Cliquez sur **"PUBLISH APP"**
3. Remplissez le formulaire de vérification :
   - Description de l'application
   - Domaines autorisés
   - Politique de confidentialité (requis)
   - Conditions d'utilisation (requis)
4. Soumettez pour vérification

**Note** : Pour le développement, l'Option 1 est beaucoup plus rapide et suffisante.

### Vérification

Après avoir ajouté votre email comme testeur :

1. Attendez quelques minutes (les changements peuvent prendre un peu de temps)
2. Déconnectez-vous de votre compte Google si vous êtes connecté
3. Essayez de vous connecter à nouveau depuis Synexa
4. Vous devriez voir l'écran de consentement Google demandant l'autorisation d'accéder à votre calendrier

### Autres erreurs courantes

#### "redirect_uri_mismatch"

- Vérifiez que l'URI de redirection dans Google Cloud Console correspond exactement à celui utilisé par NextAuth
- Pour le développement : `http://localhost:3000/api/auth/callback/google`
- Vérifiez qu'il n'y a pas d'espaces ou de caractères supplémentaires

#### "invalid_client"

- Vérifiez que `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans `.env.local` sont corrects
- Vérifiez qu'il n'y a pas d'espaces avant/après les valeurs

#### "access_denied" (autre cas)

- Vérifiez que l'API Google Calendar est activée dans votre projet
- Allez dans **"APIs & Services"** > **"Library"**
- Recherchez "Google Calendar API"
- Cliquez sur "Enable" si ce n'est pas déjà fait

### Liens utiles

- [Google Cloud Console](https://console.cloud.google.com/)
- [Documentation OAuth Google](https://developers.google.com/identity/protocols/oauth2)
- [Documentation Google Calendar API](https://developers.google.com/calendar/api)









