# 🔍 Vérification des logs Vercel - Erreur "Callback"

## 📋 Instructions pour vérifier les logs

1. **Allez sur Vercel** → Votre projet → **Deployments**
2. Cliquez sur le dernier déploiement
3. Cliquez sur **"View Function Logs"** ou **"Logs"**
4. Filtrez par `/api/auth/callback/google` ou cherchez `[NEXTAUTH]`

## 🔍 Ce qu'il faut chercher dans les logs

### Si vous voyez ces logs, c'est bon signe :
- `📥 [NEXTAUTH] GET request:` - La requête arrive
- `🔐 [NEXTAUTH] signIn callback:` - Le callback signIn est appelé
- `📝 [NEXTAUTH] Event signIn:` - L'événement signIn est déclenché

### Si vous voyez ces erreurs, notez-les :
- `❌ [NEXTAUTH] Erreur GET:` - Erreur dans le handler GET
- `❌ [NEXTAUTH] Erreur POST:` - Erreur dans le handler POST
- Erreurs Prisma (connexion DB, création utilisateur)
- Erreurs de cookies

## 🚨 Erreurs courantes et solutions

### 1. Erreur Prisma "Can't reach database server"
**Solution** : Vérifier `DATABASE_URL` sur Vercel

### 2. Erreur "User creation failed"
**Solution** : Vérifier le schéma Prisma et les contraintes d'unicité

### 3. Erreur "Cookie not set"
**Solution** : Vérifier que `NEXTAUTH_SECRET` est défini

## 📝 Partagez les logs

Copiez-collez les logs Vercel ici pour que je puisse identifier le problème exact.

