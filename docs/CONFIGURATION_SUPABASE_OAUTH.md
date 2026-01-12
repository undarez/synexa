# 🔧 Configuration Supabase OAuth - Guide de résolution

## 🔴 Problème actuel

L'erreur `no_session` signifie que le code OAuth n'est pas correctement échangé contre une session Supabase. Cela peut avoir plusieurs causes :

## ✅ Solution : Configuration Supabase Dashboard

### Étape 1 : Vérifier l'URL de redirection dans Supabase Dashboard

1. Allez sur [supabase.com](https://supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Authentication** → **URL Configuration**
4. Dans **"Redirect URLs"**, ajoutez **EXACTEMENT** ces URLs :

**Pour le développement local :**
```
http://localhost:3000/auth/callback
```

**Pour la production (si applicable) :**
```
https://votre-domaine.com/auth/callback
```

⚠️ **IMPORTANT :**
- L'URL doit correspondre **EXACTEMENT** à celle utilisée dans `use-auth.ts` (`redirectTo`)
- Pas de slash final
- Pas d'espaces
- Utilisez `http://` pour localhost, `https://` pour la production

### Étape 2 : Vérifier la configuration Google OAuth dans Supabase

1. Allez dans **Authentication** → **Providers** → **Google**
2. Vérifiez que :
   - ✅ Google est **activé**
   - ✅ **Client ID (for OAuth)** est correct
   - ✅ **Client Secret (for OAuth)** est correct
3. Cliquez sur **"Save"**

### Étape 3 : Vérifier l'URL de redirection dans Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Cliquez sur votre **OAuth 2.0 Client ID**
4. Dans **"URI de redirection autorisés"**, vous devez avoir :

**Format Supabase OAuth :**
```
https://[votre-project-id].supabase.co/auth/v1/callback
```

⚠️ **IMPORTANT :** 
- Supabase gère automatiquement la redirection OAuth
- Vous n'avez PAS besoin d'ajouter `http://localhost:3000/auth/callback` dans Google Console
- Supabase utilise son propre endpoint de callback qui redirige ensuite vers votre application

## 🔍 Diagnostic

### Étape 1 : Vérifier les logs dans la console du navigateur

**⚠️ IMPORTANT : Ouvrez la console du navigateur (F12) avant de cliquer sur "Se connecter avec Google"**

Quand vous cliquez sur "Se connecter avec Google", vous devriez voir dans la console :

```
═══════════════════════════════════════════
[Auth Callback] 🔍 DIAGNOSTIC COMPLET
═══════════════════════════════════════════
[Auth Callback] URL complète: http://localhost:3000/auth/callback?code=...
[Auth Callback] Pathname: /auth/callback
[Auth Callback] Search: ?code=...
[Auth Callback] Hash: 
[Auth Callback] Code (query): ... (présent)
[Auth Callback] Code (hash): ❌ Absent
[Auth Callback] Access Token (hash): ❌ Absent
```

**Si vous voyez `Code (query): ❌ Absent` et `Code (hash): ❌ Absent`**, cela signifie que :

1. ❌ L'URL de redirection dans Supabase Dashboard n'est **PAS** configurée
2. ❌ Ou elle ne correspond **PAS EXACTEMENT** à `http://localhost:3000/auth/callback`
3. ❌ Ou Google OAuth n'est pas correctement configuré dans Supabase Dashboard

### Étape 2 : Vérifier l'URL de redirection dans Supabase Dashboard

**⚠️ CRITIQUE : Cette URL doit correspondre EXACTEMENT (caractère par caractère)**

1. Allez sur [supabase.com](https://supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Authentication** → **URL Configuration**
4. Dans **"Redirect URLs"**, vous devez avoir **EXACTEMENT** :

```
http://localhost:3000/auth/callback
```

**⚠️ Vérifiez :**
- ✅ Pas de slash final (`/auth/callback` et PAS `/auth/callback/`)
- ✅ Pas d'espaces avant ou après
- ✅ Utilisez `http://` (et PAS `https://`) pour localhost
- ✅ Port `3000` (ou le port que vous utilisez)
- ✅ Chemin `/auth/callback` (et PAS `/api/auth/callback`)

### Étape 3 : Vérifier Google OAuth dans Supabase Dashboard

1. Allez dans **Authentication** → **Providers** → **Google**
2. Vérifiez que :
   - ✅ Google est **activé** (toggle ON)
   - ✅ **Client ID (for OAuth)** est rempli (commence par `...googleusercontent.com`)
   - ✅ **Client Secret (for OAuth)** est rempli
3. Cliquez sur **"Save"**

**⚠️ Si vous modifiez ces paramètres, attendez 1-2 minutes avant de tester à nouveau**

## 🐛 Erreurs courantes

### Erreur : "no_code"
- **Cause** : Le code OAuth n'est pas dans l'URL
- **Solution** : Vérifier que l'URL de redirection dans Supabase Dashboard correspond exactement à celle utilisée dans le code

### Erreur : "exchange_error"
- **Cause** : Le code OAuth n'a pas pu être échangé contre une session
- **Solution** : Vérifier les variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### Erreur : "no_session"
- **Cause** : Aucune session créée après l'échange du code
- **Solution** : Vérifier que le code a bien été échangé (voir les logs dans la console)

## 📝 Checklist de vérification

- [ ] Google OAuth activé dans Supabase Dashboard
- [ ] Client ID et Secret Google corrects dans Supabase Dashboard
- [ ] URL de redirection dans Supabase Dashboard : `http://localhost:3000/auth/callback`
- [ ] Variables d'environnement configurées : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] URL de redirection dans Google Cloud Console : `https://[project-id].supabase.co/auth/v1/callback`
- [ ] Redémarrer le serveur de développement après modification

## 🔄 Après configuration

1. **Redémarrer le serveur** : `npm run dev`
2. **Vider le cache du navigateur** : Ctrl+Shift+R (Windows/Linux) ou Cmd+Shift+R (Mac)
3. **Ouvrir la console du navigateur** (F12) → Onglet "Console"
4. **Tester la connexion Google** en cliquant sur "Se connecter avec Google"
5. **Vérifier les logs dans la console** :
   - Si vous voyez `Code (query): ...` → ✅ C'est bon, le code est présent
   - Si vous voyez `Code (query): ❌ Absent` → ❌ Vérifiez l'URL de redirection dans Supabase Dashboard

## 🐛 Problème persistant : `no_code` après configuration

Si vous avez configuré l'URL de redirection dans Supabase Dashboard mais que vous voyez toujours `Code (query): ❌ Absent`, vérifiez :

1. **L'URL dans Supabase Dashboard correspond EXACTEMENT à celle utilisée dans le code** :
   - Code utilise : `http://localhost:3000/auth/callback`
   - Supabase Dashboard doit avoir : `http://localhost:3000/auth/callback`
   - ⚠️ Caractère par caractère, sans espaces, sans slash final

2. **Attendre 1-2 minutes après modification** dans Supabase Dashboard (temps de propagation)

3. **Vérifier que vous testez sur le bon port** :
   - Si votre serveur tourne sur `localhost:3001`, l'URL doit être `http://localhost:3001/auth/callback`
   - Modifiez l'URL dans Supabase Dashboard en conséquence

4. **Copier-coller l'URL exacte depuis la console** :
   - Dans les logs de diagnostic, vous verrez : `[Auth Callback] URL complète: ...`
   - Copiez cette URL et ajoutez-la dans Supabase Dashboard (sans les paramètres `?code=...`)

## 📞 Si le problème persiste

Si après toutes ces vérifications le code n'est toujours pas présent, partagez :
1. Les logs complets de la console (tout le bloc `DIAGNOSTIC COMPLET`)
2. Une capture d'écran de la page "URL Configuration" dans Supabase Dashboard
3. Une capture d'écran de la page "Providers → Google" dans Supabase Dashboard
