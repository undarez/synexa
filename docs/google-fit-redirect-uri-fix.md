# Correction de l'erreur redirect_uri_mismatch

## 🔴 Erreur rencontrée

```
Erreur 400 : redirect_uri_mismatch
Accès bloqué : la demande de cette appli n'est pas valide
```

## 🔍 Cause

L'URI de redirection dans votre code ne correspond **PAS EXACTEMENT** à celle configurée dans Google Cloud Console.

Les URIs sont **sensibles à** :
- ✅ `http://` vs `https://`
- ✅ `localhost` vs votre domaine
- ✅ Le port (`:3000` ou pas)
- ✅ Les trailing slashes (`/` à la fin)
- ✅ Les majuscules/minuscules

## ✅ Solution : Vérifier et corriger les URIs

### Étape 1 : Vérifier l'URI dans le code

L'URI utilisée par Synexa est :
```
http://localhost:3000/api/health/sync/google-fit/callback
```
ou en production :
```
https://votre-domaine.com/api/health/sync/google-fit/callback
```

### Étape 2 : Vérifier dans Google Cloud Console

1. Allez dans **APIs & Services** → **Credentials**
2. Cliquez sur votre **OAuth 2.0 Client ID** (celui de synexa-app)
3. Regardez la section **Authorized redirect URIs**
4. Vérifiez que vous avez **EXACTEMENT** :

   **Pour le développement :**
   ```
   http://localhost:3000/api/health/sync/google-fit/callback
   ```

   **Pour la production :**
   ```
   https://votre-domaine.com/api/health/sync/google-fit/callback
   ```

### Étape 3 : Erreurs courantes à éviter

❌ **FAUX** :
```
http://localhost:3000/api/health/sync/google-fit/callback/
```
(Notez le `/` à la fin - c'est différent !)

❌ **FAUX** :
```
https://localhost:3000/api/health/sync/google-fit/callback
```
(Notez le `https://` au lieu de `http://` pour localhost)

❌ **FAUX** :
```
http://localhost/api/health/sync/google-fit/callback
```
(Manque le port `:3000`)

✅ **CORRECT** :
```
http://localhost:3000/api/health/sync/google-fit/callback
```

## 🔧 Correction

### Si vous êtes en développement (localhost)

1. Dans Google Cloud Console → **Credentials** → Votre Client ID
2. Dans **Authorized redirect URIs**, ajoutez/modifiez pour avoir **EXACTEMENT** :
   ```
   http://localhost:3000/api/health/sync/google-fit/callback
   ```
3. Cliquez sur **Save**

### Si vous êtes en production

1. Vérifiez votre variable d'environnement `NEXTAUTH_URL` dans `.env` :
   ```env
   NEXTAUTH_URL=https://votre-domaine.com
   ```

2. Dans Google Cloud Console → **Credentials** → Votre Client ID
3. Dans **Authorized redirect URIs**, ajoutez/modifiez pour avoir **EXACTEMENT** :
   ```
   https://votre-domaine.com/api/health/sync/google-fit/callback
   ```
   (Remplacez `votre-domaine.com` par votre vrai domaine)

4. Cliquez sur **Save**

## 📋 Checklist de vérification

Avant de réessayer, vérifiez :

- [ ] L'URI dans Google Cloud Console correspond **EXACTEMENT** à celle du code
- [ ] Pas de trailing slash (`/`) à la fin
- [ ] `http://` pour localhost, `https://` pour production
- [ ] Le port `:3000` est présent pour localhost
- [ ] Le chemin est `/api/health/sync/google-fit/callback` (pas `/callback/`)

## 🔄 Après correction

1. **Attendez 1-2 minutes** après avoir sauvegardé dans Google Cloud Console
2. **Videz le cache** de votre navigateur (Ctrl+Shift+Delete)
3. **Réessayez** la connexion depuis Synexa

## 🐛 Si ça ne fonctionne toujours pas

### Vérifier les variables d'environnement

Vérifiez votre fichier `.env` :

```env
NEXTAUTH_URL=http://localhost:3000
# ou en production :
# NEXTAUTH_URL=https://votre-domaine.com
```

### Vérifier dans les logs

Regardez les logs de votre serveur Next.js pour voir quelle URI est réellement utilisée.

### Tester avec curl

Vous pouvez tester l'URI directement :

```bash
# Vérifier que l'endpoint existe
curl http://localhost:3000/api/health/sync/google-fit/callback
```

## 📚 Ressources

- [Google OAuth redirect_uri_mismatch](https://developers.google.com/identity/protocols/oauth2/policies#uri-validation)
- [Documentation Google OAuth](https://developers.google.com/identity/protocols/oauth2)






