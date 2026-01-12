# ✅ Vérification de la configuration OAuth Callback

## 📋 Configuration actuelle

D'après les captures d'écran :

### ✅ URL Configuration (CORRECT)
- **Site URL** : `http://localhost:3000` ✅
- **Redirect URLs** : `http://localhost:3000/auth/callback` ✅

### ✅ Utilisateur existant
- **Email** : `fortuna77320@gmail.com` ✅
- **UID** : `7bf644a2-d641-489d-87ec-bc66321a8f60` ✅

## 🔍 Vérifications nécessaires

### 1. Vérifier Google OAuth Provider dans Supabase Dashboard

**⚠️ CRITIQUE : Cette étape est essentielle !**

1. Allez dans **Authentication** → **Providers** → **Google**
2. Vérifiez que :
   - ✅ **Google est activé** (toggle ON)
   - ✅ **Client ID (for OAuth)** est rempli (commence par `...googleusercontent.com`)
   - ✅ **Client Secret (for OAuth)** est rempli (longue chaîne de caractères)
   - ✅ Cliquez sur **"Save"** après vérification

**Si Google n'est pas activé ou si les credentials sont vides, le callback ne fonctionnera pas !**

### 2. Vérifier les logs dans la console du navigateur

**⚠️ IMPORTANT : Ouvrez la console du navigateur (F12) avant de tester**

1. Allez sur `http://localhost:3000/auth/signin`
2. Ouvrez la console du navigateur (F12) → Onglet "Console"
3. Cliquez sur "Se connecter avec Google"
4. Regardez les logs :

**Si tout fonctionne, vous devriez voir :**
```
[useAuth] Redirection OAuth vers: http://localhost:3000/auth/callback
[useAuth] Redirection vers Google OAuth: https://accounts.google.com/...
```

**Puis après la redirection Google :**
```
═══════════════════════════════════════════
[Auth Callback] 🔍 DIAGNOSTIC COMPLET
═══════════════════════════════════════════
[Auth Callback] URL complète: http://localhost:3000/auth/callback?code=...
[Auth Callback] Code (query): ... (présent)
```

**Si vous voyez `Code (query): ❌ Absent` :**
- Google OAuth n'est peut-être pas activé dans Supabase Dashboard
- Ou les credentials Google sont incorrects

### 3. Vérifier l'URL de redirection dans Google Cloud Console

**⚠️ IMPORTANT : Pour Supabase OAuth, vous devez configurer l'URL Supabase, PAS votre URL locale !**

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Cliquez sur votre **OAuth 2.0 Client ID**
4. Dans **"URI de redirection autorisés"**, vous devez avoir :

```
https://[votre-project-id].supabase.co/auth/v1/callback
```

**⚠️ REMARQUE IMPORTANTE :**
- ❌ **NE PAS** ajouter `http://localhost:3000/auth/callback` dans Google Console
- ✅ **AJOUTER** l'URL Supabase : `https://[project-id].supabase.co/auth/v1/callback`
- Supabase gère automatiquement la redirection vers votre application locale

**Pour trouver votre project-id :**
1. Allez dans Supabase Dashboard → Settings → API
2. Votre project-id est dans l'URL : `https://[project-id].supabase.co`

### 4. Test du flux complet

**Après vérification de toutes les configurations :**

1. **Redémarrer le serveur** : `npm run dev`
2. **Vider le cache du navigateur** : Ctrl+Shift+R (Windows/Linux) ou Cmd+Shift+R (Mac)
3. **Ouvrir la console** : F12 → Onglet "Console"
4. **Aller sur** : `http://localhost:3000/auth/signin`
5. **Cliquer sur** : "Se connecter avec Google"
6. **Vérifier les logs** dans la console
7. **Vérifier que vous êtes redirigé** vers `/dashboard` après connexion

## 🐛 Problèmes courants

### Problème : `Code (query): ❌ Absent` après redirection Google

**Causes possibles :**
1. ❌ Google OAuth n'est pas activé dans Supabase Dashboard
2. ❌ Client ID ou Secret Google incorrects dans Supabase Dashboard
3. ❌ URL de redirection dans Google Cloud Console incorrecte (doit être l'URL Supabase)
4. ❌ L'URL de redirection dans Supabase Dashboard ne correspond pas exactement

**Solution :**
1. Vérifier que Google est activé dans Supabase Dashboard → Providers → Google
2. Vérifier les credentials Google dans Supabase Dashboard
3. Vérifier l'URL de redirection dans Google Cloud Console (doit être `https://[project-id].supabase.co/auth/v1/callback`)
4. Vérifier que l'URL de redirection dans Supabase Dashboard est exactement `http://localhost:3000/auth/callback`

### Problème : `exchange_error` après réception du code

**Causes possibles :**
1. ❌ Variables d'environnement manquantes (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
2. ❌ Code OAuth expiré (trop de temps entre la génération et l'échange)

**Solution :**
1. Vérifier les variables d'environnement dans `.env.local`
2. Réessayer immédiatement après la génération du code

### Problème : `no_session` après échange du code

**Causes possibles :**
1. ❌ Code OAuth invalide ou expiré
2. ❌ Variables d'environnement incorrectes
3. ❌ Problème de permissions RLS dans Supabase

**Solution :**
1. Vérifier les logs complets dans la console
2. Vérifier les variables d'environnement
3. Vérifier les politiques RLS dans Supabase Dashboard

## 📝 Checklist finale

- [ ] Google OAuth activé dans Supabase Dashboard (Authentication → Providers → Google)
- [ ] Client ID Google rempli dans Supabase Dashboard
- [ ] Client Secret Google rempli dans Supabase Dashboard
- [ ] URL de redirection dans Supabase Dashboard : `http://localhost:3000/auth/callback`
- [ ] URL de redirection dans Google Cloud Console : `https://[project-id].supabase.co/auth/v1/callback`
- [ ] Variables d'environnement configurées : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Serveur redémarré après modifications
- [ ] Cache du navigateur vidé
- [ ] Console du navigateur ouverte pour voir les logs
- [ ] Test effectué avec les logs visibles
