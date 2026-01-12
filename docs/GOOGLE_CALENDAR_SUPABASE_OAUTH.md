# 📅 Google Calendar avec Supabase OAuth - Guide Complet

## 🎯 Objectif

Ajouter l'accès à **Google Calendar** après avoir configuré l'authentification Google via Supabase. Ce guide explique comment :

1. ✅ Demander les scopes Google Calendar lors de la connexion OAuth
2. ✅ Obtenir un `refresh_token` pour renouveler les tokens
3. ✅ Récupérer `provider_token` et `provider_refresh_token` depuis la session Supabase
4. ✅ Utiliser ces tokens pour appeler l'API Google Calendar

## 🔍 Pourquoi Supabase Dashboard ne propose PAS de champ "scopes" ?

**Réponse courte :** Les scopes Google sont configurés **dans votre code**, pas dans le Dashboard Supabase.

**Explication :**
- Supabase Dashboard gère uniquement les **credentials OAuth** (Client ID, Client Secret)
- Les **scopes** sont des paramètres de requête OAuth qui varient selon vos besoins
- Chaque application peut demander des scopes différents selon le contexte
- C'est pourquoi Supabase vous permet de les spécifier dans `signInWithOAuth()`

**Conclusion :** C'est normal et correct ! Vous devez configurer les scopes dans votre code.

## 📋 Configuration OAuth Google

### 1. Configuration dans Supabase Dashboard

Dans **Authentication → Providers → Google**, vous devez avoir :
- ✅ Google activé (toggle ON)
- ✅ **Client ID (for OAuth)** : `...googleusercontent.com`
- ✅ **Client Secret (for OAuth)** : `...` (longue chaîne)

### 2. Configuration dans Google Cloud Console

Dans **APIs & Services → Credentials → OAuth 2.0 Client ID** :
- ✅ **URI de redirection autorisés** : `https://[project-id].supabase.co/auth/v1/callback`
- ✅ **API activée** : Google Calendar API doit être activée dans votre projet Google Cloud

**⚠️ IMPORTANT :** Activez "Google Calendar API" dans Google Cloud Console :
1. Allez dans **APIs & Services → Library**
2. Recherchez "Google Calendar API"
3. Cliquez sur **"Enable"**

## 💻 Code Application

### 1. Fonction de connexion avec scopes Calendar

**Fichier : `app/lib/auth/use-auth.ts`**

```typescript
const signInWithGoogle = async () => {
  const supabase = getBrowserClient();
  const redirectUrl = window.location.origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      // 🔥 Scopes Google Calendar
      scopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar", // Accès Calendar
      ].join(" "),
      // 🔥 QueryParams pour obtenir refresh_token
      queryParams: {
        access_type: "offline", // OBLIGATOIRE pour refresh_token
        prompt: "consent", // OBLIGATOIRE pour forcer le consentement
      },
    },
  });

  if (error) {
    throw error;
  }
  // Redirection automatique vers Google
};
```

### 2. Récupération des tokens depuis la session

**Fichier : `app/lib/auth/use-auth.ts`**

```typescript
supabase.auth.onAuthStateChange((event, newSession) => {
  if (event === 'SIGNED_IN' && newSession) {
    // ✅ Tokens Google disponibles
    const googleAccessToken = newSession.provider_token; // Access token Google
    const googleRefreshToken = newSession.provider_refresh_token; // Refresh token Google
    
    // ✅ Token Supabase (pour authentification Supabase)
    const supabaseAccessToken = newSession.access_token;
  }
});
```

### 3. Composant pour afficher les tokens (développement)

**Fichier : `app/components/auth/GoogleTokensDisplay.tsx`**

Ce composant affiche les tokens après connexion pour vérification (mode développement uniquement).

**Utilisation :**
```tsx
import { GoogleTokensDisplay } from "@/app/components/auth/GoogleTokensDisplay";

// Dans votre page de connexion ou dashboard
<GoogleTokensDisplay />
```

## 🔑 Utilisation des tokens Google Calendar

### 1. Appel API Google Calendar avec provider_token

```typescript
import { getBrowserClient } from "@/app/lib/supabase/client-browser";

async function getGoogleCalendarEvents() {
  const supabase = getBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.provider_token) {
    throw new Error("Token Google non disponible");
  }

  // Appel API Google Calendar
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Erreur Google Calendar API: ${response.statusText}`);
  }

  const events = await response.json();
  return events.items;
}
```

### 2. Rafraîchir le token Google (si expiré)

```typescript
async function refreshGoogleToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Erreur lors du rafraîchissement du token");
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}
```

**⚠️ IMPORTANT :** Ne stockez JAMAIS `GOOGLE_CLIENT_SECRET` dans le client ! Utilisez une route API pour rafraîchir le token :

```typescript
// app/api/google-calendar/refresh-token/route.ts
export async function POST(request: NextRequest) {
  const { refreshToken } = await request.json();
  
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!, // ✅ Secret côté serveur uniquement
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  return NextResponse.json(await response.json());
}
```

## ✅ Vérification Post-Login

### 1. Logs de développement

Après connexion Google, vous devriez voir dans la console :

```
[useAuth] Événement auth: SIGNED_IN
[useAuth] ✅ Connexion réussie - Tokens Google :
[useAuth]   - provider_token: ya29.a0AfH6SM... ✅ Présent
[useAuth]   - provider_refresh_token: 1//0g... ✅ Présent
[useAuth]   - access_token: eyJhbGc... ✅ Présent
```

### 2. Vérification dans l'UI (mode développement)

Le composant `GoogleTokensDisplay` affiche automatiquement :
- ✅ `provider_token` (Google Access Token)
- ✅ `provider_refresh_token` (Google Refresh Token)
- ✅ Statut de présence pour chaque token

## 🐛 Erreurs Courantes et Solutions

### ❌ Erreur : `provider_token` absent après connexion

**Cause :** Les scopes ne sont pas correctement configurés.

**Solution :**
1. Vérifiez que `scopes` inclut `"https://www.googleapis.com/auth/calendar"`
2. Vérifiez que Google Calendar API est activée dans Google Cloud Console
3. Réessayez la connexion (déconnectez-vous d'abord)

### ❌ Erreur : `provider_refresh_token` absent

**Cause :** `access_type=offline` ou `prompt=consent` manquants.

**Solution :**
```typescript
queryParams: {
  access_type: "offline", // ✅ OBLIGATOIRE
  prompt: "consent", // ✅ OBLIGATOIRE
}
```

**Note :** Si l'utilisateur s'est déjà connecté précédemment sans `prompt=consent`, il faut :
1. Se déconnecter complètement de Google
2. Réessayer avec `prompt=consent`

### ❌ Erreur : `401 Unauthorized` lors de l'appel Google Calendar API

**Cause :** Le `provider_token` est expiré ou invalide.

**Solution :**
1. Vérifiez que le token n'est pas expiré
2. Utilisez `provider_refresh_token` pour obtenir un nouveau token
3. Vérifiez que les scopes Calendar sont bien présents

### ❌ Erreur : `403 Forbidden` lors de l'appel Google Calendar API

**Cause :** Google Calendar API n'est pas activée dans Google Cloud Console.

**Solution :**
1. Allez dans Google Cloud Console → APIs & Services → Library
2. Recherchez "Google Calendar API"
3. Cliquez sur "Enable"

## 📊 Architecture Complète

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Utilisateur clique sur "Se connecter avec Google"       │
│    → signInWithOAuth() avec scopes Calendar                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Google OAuth (avec prompt=consent)                      │
│    → Demande consentement pour Calendar                     │
│    → Retourne code + refresh_token                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Supabase échange code contre tokens                      │
│    → Stocke provider_token (Google Access Token)            │
│    → Stocke provider_refresh_token (Google Refresh Token)   │
│    → Crée session Supabase                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Application récupère tokens via session                  │
│    → session.provider_token → Appels API Google Calendar    │
│    → session.provider_refresh_token → Rafraîchissement      │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Sécurité

### ✅ Bonnes Pratiques

1. **Ne JAMAIS exposer `GOOGLE_CLIENT_SECRET` côté client**
   - Utilisez des routes API pour rafraîchir les tokens
   - Stockez les secrets dans `.env.local` (pas de `NEXT_PUBLIC_`)

2. **Ne JAMAIS stocker les tokens dans localStorage non chiffré**
   - Supabase gère automatiquement le stockage sécurisé
   - Utilisez `session.provider_token` au lieu de stocker manuellement

3. **Rafraîchir les tokens avant expiration**
   - Les tokens Google expirent après 1 heure
   - Utilisez `provider_refresh_token` pour obtenir un nouveau token

4. **Ne JAMAIS afficher les tokens en production**
   - Le composant `GoogleTokensDisplay` est automatiquement caché en production
   - Ne loggez jamais les tokens complets

## 📝 Checklist Finale

- [x] Google Calendar API activée dans Google Cloud Console
- [x] Scopes Calendar ajoutés dans `signInWithOAuth()`
- [x] `access_type=offline` dans queryParams
- [x] `prompt=consent` dans queryParams
- [x] Composant `GoogleTokensDisplay` intégré (développement)
- [x] Vérification des tokens après connexion (logs + UI)
- [x] Route API pour rafraîchir les tokens (si nécessaire)
- [x] Code d'appel Google Calendar API prêt

## 🎉 Résultat Attendu

Après connexion Google avec les scopes Calendar :

✅ **Session Supabase créée** avec :
- `session.provider_token` → Token Google pour Calendar API
- `session.provider_refresh_token` → Token pour renouveler l'access token
- `session.access_token` → Token Supabase (pour authentification Supabase)

✅ **Vous pouvez maintenant** :
- Appeler l'API Google Calendar avec `provider_token`
- Lire les événements du calendrier
- Créer/modifier/supprimer des événements
- Rafraîchir le token quand il expire

## 📚 Ressources

- [Supabase Auth - OAuth Providers](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api/v3/reference)
- [Google OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes#calendar)
