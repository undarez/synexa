# ✅ Solution définitive : Erreur "error=Callback" OAuth en production Vercel

## 🔍 Cause exacte de l'erreur "error=Callback"

L'erreur "error=Callback" dans NextAuth signifie que **le callback OAuth a échoué lors de la création de la session**. En production Vercel (HTTPS), cela est généralement causé par :

1. **Cookies non sécurisés** : Les cookies de session NextAuth doivent être `Secure` en HTTPS
2. **Callback redirect trop complexe** : Un redirect mal géré peut casser la session
3. **NEXTAUTH_URL avec slash final** : Peut causer des problèmes de correspondance d'URL

## ❌ Variables à SUPPRIMER de Vercel

**Supprimez ces variables d'environnement sur Vercel :**

1. ❌ `NEXT_PUBLIC_NEXTAUTH_URL` - **SUPPRIMER** (non utilisée par NextAuth, peut causer confusion)
2. ❌ `GOOGLE_REDIRECT_URI` - **SUPPRIMER** (NextAuth génère automatiquement l'URI basée sur NEXTAUTH_URL)
3. ❌ `GOOGLE_CALENDAR_REDIRECT_URI` - **SUPPRIMER** (si utilisée uniquement pour NextAuth, sinon garder pour Google Calendar séparé)

## ✅ Variables OBLIGATOIRES sur Vercel

**Gardez uniquement ces variables (pour Production) :**

```env
NEXTAUTH_URL=https://synexa-xi.vercel.app
NEXTAUTH_SECRET=votre_secret_ici
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
```

**⚠️ IMPORTANT :**
- `NEXTAUTH_URL` doit être **exactement** `https://synexa-xi.vercel.app` (sans slash final, sans espaces)
- Toutes les variables doivent être activées pour **"Production"** ✅
- Après modification, **REDÉPLOYEZ** l'application

## 🔧 Corrections apportées

### 1. Configuration cookies sécurisés pour HTTPS

Ajout de la configuration `cookies` dans `authOptions` pour garantir que les cookies sont sécurisés en production :

```typescript
cookies: {
  sessionToken: {
    name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
    },
  },
  // ... autres cookies
}
```

**Pourquoi :** En HTTPS, les cookies doivent avoir l'attribut `Secure` pour être transmis. Sans cela, le navigateur rejette les cookies et la session ne peut pas être créée.

### 2. Simplification du callback redirect

Le callback `redirect` a été simplifié pour éviter les problèmes de correspondance d'URL :

- Utilise directement `baseUrl` fourni par NextAuth (basé sur NEXTAUTH_URL)
- Gère correctement les URLs relatives et absolues
- Évite les manipulations complexes qui peuvent casser la session

### 3. Suppression de NEXT_PUBLIC_NEXTAUTH_URL

Référence supprimée dans `app/auth/signin/page.tsx` car cette variable n'est pas utilisée par NextAuth côté serveur.

## 📋 Configuration NextAuth finale (production-safe)

```typescript
export const authOptions: NextAuthOptions = {
  adapter: customPrismaAdapter,
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      // NextAuth génère automatiquement : ${NEXTAUTH_URL}/api/auth/callback/google
    }),
    // ... autres providers
  ],
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: { signIn: "/auth/signin" },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    // Configuration sécurisée pour HTTPS
    sessionToken: { /* ... */ },
    callbackUrl: { /* ... */ },
    csrfToken: { /* ... */ },
  },
  callbacks: {
    redirect({ url, baseUrl }) {
      // Logique simplifiée utilisant uniquement baseUrl (NEXTAUTH_URL)
    },
    // ... autres callbacks
  },
};
```

## ✅ Checklist de vérification

Avant de tester, vérifiez :

- [ ] `NEXTAUTH_URL` = `https://synexa-xi.vercel.app` (sans slash, sans espaces)
- [ ] `NEXTAUTH_SECRET` est défini et identique partout
- [ ] `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont corrects
- [ ] Toutes les variables sont pour **"Production"** ✅
- [ ] `NEXT_PUBLIC_NEXTAUTH_URL` est **SUPPRIMÉE** de Vercel
- [ ] `GOOGLE_REDIRECT_URI` est **SUPPRIMÉE** de Vercel (si elle existe)
- [ ] Dans Google Console, l'URI autorisée est : `https://synexa-xi.vercel.app/api/auth/callback/google`
- [ ] **REDÉPLOIEMENT** effectué après modifications

## 🎯 Résultat attendu

Après ces corrections :
1. ✅ Les cookies de session sont créés correctement en HTTPS
2. ✅ Le callback OAuth fonctionne sans erreur
3. ✅ La redirection après connexion fonctionne
4. ✅ Aucune erreur "error=Callback"

## 📝 Notes importantes

- **NEXTAUTH_URL est la SEULE source de vérité** pour les URLs côté serveur
- NextAuth génère automatiquement l'URI de callback : `${NEXTAUTH_URL}/api/auth/callback/google`
- Ne pas utiliser `NEXT_PUBLIC_*` pour NextAuth (c'est pour le client uniquement)
- Les cookies sécurisés sont **obligatoires** en HTTPS (Vercel)

