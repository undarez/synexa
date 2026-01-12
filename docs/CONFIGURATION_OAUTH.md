# Configuration OAuth Google - Guide Simple

## 📋 Variables d'environnement requises

### Sur Vercel (Production)

```env
NEXTAUTH_URL=https://synexa-xi.vercel.app
NEXTAUTH_SECRET=votre_secret_ici
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
```

### En local (Development)

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre_secret_ici
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
```

## ⚙️ Configuration Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Créez un **OAuth 2.0 Client ID** (ou modifiez l'existant)
4. Ajoutez ces **URI de redirection autorisés** :

**Pour les requêtes du serveur Web :**
- `http://localhost:3000/api/auth/callback/google`
- `https://synexa-xi.vercel.app/api/auth/callback/google`

**Important :**
- Pas de slash final
- Pas d'espaces
- Correspondance exacte

## ✅ Checklist de vérification

- [ ] `NEXTAUTH_URL` est défini (sans slash final)
- [ ] `NEXTAUTH_SECRET` est défini (généré avec `openssl rand -base64 32`)
- [ ] `GOOGLE_CLIENT_ID` est défini
- [ ] `GOOGLE_CLIENT_SECRET` est défini
- [ ] Les URI de redirection sont configurées dans Google Console
- [ ] Redéploiement effectué après modification des variables

## 🔧 Architecture

### Structure simple

```
app/
  api/
    auth/
      [...nextauth]/
        route.ts          # Configuration NextAuth
  lib/
    auth/
      prisma-adapter.ts  # Adapter Prisma (standard)
  auth/
    signin/
      page.tsx           # Page de connexion
```

### Flux d'authentification

1. **Utilisateur clique sur "Continuer avec Google"**
2. **Redirection vers Google** (consentement)
3. **Google redirige vers** `/api/auth/callback/google`
4. **NextAuth crée/mise à jour l'utilisateur** (via Prisma)
5. **Redirection vers** `/dashboard`

## 🛡️ Sécurité

- ✅ Cookies sécurisés automatiquement en HTTPS (Vercel)
- ✅ Sessions JWT (30 jours)
- ✅ Validation des tokens OAuth
- ✅ Protection CSRF intégrée (NextAuth)

## 📝 Notes importantes

- **NEXTAUTH_URL** doit être la seule source d'URL côté serveur
- NextAuth génère automatiquement l'URI de callback : `${NEXTAUTH_URL}/api/auth/callback/google`
- Ne pas utiliser `NEXT_PUBLIC_*` pour NextAuth
- Les cookies sont automatiquement sécurisés en production (HTTPS)

