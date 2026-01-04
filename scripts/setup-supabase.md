# 🚀 Guide rapide : Configuration Supabase

## 📝 Informations nécessaires

Pour configurer Supabase, j'ai besoin de :

1. **Connection String Supabase** (URI)
   - Format : `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - Où trouver : Supabase → Settings → Database → Connection string → URI

2. **Mot de passe du projet Supabase**
   - Le mot de passe que vous avez défini lors de la création du projet

## 🔧 Étapes à suivre

### 1. Récupérer la connection string

1. Allez sur [supabase.com](https://supabase.com)
2. Connectez-vous et sélectionnez votre projet
3. **Settings** → **Database**
4. Section **Connection string** → Onglet **URI**
5. Copiez la chaîne complète

### 2. Configurer localement

Ajoutez dans votre `.env` :

```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[VOTRE_MOT_DE_PASSE]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15"
```

**Important** : Remplacez `[VOTRE_MOT_DE_PASSE]` par votre mot de passe Supabase.

### 3. Configurer sur Vercel

1. Allez dans votre projet Vercel
2. **Settings** → **Environment Variables**
3. Ajoutez `DATABASE_URL` avec la même valeur
4. Sélectionnez tous les environnements
5. **Save**

### 4. Générer le client Prisma

```bash
npm run db:generate
```

### 5. Créer les tables dans Supabase

```bash
npx prisma migrate deploy
```

### 6. Vérifier la connexion

```bash
npm run db:check
```

## ✅ Une fois configuré

Une fois Supabase configuré, je pourrai :
- Revenir à `strategy: "database"` (conforme à la documentation)
- Tester la connexion Google
- Vérifier que tout fonctionne correctement

