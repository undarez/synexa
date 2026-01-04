# 🗄️ Configuration Supabase - Guide Complet

## 📋 Informations de votre projet Supabase

- **Project ID** : `deamqbfsidcgrrxsfwuf`
- **URL** : `https://deamqbfsidcgrrxsfwuf.supabase.co`
- **Connection String** : `postgresql://postgres:[YOUR-PASSWORD]@db.deamqbfsidcgrrxsfwuf.supabase.co:5432/postgres`

## 🔐 Étape 1 : Obtenir le mot de passe de la base de données

### Option A : Si vous vous souvenez du mot de passe

Utilisez le mot de passe que vous avez défini lors de la création du projet Supabase.

### Option B : Si vous ne vous souvenez plus

1. Allez sur [supabase.com](https://supabase.com)
2. Connectez-vous et sélectionnez votre projet
3. **Settings** (⚙️) → **Database**
4. Section **Database password**
5. Cliquez sur **Reset database password**
6. **Copiez le nouveau mot de passe** (vous ne pourrez plus le voir après)

## 🔧 Étape 2 : Configurer le fichier .env

Ouvrez votre fichier `.env` et ajoutez/modifiez cette ligne :

```env
DATABASE_URL="postgresql://postgres:OaEuothDUnRZSMdN@db.deamqbfsidcgrrxsfwuf.supabase.co:5432/postgres"
```

**Remplacez `VOTRE_MOT_DE_PASSE_ICI` par votre vrai mot de passe.**

## 🚀 Étape 3 : Exécuter les commandes de migration

Une fois le `.env` configuré avec le bon mot de passe, exécutez :

```bash
# 1. Générer le client Prisma pour PostgreSQL
npm run db:generate

# 2. Créer les tables dans Supabase
npx prisma migrate deploy

# 3. Vérifier que la connexion fonctionne
npm run db:check
```

## ☁️ Étape 4 : Configurer sur Vercel

1. Allez dans votre projet Vercel
2. **Settings** → **Environment Variables**
3. Ajoutez `DATABASE_URL` avec la même valeur (avec le mot de passe)
4. Sélectionnez **Production**, **Preview** et **Development**
5. Cliquez sur **Save**

## ✅ Étape 5 : Mise à jour de NextAuth

Une fois que vous aurez exécuté les migrations et vérifié la connexion, je mettrai à jour NextAuth pour utiliser `strategy: "database"` (conforme à la documentation officielle).

## 🆘 Dépannage

### Erreur de connexion

- Vérifiez que le mot de passe est correct dans `DATABASE_URL`
- Vérifiez que vous n'avez pas d'espaces supplémentaires
- Essayez de réinitialiser le mot de passe dans Supabase

### Erreur de migration

- Assurez-vous que le schéma Prisma est à jour
- Vérifiez que vous avez les permissions nécessaires

## 📝 Note importante

**Ne partagez jamais votre mot de passe de base de données publiquement.** Utilisez toujours des variables d'environnement.

