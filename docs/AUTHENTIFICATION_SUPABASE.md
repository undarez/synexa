# 🔐 Authentification Supabase - Documentation

## ✅ Implémentation complète

L'authentification Google via Supabase Auth a été entièrement implémentée et remplace l'ancien système mock.

## 📁 Fichiers créés/modifiés

### Nouveaux fichiers

1. **`app/lib/supabase/client-browser.ts`**
   - Client Supabase dédié au navigateur
   - Singleton pour éviter les duplications
   - Configuration optimale pour l'authentification (persistSession, autoRefreshToken, detectSessionInUrl)

2. **`app/lib/auth/use-auth.ts`**
   - Hook React `useAuth()` pour gérer l'authentification
   - Écoute les changements de session Supabase
   - Méthodes `signInWithGoogle()` et `signOut()`
   - Retourne `user`, `session`, `loading`

3. **`app/api/auth/callback/route.ts`**
   - Route de callback OAuth Supabase
   - Échange le code d'autorisation contre une session
   - Gère les erreurs OAuth
   - Redirige vers le dashboard après authentification

4. **`app/components/auth/SignInButton.tsx`**
   - Composant bouton de connexion Google
   - Gère les états de chargement
   - Design cohérent avec l'application

### Fichiers modifiés

1. **`app/components/Navigation.tsx`**
   - Remplace `useSession` (mock) par `useAuth` (Supabase)
   - Affiche les boutons de connexion si non connecté
   - Affiche l'avatar et le menu utilisateur si connecté
   - Gère la déconnexion

2. **`app/auth/signin/page.tsx`**
   - Utilise `useAuth` au lieu de `useSession`
   - Affiche les erreurs d'authentification
   - Redirige automatiquement si déjà connecté

## 🔄 Flux d'authentification

1. **Utilisateur clique sur "Se connecter avec Google"**
   - Appelle `signInWithGoogle()` depuis `useAuth`
   - Redirige vers Google OAuth via Supabase

2. **Google redirige vers `/api/auth/callback?code=...`**
   - La route callback échange le code contre une session
   - Redirige vers `/dashboard` (ou page demandée)

3. **Le client Supabase détecte la session**
   - `detectSessionInUrl: true` dans la config
   - La session est automatiquement stockée localement
   - `useAuth` détecte le changement et met à jour l'UI

4. **L'utilisateur voit son état connecté**
   - Avatar et email dans le header
   - Menu utilisateur avec profil et déconnexion

## 🔧 Configuration requise

### Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Configuration Supabase Dashboard

1. Aller dans **Authentication** → **Providers**
2. Activer **Google**
3. Configurer les credentials Google (Client ID et Secret)
4. Ajouter l'URL de redirection : `https://votre-domaine.com/api/auth/callback`

## 🎯 Utilisation

### Dans un composant

```tsx
"use client";

import { useAuth } from "@/app/lib/auth/use-auth";

export function MyComponent() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) return <div>Chargement...</div>;

  if (!user) {
    return <button onClick={signInWithGoogle}>Se connecter</button>;
  }

  return (
    <div>
      <p>Bonjour {user.email}</p>
      <button onClick={signOut}>Déconnexion</button>
    </div>
  );
}
```

## 🧹 Code obsolète (à nettoyer)

Les fichiers suivants peuvent être supprimés une fois que tout fonctionne :

- `app/lib/auth/mock-client.ts` (remplacé par `use-auth.ts`)
- `app/lib/auth/use-session.ts` (remplacé par `use-auth.ts`)
- `app/api/auth/[...nextauth]/` (dossier vide, peut être supprimé)
- `app/components/auth/AuthButtons.tsx` (remplacé par `SignInButton.tsx`)
- `app/components/auth/LoginModal.tsx` (non utilisé)
- `app/components/auth/RegisterModal.tsx` (non utilisé)

## ⚠️ Notes importantes

1. **Le client Supabase côté serveur** (`app/lib/supabase/client.ts`) reste inchangé et continue de fonctionner pour les opérations serveur.

2. **L'authentification mock** (`app/lib/auth/mock.ts`) est toujours utilisée pour les routes API serveur. Elle peut être remplacée progressivement par Supabase Auth côté serveur.

3. **Les cookies de session** sont gérés automatiquement par Supabase via le client browser. Pas besoin de manipulation manuelle.

4. **La redirection après OAuth** se fait automatiquement. Le client détecte le code dans l'URL et échange contre une session.

## 🐛 Dépannage

### L'utilisateur n'est pas redirigé après connexion

- Vérifier que `detectSessionInUrl: true` est dans la config du client browser
- Vérifier que l'URL de redirection est correcte dans Supabase Dashboard

### Erreur "Variables d'environnement Supabase manquantes"

- Vérifier que `.env.local` contient `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Redémarrer le serveur après modification

### La session n'est pas persistée

- Vérifier que `persistSession: true` est dans la config
- Vérifier les cookies dans les DevTools (Application → Cookies)

## ✨ Résultat final

- ✅ Connexion Google fonctionnelle via Supabase
- ✅ Boutons de connexion/déconnexion dans le header
- ✅ Gestion automatique de la session
- ✅ Redirection après authentification
- ✅ UI réactive aux changements de session
- ✅ Code propre et maintenable
