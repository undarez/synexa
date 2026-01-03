# ✅ Vérification Vercel - Connexion Google

## 🎯 Situation
- ✅ **Local** : Tout fonctionne, connexion Google OK
- ❌ **Vercel** : Connexion Google ne fonctionne pas

## 🔍 Causes probables

### 1. Cookies HTTPS non configurés
**Problème** : En HTTPS (Vercel), les cookies doivent avoir l'attribut `Secure`. Sans cela, le navigateur les rejette.

**Solution** : Configuration explicite des cookies ajoutée dans le code.

### 2. NEXTAUTH_URL incorrect
**Vérification** : Sur Vercel, `NEXTAUTH_URL` doit être **exactement** :
```
https://synexa-xi.vercel.app
```
- ❌ PAS de slash final (`/`)
- ❌ PAS d'espaces avant/après
- ✅ Doit être activé pour **"Production"**

### 3. URI de callback Google incorrecte
**Vérification** : Dans Google Cloud Console, l'URI doit être **exactement** :
```
https://synexa-xi.vercel.app/api/auth/callback/google
```
- ❌ PAS de slash final
- ❌ PAS d'espaces
- ✅ Correspondance exacte avec NEXTAUTH_URL

## ✅ Checklist Vercel

### Variables d'environnement
- [ ] `NEXTAUTH_URL` = `https://synexa-xi.vercel.app` (sans slash, sans espaces)
- [ ] `NEXTAUTH_SECRET` est défini
- [ ] `GOOGLE_CLIENT_ID` est défini
- [ ] `GOOGLE_CLIENT_SECRET` est défini
- [ ] Toutes les variables sont activées pour **"Production"** ✅

### Variables à SUPPRIMER
- [ ] `NEXT_PUBLIC_NEXTAUTH_URL` → **SUPPRIMÉE**
- [ ] `GOOGLE_REDIRECT_URI` → **SUPPRIMÉE**

### Google Cloud Console
- [ ] URI de callback : `https://synexa-xi.vercel.app/api/auth/callback/google`
- [ ] Correspondance exacte (pas de slash final)

## 🔧 Corrections appliquées

### Configuration cookies HTTPS
J'ai ajouté la configuration explicite des cookies dans `app/api/auth/[...nextauth]/route.ts` :

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

**Pourquoi** : En HTTPS, les cookies doivent être `Secure` pour être transmis. NextAuth le fait automatiquement, mais on force explicitement pour être sûr.

## 📋 Actions après redéploiement (dans 6h)

1. **Redéployez** avec cache désactivé
2. **Vérifiez les logs Vercel** pour voir si les cookies sont créés
3. **Testez la connexion Google**
4. **Vérifiez les cookies** dans les DevTools (Application → Cookies)

## 🔍 Debug si ça ne fonctionne toujours pas

### Vérifier les cookies dans le navigateur
1. Ouvrez DevTools (F12)
2. Onglet **Application** → **Cookies**
3. Vérifiez que les cookies `next-auth.session-token` sont créés
4. Vérifiez qu'ils ont l'attribut **Secure** ✅

### Vérifier les logs Vercel
1. Allez dans **Deployments** → **View Function Logs**
2. Cherchez les erreurs lors de la connexion Google
3. Vérifiez les logs NextAuth

### Tester l'URI de callback
Testez directement dans le navigateur :
```
https://synexa-xi.vercel.app/api/auth/callback/google?error=test
```
Si vous voyez une page d'erreur NextAuth, l'URI est correcte.

## 💡 Pourquoi ça fonctionne en local mais pas sur Vercel ?

**Local (HTTP)** :
- Cookies fonctionnent sans `Secure`
- Pas de problème de CORS
- Environnement plus permissif

**Vercel (HTTPS)** :
- Cookies **DOIVENT** être `Secure` en HTTPS
- CORS plus strict
- Environnement de production plus sécurisé

C'est pour ça que la configuration explicite des cookies est nécessaire en production.

