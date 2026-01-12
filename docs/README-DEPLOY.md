# 🚀 Guide de déploiement Synexa sur Vercel

Ce guide explique comment déployer Synexa sur Vercel en production.

## 📋 Prérequis

- Un compte GitHub
- Un compte Vercel (gratuit)
- Toutes les clés API nécessaires (voir `.env.example`)

## 🔧 Étape 1 : Préparer le repository GitHub

### 1.1 Vérifier que tout est commité

```bash
git status
```

### 1.2 S'assurer que .env n'est pas commité

Le fichier `.env` doit être dans `.gitignore` (déjà fait ✅)

### 1.3 Créer un commit

```bash
git add .
git commit -m "Préparation déploiement Vercel"
git push origin main
```

## 🚀 Étape 2 : Déployer sur Vercel

### 2.1 Créer un projet Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur **"Add New Project"**
3. Importez votre repository GitHub
4. Sélectionnez le repository Synexa

### 2.2 Configuration du projet

**Framework Preset :** Next.js (détecté automatiquement)

**Root Directory :** `synexa` (si votre repo contient plusieurs dossiers)

**Build Command :** `npm run build` (par défaut)

**Output Directory :** `.next` (par défaut)

**Install Command :** `npm install` (par défaut)

### 2.3 Variables d'environnement

Dans la section **"Environment Variables"**, ajoutez **TOUTES** les variables de `.env.example` :

#### Variables obligatoires :

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
NEXTAUTH_URL=https://votre-projet.vercel.app
NEXTAUTH_SECRET=votre_secret_nextauth
CRON_SECRET=votre_secret_cron
SICEA_PORTAL_URL=https://www.sicea.fr/espace-client
```

#### Variables optionnelles (selon vos besoins) :

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...
RESEND_API_KEY=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=...
TOMTOM_API_KEY=...
GROQ_API_KEY=...
```

**⚠️ IMPORTANT :**
- `NEXTAUTH_URL` doit être votre domaine Vercel (ex: `https://synexa.vercel.app`)
- Vercel génère automatiquement cette URL après le premier déploiement
- Vous pouvez la mettre à jour après le premier déploiement

### 2.4 Déployer

Cliquez sur **"Deploy"**

## 📊 Étape 3 : Configuration post-déploiement

### 3.1 Mettre à jour NEXTAUTH_URL

1. Allez dans **Settings** → **Environment Variables**
2. Mettez à jour `NEXTAUTH_URL` avec votre URL Vercel réelle
3. Redéployez si nécessaire

### 3.2 Vérifier les cron jobs

Les cron jobs sont automatiquement configurés via `vercel.json` :

- ✅ Scraping SICEA : Tous les jours à 2h
- ✅ Sync santé : Toutes les 6h
- ✅ Traitement rappels : Toutes les 5 min
- ✅ Sync calendrier : Toutes les heures

**Note :** Vercel Cron nécessite un plan Pro. Pour le plan gratuit, utilisez cron-job.org.

### 3.3 Base de données

**PostgreSQL (Supabase) :** Base de données utilisée en production.

**Configuration :**
- Utilisez Supabase (gratuit, PostgreSQL) : [supabase.com](https://supabase.com)
- Configurez `DATABASE_URL` avec votre connection string Supabase
- Format : `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`

**Alternatives :**
- **Vercel Postgres** (recommandé, intégré)
- **PlanetScale** (gratuit, MySQL)
- **Railway** (gratuit, PostgreSQL)

**Migration vers PostgreSQL :**

1. Créez une base de données PostgreSQL
2. Mettez à jour `DATABASE_URL` dans Vercel
3. Exécutez les migrations :
   ```bash
   npx prisma migrate deploy
   ```

## 🔐 Étape 4 : Sécurité

### 4.1 Vérifier les variables sensibles

Assurez-vous que toutes les clés API sont dans les variables d'environnement Vercel, pas dans le code.

### 4.2 Activer HTTPS

Vercel active HTTPS automatiquement ✅

### 4.3 Configurer les domaines personnalisés (optionnel)

1. Allez dans **Settings** → **Domains**
2. Ajoutez votre domaine personnalisé
3. Suivez les instructions DNS

## 🧪 Étape 5 : Tester

### 5.1 Tester l'application

Visitez votre URL Vercel : `https://votre-projet.vercel.app`

### 5.2 Tester les APIs

```bash
# Test scraping SICEA (avec CRON_SECRET)
curl -X POST https://votre-projet.vercel.app/api/energy/sicea/auto-scrape \
  -H "Authorization: Bearer votre_CRON_SECRET"
```

### 5.3 Vérifier les logs

Allez dans **Deployments** → Cliquez sur un déploiement → **View Function Logs**

## 📝 Checklist de déploiement

- [ ] Repository GitHub créé et poussé
- [ ] Projet Vercel créé
- [ ] Toutes les variables d'environnement ajoutées
- [ ] `NEXTAUTH_URL` configuré avec l'URL Vercel
- [ ] Base de données configurée (PostgreSQL recommandé)
- [ ] Application déployée avec succès
- [ ] Tests effectués
- [ ] Cron jobs vérifiés (ou configurés avec cron-job.org)
- [ ] Domaines personnalisés configurés (si nécessaire)

## 🐛 Dépannage

### Erreur : "Module not found"

Vérifiez que toutes les dépendances sont dans `package.json` et que `npm install` s'exécute correctement.

### Erreur : "Database connection failed"

Vérifiez que `DATABASE_URL` est correctement configuré dans Vercel.

### Erreur : "NEXTAUTH_URL mismatch"

Assurez-vous que `NEXTAUTH_URL` dans Vercel correspond exactement à votre URL de déploiement.

### Les cron jobs ne fonctionnent pas

- Vérifiez que `vercel.json` est à la racine du projet
- Vérifiez que vous avez un plan Vercel Pro (ou utilisez cron-job.org)
- Vérifiez les logs dans Vercel

## 📚 Ressources

- [Documentation Vercel](https://vercel.com/docs)
- [Next.js sur Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

## 💡 Astuces

1. **Variables d'environnement par environnement :** Vous pouvez définir des variables différentes pour Production, Preview et Development dans Vercel.

2. **Preview Deployments :** Chaque PR crée automatiquement un déploiement de prévisualisation.

3. **Analytics :** Activez Vercel Analytics pour suivre les performances.

4. **Monitoring :** Utilisez Vercel Logs pour déboguer les problèmes.

