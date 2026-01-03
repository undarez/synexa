# 🔍 Debug Erreur 500 - Callback Google OAuth

## ✅ Ce qui fonctionne

D'après les cookies que vous avez partagés :
- ✅ Les cookies sont créés correctement (`__Host-` et `__Secure-`)
- ✅ La configuration HTTPS fonctionne
- ✅ NextAuth est initialisé

## ❌ Problème

L'erreur 500 se produit lors du callback OAuth :
```
GET /api/auth/callback/google → 500 Internal Server Error
```

## 🔍 Causes probables

### 1. Erreur Prisma (Base de données)
**Symptôme** : L'adapter Prisma plante lors de la création/liaison du compte

**Vérification** :
- Vérifiez que `DATABASE_URL` est correct sur Vercel
- Vérifiez que la base de données est accessible depuis Vercel
- Vérifiez les logs Vercel pour voir l'erreur Prisma exacte

### 2. Erreur dans les callbacks NextAuth
**Symptôme** : Un callback (`jwt`, `session`, `redirect`) plante

**Vérification** :
- J'ai ajouté des try-catch dans tous les callbacks
- Les erreurs seront maintenant loggées dans Vercel

### 3. Problème avec l'adapter Prisma
**Symptôme** : L'adapter plante lors de `createUser` ou `linkAccount`

**Vérification** :
- Vérifiez les logs Vercel pour voir si c'est Prisma qui plante

## 📋 Actions immédiates

### 1. Vérifier les logs Vercel

1. Allez sur **Vercel Dashboard**
2. **Deployments** → Dernier déploiement
3. **View Function Logs**
4. Cherchez les erreurs lors de l'appel à `/api/auth/callback/google`
5. **Partagez les logs d'erreur complets**

### 2. Vérifier DATABASE_URL

Sur Vercel, vérifiez que :
- `DATABASE_URL` est défini
- `DATABASE_URL` est activé pour **"Production"** ✅
- `DATABASE_URL` est correct (format de connexion valide)

### 3. Tester la connexion à la base de données

Si possible, testez que la base de données est accessible depuis Vercel.

## 🔧 Corrections appliquées

J'ai ajouté :
1. ✅ Gestion d'erreur dans tous les callbacks (`jwt`, `session`, `redirect`)
2. ✅ Logs d'erreur pour identifier le problème
3. ✅ Try-catch dans le handler GET/POST

## 📝 Prochaines étapes

1. **Vérifiez les logs Vercel** et partagez l'erreur exacte
2. **Vérifiez DATABASE_URL** sur Vercel
3. **Redéployez** avec les nouvelles corrections (dans 6h)

Les logs Vercel devraient maintenant afficher l'erreur exacte qui cause le 500.

