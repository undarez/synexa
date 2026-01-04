# 🚀 Configuration Supabase - Instructions

## 📝 Étape 1 : Remplacer le mot de passe dans la connection string

Vous avez la connection string :
```
postgresql://postgres:[YOUR-PASSWORD]@db.deamqbfsidcgrrxsfwuf.supabase.co:5432/postgres
```

**Remplacez `[YOUR-PASSWORD]` par votre mot de passe Supabase.**

### Comment trouver/réinitialiser le mot de passe :

1. Allez sur [supabase.com](https://supabase.com)
2. Sélectionnez votre projet
3. **Settings** → **Database**
4. Section **Database password**
5. Si vous ne vous souvenez plus du mot de passe, cliquez sur **Reset database password**
6. Copiez le nouveau mot de passe

### Connection string finale :

Une fois le mot de passe remplacé, ça devrait ressembler à :
```
postgresql://postgres:VOTRE_MOT_DE_PASSE_ICI@db.deamqbfsidcgrrxsfwuf.supabase.co:5432/postgres
```

## 🔧 Étape 2 : Ajouter dans .env

Ajoutez cette ligne dans votre fichier `.env` :

```env
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE_ICI@db.deamqbfsidcgrrxsfwuf.supabase.co:5432/postgres"
```

**Important** : Remplacez `VOTRE_MOT_DE_PASSE_ICI` par votre vrai mot de passe.

## 🚀 Étape 3 : Exécuter les commandes

Une fois le `.env` configuré, exécutez :

```bash
# Générer le client Prisma
npm run db:generate

# Créer les tables dans Supabase
npx prisma migrate deploy

# Vérifier la connexion
npm run db:check
```

## ✅ Étape 4 : Configurer sur Vercel

1. Allez dans votre projet Vercel
2. **Settings** → **Environment Variables**
3. Ajoutez `DATABASE_URL` avec la même valeur (avec le mot de passe)
4. Sélectionnez tous les environnements
5. **Save**

## 🎯 Une fois tout configuré

Je mettrai à jour NextAuth pour utiliser `strategy: "database"` (conforme à la documentation).

