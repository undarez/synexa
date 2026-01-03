# 🔍 Diagnostic de l'erreur "Callback" NextAuth

## 📊 Situation actuelle

- ✅ Connexion Google démarre correctement
- ❌ Erreur "Callback" après redirection depuis Google
- ❌ Session reste "unauthenticated"
- ❌ Boucle infinie dans React (logs répétés)

## 🔍 Causes probables

### 1. PrismaAdapter ne crée pas l'utilisateur
**Symptôme** : Le callback OAuth échoue lors de la création de l'utilisateur dans la base de données.

**Vérification** :
- Vérifier les logs Vercel pour voir si `Event createUser` est appelé
- Vérifier si l'utilisateur est créé dans la base de données
- Vérifier la connexion à la base de données (`DATABASE_URL`)

### 2. Cookies non définis correctement
**Symptôme** : Les cookies de session ne sont pas créés après l'authentification.

**Vérification** :
- Ouvrir DevTools → Application → Cookies
- Vérifier si `__Secure-next-auth.session-token` existe
- Vérifier que les cookies ont l'attribut `Secure` ✅

### 3. Problème avec NEXTAUTH_URL
**Symptôme** : NextAuth ne peut pas déterminer l'URL de base.

**Vérification** :
- `NEXTAUTH_URL` = `https://synexa-xi.vercel.app` (sans slash final)
- Variable activée pour "Production" ✅

### 4. Problème avec Google OAuth
**Symptôme** : Google ne renvoie pas les tokens correctement.

**Vérification** :
- Vérifier les logs Vercel pour voir si `signIn callback` est appelé
- Vérifier si `hasAccessToken: true` dans les logs
- Vérifier l'URI de callback dans Google Console

## 📋 Checklist de diagnostic

### Logs Vercel à vérifier

1. **Lors du clic sur "Continuer avec Google"** :
   - ✅ `🔐 [NEXTAUTH] signIn callback:` avec `hasAccessToken: true`
   - ✅ `📝 [NEXTAUTH] Event signIn:` avec `isNewUser: true/false`
   - ✅ `➕ [NEXTAUTH] Event createUser:` (si nouvel utilisateur)
   - ✅ `🔗 [NEXTAUTH] Event linkAccount:` avec le provider Google

2. **Lors du callback OAuth** :
   - ✅ `🎫 [NEXTAUTH] jwt callback:` avec `hasUser: true`
   - ✅ `👤 [NEXTAUTH] session callback:` avec `hasToken: true`
   - ✅ `↪️ [NEXTAUTH] redirect callback:` vers `/dashboard`

3. **Erreurs possibles** :
   - ❌ `❌ [NEXTAUTH] Google access_token manquant`
   - ❌ Erreurs Prisma (connexion DB, création utilisateur)
   - ❌ Erreurs de cookies (Secure, SameSite)

### Vérifications dans le navigateur

1. **Cookies** (DevTools → Application → Cookies) :
   - `__Secure-next-auth.session-token` doit exister
   - `__Secure-next-auth.callback-url` doit exister
   - `__Host-next-auth.csrf-token` doit exister
   - Tous doivent avoir `Secure` ✅ et `HttpOnly` ✅

2. **Console** :
   - Vérifier les logs `[NEXTAUTH]` côté client
   - Vérifier les erreurs réseau dans l'onglet Network

### Vérifications Vercel

1. **Variables d'environnement** :
   - `NEXTAUTH_URL` = `https://synexa-xi.vercel.app` (sans slash)
   - `NEXTAUTH_SECRET` est défini
   - `GOOGLE_CLIENT_ID` est défini
   - `GOOGLE_CLIENT_SECRET` est défini
   - `DATABASE_URL` est défini et valide
   - Toutes activées pour "Production" ✅

2. **Google Cloud Console** :
   - URI de callback autorisée : `https://synexa-xi.vercel.app/api/auth/callback/google`
   - Pas de slash final
   - Client ID et Secret correspondent

## 🔧 Actions à effectuer

1. **Vérifier les logs Vercel** :
   - Aller dans Vercel → Deployments → View Function Logs
   - Filtrer par `/api/auth/callback/google`
   - Chercher les logs `[NEXTAUTH]`

2. **Vérifier la base de données** :
   - Vérifier si l'utilisateur est créé après la tentative de connexion
   - Vérifier la connexion à la base de données

3. **Tester sans PrismaAdapter** (temporairement) :
   - Si le problème persiste, tester sans adapter pour voir si c'est Prisma qui cause le problème

4. **Vérifier les cookies** :
   - Ouvrir DevTools → Application → Cookies
   - Vérifier que les cookies sont créés après le callback

## 📝 Logs attendus (si tout fonctionne)

```
🔐 [NEXTAUTH] signIn callback: { userId: 'xxx', email: 'xxx@gmail.com', provider: 'google', hasAccessToken: true }
✅ [NEXTAUTH] Google signIn autorisé
📝 [NEXTAUTH] Event signIn: { userId: 'xxx', email: 'xxx@gmail.com', isNewUser: true, provider: 'google' }
➕ [NEXTAUTH] Event createUser: { userId: 'xxx', email: 'xxx@gmail.com', name: 'xxx' }
🔗 [NEXTAUTH] Event linkAccount: { userId: 'xxx', provider: 'google', providerAccountId: 'xxx' }
🎫 [NEXTAUTH] jwt callback: { trigger: 'signIn', hasUser: true, hasAccount: true, tokenSub: 'xxx' }
👤 [NEXTAUTH] session callback: { hasToken: true, tokenSub: 'xxx', sessionUser: 'xxx@gmail.com' }
↪️ [NEXTAUTH] redirect callback: { url: '/dashboard', baseUrl: 'https://synexa-xi.vercel.app' }
↪️ [NEXTAUTH] Redirection relative: https://synexa-xi.vercel.app/dashboard
```

## 🚨 Si les logs ne s'affichent pas

Si aucun log `[NEXTAUTH]` n'apparaît dans les logs Vercel, cela signifie que :
- Le callback OAuth n'atteint jamais le serveur
- Il y a un problème avec la route `/api/auth/callback/google`
- Il y a un problème avec le Service Worker qui intercepte la requête

**Solution** : Vérifier que le Service Worker ignore bien `/api/auth/*`

