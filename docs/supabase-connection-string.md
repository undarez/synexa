# 🔗 Comment obtenir la connection string Supabase

## 📍 Où trouver la connection string PostgreSQL

1. Allez sur [supabase.com](https://supabase.com)
2. Connectez-vous et sélectionnez votre projet (`deamqbfsidcgrrxsfwuf`)
3. Allez dans **Settings** (⚙️ en bas à gauche)
4. Cliquez sur **Database** dans le menu de gauche
5. Descendez jusqu'à la section **Connection string**
6. Sélectionnez l'onglet **URI** (pas "Session mode" ni "Transaction")
7. Vous verrez quelque chose comme :

```
postgresql://postgres.deamqbfsidcgrrxsfwuf:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

## ⚠️ Important

- Remplacez `[YOUR-PASSWORD]` par le **mot de passe de votre base de données Supabase**
- Ce mot de passe est différent des clés API que vous avez partagées
- Si vous ne vous souvenez plus du mot de passe, vous pouvez le réinitialiser dans **Settings** → **Database** → **Database password**

## 📋 Format attendu

La connection string complète devrait ressembler à :

```
postgresql://postgres.deamqbfsidcgrrxsfwuf:VOTRE_MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15
```

## 🔐 Sécurité

- Ne partagez jamais votre mot de passe de base de données publiquement
- Utilisez des variables d'environnement pour stocker cette information
- Sur Vercel, ajoutez-la dans **Settings** → **Environment Variables**

