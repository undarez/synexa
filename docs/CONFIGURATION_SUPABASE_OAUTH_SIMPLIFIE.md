# ✅ Configuration Supabase OAuth Simplifiée

## 🎯 Principe : Supabase gère tout automatiquement

Avec Supabase Auth, **vous n'avez PAS besoin de route `/auth/callback` personnalisée**. Supabase gère automatiquement le callback OAuth. Il vous suffit de :

1. Utiliser `supabase.auth.signInWithOAuth()` avec `redirectTo: window.location.origin`
2. Récupérer la session avec `supabase.auth.getSession()` après redirection
3. C'est tout ! 🎉

## 📋 Configuration Supabase Dashboard

### Étape 1 : URL Configuration dans Supabase Dashboard

1. Allez sur [supabase.com](https://supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Authentication** → **URL Configuration**
4. Dans **"Site URL"**, mettez : `http://localhost:3000` (ou votre URL de production)
5. Dans **"Redirect URLs"**, ajoutez **EXACTEMENT** :

**Pour le développement local :**
```
http://localhost:3000
```

**Pour la production (si applicable) :**
```
https://votre-domaine.com
```

⚠️ **IMPORTANT :**
- ❌ **NE PAS** utiliser `/auth/callback` dans l'URL de redirection
- ✅ Utiliser directement `http://localhost:3000` (ou votre domaine de production)
- Supabase gère automatiquement le callback et redirige vers votre application

### Étape 2 : Vérifier Google OAuth Provider

1. Allez dans **Authentication** → **Providers** → **Google**
2. Vérifiez que :
   - ✅ Google est **activé** (toggle ON)
   - ✅ **Client ID (for OAuth)** est rempli
   - ✅ **Client Secret (for OAuth)** est rempli
3. Cliquez sur **"Save"**

### Étape 3 : URL de redirection dans Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Cliquez sur votre **OAuth 2.0 Client ID**
4. Dans **"URI de redirection autorisés"**, vous devez avoir :

```
https://[votre-project-id].supabase.co/auth/v1/callback
```

⚠️ **IMPORTANT :**
- ✅ **AJOUTER** l'URL Supabase : `https://[project-id].supabase.co/auth/v1/callback`
- ❌ **NE PAS** ajouter `http://localhost:3000` dans Google Console
- Supabase utilise son propre endpoint de callback qui redirige ensuite vers votre application

**Pour trouver votre project-id :**
1. Allez dans Supabase Dashboard → Settings → API
2. Votre project-id est dans l'URL : `https://[project-id].supabase.co`

## 💻 Code Application (Next.js)

### Connexion Google (use-auth.ts)

```typescript
const signInWithGoogle = async () => {
  const supabase = getBrowserClient();
  const redirectUrl = window.location.origin; // Pas /auth/callback !

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl, // Redirige vers http://localhost:3000
    },
  });

  if (error) {
    throw error;
  }

  // La redirection vers Google se fait automatiquement via data.url
  // Supabase gère tout le reste automatiquement
};
```

### Récupération de la session

```typescript
// Dans votre composant (après redirection OAuth)
const { data: { session } } = await supabase.auth.getSession();

if (session && session.user) {
  // Utilisateur connecté !
  // Synchroniser avec la table User si nécessaire
}
```

### Client Supabase Browser (client-browser.ts)

```typescript
export function createBrowserClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // ✅ Détecte automatiquement la session dans l'URL après OAuth
    },
  });
}
```

## 🔄 Flux OAuth Simplifié

1. **Utilisateur clique sur "Se connecter avec Google"**
   - Appelle `signInWithGoogle()`
   - Redirige vers Google OAuth

2. **Google redirige vers Supabase**
   - `https://[project-id].supabase.co/auth/v1/callback`
   - Supabase échange le code contre une session

3. **Supabase redirige vers votre application**
   - `http://localhost:3000` (avec la session dans l'URL)
   - Le client Supabase avec `detectSessionInUrl: true` détecte automatiquement la session

4. **Votre application récupère la session**
   - `supabase.auth.getSession()` retourne la session
   - Synchroniser l'utilisateur avec la table User si nécessaire
   - Rediriger vers `/dashboard`

## ✅ Checklist de Configuration

- [ ] **Site URL** dans Supabase Dashboard : `http://localhost:3000`
- [ ] **Redirect URLs** dans Supabase Dashboard : `http://localhost:3000` (pas `/auth/callback`)
- [ ] **Google OAuth activé** dans Supabase Dashboard (Providers → Google)
- [ ] **Client ID et Secret Google** remplis dans Supabase Dashboard
- [ ] **URL de redirection dans Google Cloud Console** : `https://[project-id].supabase.co/auth/v1/callback`
- [ ] **Variables d'environnement** configurées : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] **Code application** utilise `redirectTo: window.location.origin` (pas `/auth/callback`)
- [ ] **Client Supabase** configuré avec `detectSessionInUrl: true`
- [ ] **Composant AuthSyncHandler** intégré dans la page d'accueil pour synchroniser l'utilisateur après OAuth

## 🐛 Problèmes Courants

### ❌ Erreur : `no_code` ou `no_session`

**Cause :** L'URL de redirection dans Supabase Dashboard ne correspond pas à celle utilisée dans le code.

**Solution :**
1. Vérifier que l'URL de redirection dans Supabase Dashboard est **exactement** `http://localhost:3000` (pas `/auth/callback`)
2. Vérifier que le code utilise `redirectTo: window.location.origin`
3. Redémarrer le serveur après modifications

### ❌ Google OAuth ne fonctionne pas

**Cause :** Google OAuth n'est pas activé dans Supabase Dashboard ou les credentials sont incorrects.

**Solution :**
1. Vérifier que Google est activé dans Supabase Dashboard (Providers → Google)
2. Vérifier que Client ID et Secret sont remplis
3. Vérifier que l'URL de redirection dans Google Cloud Console est correcte (`https://[project-id].supabase.co/auth/v1/callback`)

### ❌ Session non détectée après OAuth

**Cause :** Le client Supabase n'est pas configuré avec `detectSessionInUrl: true`.

**Solution :**
1. Vérifier que `createBrowserClient()` utilise `detectSessionInUrl: true`
2. Attendre un peu après la redirection OAuth (500ms) pour que Supabase détecte la session
3. Utiliser `getSession()` pour récupérer la session après redirection

## 📝 Résumé

**Avec Supabase Auth, vous n'avez PAS besoin de :**
- ❌ Route `/auth/callback` personnalisée
- ❌ Gestion manuelle du code OAuth
- ❌ Appel à `exchangeCodeForSession()` manuel
- ❌ Page de callback personnalisée

**Vous avez seulement besoin de :**
- ✅ `signInWithOAuth()` avec `redirectTo: window.location.origin`
- ✅ `getSession()` pour récupérer la session après redirection
- ✅ `detectSessionInUrl: true` dans la configuration du client Supabase
- ✅ Un composant pour synchroniser l'utilisateur avec la table User après OAuth (optionnel)

**C'est tout ! 🎉**
