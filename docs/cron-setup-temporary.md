# 🔄 Configuration temporaire des Cron Jobs (avant Vercel)

Ce guide explique comment configurer les cron jobs **maintenant** avec un service gratuit, en attendant le déploiement sur Vercel.

## 🎯 Solution recommandée : cron-job.org (100% gratuit)

### Étape 1 : Créer un compte

1. Allez sur [cron-job.org](https://cron-job.org)
2. Créez un compte gratuit (pas de carte bancaire requise)
3. Confirmez votre email

### Étape 2 : Configurer le scraping SICEA

**⚠️ IMPORTANT :** cron-job.org ne peut **PAS** accéder à `localhost`. Vous devez utiliser :

- **Option A** : Un domaine public (si votre app est déployée)
- **Option B** : ngrok pour exposer localhost (pour les tests uniquement)

#### Option A : Si votre app est déployée

1. Dans le dashboard, cliquez sur **"Create cronjob"**
2. Configurez :

   - **Title** : `Synexa - Scraping SICEA`
   - **Address** : `https://votre-domaine.com/api/energy/sicea/auto-scrape` ⚠️ **Remplacez par votre vrai domaine**
   - **Schedule** : `0 2 * * *` (tous les jours à 2h du matin)
   - **Request Method** : `POST`
   - **Request Headers** :
     ```
     Authorization: Bearer VOTRE_CRON_SECRET
     Content-Type: application/json
     ```
   - **Status** : `Active`

3. Cliquez sur **"Create"**

#### Option B : Pour tester en local avec ngrok

Voir la section "Test en local (avec ngrok)" ci-dessous.

### Étape 3 : Configurer les autres cron jobs

Répétez l'étape 2 pour :

#### Synchronisation santé (toutes les 6h)

- **Title** : `Synexa - Sync Santé`
- **Address** : `https://votre-domaine.com/api/health/sync/auto`
- **Schedule** : `0 */6 * * *`
- **Request Method** : `POST`
- **Headers** : `Authorization: Bearer VOTRE_CRON_SECRET`

#### Traitement des rappels (toutes les 5 min)

- **Title** : `Synexa - Traitement Rappels`
- **Address** : `https://votre-domaine.com/api/reminders/process`
- **Schedule** : `*/5 * * * *`
- **Request Method** : `POST`
- **Headers** : `Authorization: Bearer VOTRE_CRON_SECRET`

#### Synchronisation calendrier (toutes les heures)

- **Title** : `Synexa - Sync Calendrier`
- **Address** : `https://votre-domaine.com/api/calendar/auto-sync`
- **Schedule** : `0 * * * *`
- **Request Method** : `POST`
- **Headers** : `Authorization: Bearer VOTRE_CRON_SECRET`

## 🔐 Configuration du CRON_SECRET

### Étape 1 : Générer un secret sécurisé

**Windows PowerShell :**

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Linux/Mac :**

```bash
openssl rand -base64 32
```

### Étape 2 : Ajouter dans `.env`

```env
CRON_SECRET=votre_secret_genere_ici
```

### Étape 3 : Utiliser le même secret dans cron-job.org

Copiez ce secret dans le header `Authorization: Bearer` de chaque cron job.

## 🧪 Test en local (avec ngrok)

**⚠️ IMPORTANT :** cron-job.org ne peut pas accéder à `localhost:3000`. Pour tester en local, vous devez exposer votre serveur avec ngrok.

### 1. Installer ngrok

**Windows :**

- Téléchargez depuis [ngrok.com/download](https://ngrok.com/download)
- Ou avec Chocolatey : `choco install ngrok`

**Linux/Mac :**

```bash
# Avec Homebrew (Mac)
brew install ngrok

# Ou télécharger depuis https://ngrok.com/download
```

### 2. Créer un compte ngrok (gratuit)

1. Allez sur [ngrok.com](https://ngrok.com)
2. Créez un compte gratuit
3. Récupérez votre authtoken dans le dashboard
4. Configurez ngrok :
   ```bash
   ngrok config add-authtoken VOTRE_AUTHTOKEN
   ```

### 3. Lancer votre serveur Next.js

```bash
npm run dev
```

Votre serveur tourne sur `http://localhost:3000`

### 4. Lancer ngrok dans un autre terminal

```bash
ngrok http 3000
```

Vous obtiendrez une URL comme : `https://abc123.ngrok-free.app`

### 5. Configurer cron-job.org avec l'URL ngrok

Dans cron-job.org, utilisez :

- **Address** : `https://abc123.ngrok-free.app/api/energy/sicea/auto-scrape`

**⚠️ Limitations de ngrok gratuit :**

- L'URL change à chaque redémarrage de ngrok
- Limite de connexions simultanées
- **Pour la production, utilisez un vrai domaine déployé**

### 6. Alternative : ngrok avec domaine fixe (payant)

Si vous voulez un domaine fixe avec ngrok :

1. Passez au plan payant ngrok
2. Configurez un domaine fixe : `ngrok http 3000 --domain=votre-domaine.ngrok-free.app`
3. Utilisez ce domaine dans cron-job.org

**💡 Recommandation :** Pour la production, déployez votre app sur Vercel/Railway/Render et utilisez votre domaine public.

## 📊 Monitoring

cron-job.org offre un monitoring basique :

- Historique des exécutions
- Statut (succès/échec)
- Temps de réponse
- Logs des erreurs

## 🚀 Migration vers Vercel Cron (plus tard)

Quand vous déploierez sur Vercel :

1. **Le fichier `vercel.json` est déjà créé** ✅
2. Supprimez les cron jobs de cron-job.org
3. Vercel détectera automatiquement `vercel.json` et activera les cron jobs
4. Les mêmes endpoints seront appelés automatiquement

**Aucune modification de code nécessaire !** 🎉

## 🔄 Alternative : EasyCron

Si cron-job.org ne vous convient pas, vous pouvez utiliser [EasyCron](https://www.easycron.com/) avec la même configuration.

---

## ✅ Checklist

- [ ] Compte créé sur cron-job.org
- [ ] CRON_SECRET généré et ajouté dans `.env`
- [ ] 4 cron jobs créés dans cron-job.org
- [ ] Test manuel effectué (voir section test ci-dessous)
- [ ] Monitoring activé dans cron-job.org

## 🧪 Test manuel

Testez chaque endpoint avant de configurer les cron jobs :

```bash
# Scraping SICEA
curl -X POST http://localhost:3000/api/energy/sicea/auto-scrape \
  -H "Authorization: Bearer votre_CRON_SECRET"

# Sync santé
curl -X POST http://localhost:3000/api/health/sync/auto \
  -H "Authorization: Bearer votre_CRON_SECRET"

# Traitement rappels
curl -X POST http://localhost:3000/api/reminders/process \
  -H "Authorization: Bearer votre_CRON_SECRET"

# Sync calendrier
curl -X POST http://localhost:3000/api/calendar/auto-sync \
  -H "Authorization: Bearer votre_CRON_SECRET"
```

Si vous obtenez `{"success": true, ...}`, c'est bon ! ✅
