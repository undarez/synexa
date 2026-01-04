# 🗄️ Configuration Supabase pour Synexa

Ce guide explique comment configurer Supabase (PostgreSQL) pour Synexa.

## 📋 Prérequis

- Un projet Supabase créé ([supabase.com](https://supabase.com))
- Les accès à votre projet Supabase

## 🔧 Étape 1 : Récupérer la connection string

1. Allez sur [supabase.com](https://supabase.com) et connectez-vous
2. Sélectionnez votre projet
3. Allez dans **Settings** → **Database**
4. Dans la section **Connection string**, sélectionnez l'onglet **URI**
5. Copiez la connection string (format : `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`)
6. **Important** : Remplacez `[YOUR-PASSWORD]` par le mot de passe de votre projet Supabase

## 🔐 Étape 2 : Configurer les variables d'environnement

### Localement (.env)

Ajoutez dans votre fichier `.env` :

```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[VOTRE_MOT_DE_PASSE]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15"
```

**Note** : Utilisez le format avec `pgbouncer=true` pour les connexions via pooler (recommandé pour Supabase).

### Sur Vercel

1. Allez dans votre projet Vercel
2. **Settings** → **Environment Variables**
3. Ajoutez `DATABASE_URL` avec la même valeur
4. Sélectionnez tous les environnements (Production, Preview, Development)
5. Cliquez sur **Save**

## 🚀 Étape 3 : Générer le client Prisma

```bash
npm run db:generate
```

## 📦 Étape 4 : Créer les tables dans Supabase

### Option A : Migration automatique (recommandé)

```bash
npx prisma migrate deploy
```

### Option B : Push du schéma (développement)

```bash
npm run db:push
```

## ✅ Étape 5 : Vérifier la connexion

```bash
npm run db:check
```

## 🔄 Étape 6 : Migrer les données existantes (si nécessaire)

Si vous avez des données dans SQLite, vous devrez les migrer manuellement vers PostgreSQL.

## 📝 Notes importantes

- **Pooler** : Supabase recommande d'utiliser le pooler de connexions pour les applications serverless
- **SSL** : Les connexions Supabase utilisent SSL par défaut
- **Limites** : Vérifiez les limites de votre plan Supabase (connexions simultanées, stockage, etc.)

## 🆘 Dépannage

### Erreur de connexion

- Vérifiez que le mot de passe est correct dans `DATABASE_URL`
- Vérifiez que votre IP n'est pas bloquée (Settings → Database → Connection Pooling)
- Essayez sans `pgbouncer=true` si le problème persiste

### Erreur de migration

- Assurez-vous que le schéma Prisma est à jour
- Vérifiez que vous avez les permissions nécessaires sur la base de données