# 🔄 Alternatives pour tester les cron jobs en local

Si vous n'avez pas encore de domaine public, voici plusieurs options pour tester les cron jobs.

## ❌ Pourquoi pas localhost ?

**cron-job.org** (et tous les services de cron externes) ne peuvent **PAS** accéder à `localhost` car :
- `localhost` est uniquement accessible depuis votre machine
- Les services externes sont sur Internet et ne peuvent pas atteindre votre machine locale

## ✅ Solutions

### Option 1 : ngrok (Recommandé pour les tests)

**Avantages :**
- ✅ Gratuit
- ✅ Simple à utiliser
- ✅ Parfait pour les tests

**Inconvénients :**
- ❌ URL change à chaque redémarrage (plan gratuit)
- ❌ Limite de connexions simultanées

**Voir le guide complet dans `cron-setup-temporary.md`**

---

### Option 2 : Cloudflare Tunnel (Gratuit, domaine fixe)

**Avantages :**
- ✅ 100% gratuit
- ✅ Domaine fixe possible
- ✅ Pas de limite de connexions

**Configuration :**

1. **Installer cloudflared :**
   ```bash
   # Windows (avec Chocolatey)
   choco install cloudflared
   
   # Ou télécharger depuis https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
   ```

2. **Lancer le tunnel :**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

3. **Vous obtiendrez une URL comme :** `https://abc123.trycloudflare.com`

4. **Utiliser cette URL dans cron-job.org**

**⚠️ Note :** L'URL change à chaque redémarrage, mais vous pouvez configurer un domaine fixe avec Cloudflare.

---

### Option 3 : localtunnel (Gratuit, simple)

**Avantages :**
- ✅ Très simple
- ✅ Gratuit
- ✅ Installation via npm

**Inconvénients :**
- ❌ URL change à chaque redémarrage
- ❌ Moins stable que ngrok

**Configuration :**

1. **Installer :**
   ```bash
   npm install -g localtunnel
   ```

2. **Lancer :**
   ```bash
   lt --port 3000
   ```

3. **Vous obtiendrez une URL comme :** `https://abc123.loca.lt`

4. **Utiliser cette URL dans cron-job.org**

---

### Option 4 : Déployer sur un service gratuit (Recommandé pour la prod)

**Services gratuits recommandés :**

#### Vercel (Recommandé)
- ✅ Gratuit
- ✅ Déploiement automatique depuis GitHub
- ✅ Domaine `.vercel.app` gratuit
- ✅ Cron jobs intégrés (plan Pro)

**Déploiement :**
```bash
npm install -g vercel
vercel
```

#### Railway
- ✅ Gratuit avec crédit mensuel
- ✅ Domaine `.railway.app` gratuit
- ✅ Simple à déployer

#### Render
- ✅ Gratuit (avec limitations)
- ✅ Domaine `.onrender.com` gratuit
- ✅ Auto-déploiement depuis GitHub

**Une fois déployé, utilisez votre domaine public dans cron-job.org !**

---

### Option 5 : Tester manuellement (sans cron externe)

Si vous voulez juste tester les endpoints sans configurer de cron externe :

**Windows PowerShell :**
```powershell
# Scraping SICEA
Invoke-WebRequest -Uri "http://localhost:3000/api/energy/sicea/auto-scrape" `
  -Method POST `
  -Headers @{"Authorization"="Bearer VOTRE_CRON_SECRET"}

# Sync santé
Invoke-WebRequest -Uri "http://localhost:3000/api/health/sync/auto" `
  -Method POST `
  -Headers @{"Authorization"="Bearer VOTRE_CRON_SECRET"}

# Traitement rappels
Invoke-WebRequest -Uri "http://localhost:3000/api/reminders/process" `
  -Method POST `
  -Headers @{"Authorization"="Bearer VOTRE_CRON_SECRET"}

# Sync calendrier
Invoke-WebRequest -Uri "http://localhost:3000/api/calendar/auto-sync" `
  -Method POST `
  -Headers @{"Authorization"="Bearer VOTRE_CRON_SECRET"}
```

**Linux/Mac :**
```bash
# Scraping SICEA
curl -X POST http://localhost:3000/api/energy/sicea/auto-scrape \
  -H "Authorization: Bearer VOTRE_CRON_SECRET"

# Sync santé
curl -X POST http://localhost:3000/api/health/sync/auto \
  -H "Authorization: Bearer VOTRE_CRON_SECRET"

# Traitement rappels
curl -X POST http://localhost:3000/api/reminders/process \
  -H "Authorization: Bearer VOTRE_CRON_SECRET"

# Sync calendrier
curl -X POST http://localhost:3000/api/calendar/auto-sync \
  -H "Authorization: Bearer VOTRE_CRON_SECRET"
```

---

## 💡 Recommandation

**Pour les tests :**
- Utilisez **ngrok** ou **Cloudflare Tunnel** pour exposer localhost

**Pour la production :**
- Déployez sur **Vercel** (gratuit) et utilisez votre domaine `.vercel.app`
- Ou utilisez **Railway** / **Render** pour un déploiement rapide

**Une fois déployé, vous pourrez utiliser votre domaine public dans cron-job.org !**

