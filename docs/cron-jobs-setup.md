# 🔄 Configuration des Cron Jobs pour Synexa

Ce guide explique comment configurer les tâches automatiques (cron jobs) pour Synexa.

## 📋 Endpoints à planifier

### 1. Scraping SICEA automatique (quotidien)
- **Endpoint** : `POST /api/energy/sicea/auto-scrape`
- **Fréquence recommandée** : Tous les jours à 2h du matin
- **Headers requis** : `Authorization: Bearer <CRON_SECRET>`

### 2. Synchronisation santé (toutes les 6h)
- **Endpoint** : `POST /api/health/sync/auto`
- **Fréquence recommandée** : Toutes les 6 heures
- **Headers requis** : `Authorization: Bearer <CRON_SECRET>`

### 3. Traitement des rappels (toutes les 5 min)
- **Endpoint** : `POST /api/reminders/process`
- **Fréquence recommandée** : Toutes les 5 minutes
- **Headers requis** : `Authorization: Bearer <CRON_SECRET>`

### 4. Synchronisation calendrier (horaire)
- **Endpoint** : `POST /api/calendar/auto-sync`
- **Fréquence recommandée** : Toutes les heures
- **Headers requis** : `Authorization: Bearer <CRON_SECRET>`

## 🚀 Options de configuration

### Option 1 : Vercel Cron (Recommandé si déployé sur Vercel)

Si vous déployez Synexa sur Vercel, c'est la solution la plus simple et intégrée.

**Créer `vercel.json` à la racine :**

```json
{
  "crons": [
    {
      "path": "/api/energy/sicea/auto-scrape",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/health/sync/auto",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/reminders/process",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/calendar/auto-sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Avantages :**
- ✅ Gratuit sur Vercel
- ✅ Intégré directement
- ✅ Pas besoin de service externe
- ✅ Gestion automatique des timeouts

**Note :** Vercel Cron nécessite un plan Pro pour les cron jobs personnalisés (mais il y a un essai gratuit).

---

### Option 2 : Cronitor (Service externe payant)

[Cronitor](https://cronitor.io/) est un service de monitoring de cron jobs avec un plan gratuit limité.

**Configuration :**
1. Créez un compte sur [cronitor.io](https://cronitor.io)
2. Créez un nouveau monitor
3. Configurez :
   - **URL** : `https://votre-domaine.com/api/energy/sicea/auto-scrape`
   - **Méthode** : POST
   - **Headers** : `Authorization: Bearer <CRON_SECRET>`
   - **Schedule** : `0 2 * * *` (tous les jours à 2h)

**Avantages :**
- ✅ Monitoring et alertes
- ✅ Dashboard de suivi
- ✅ Plan gratuit (limité)
- ✅ Compatible avec tous les hébergements

**Inconvénients :**
- ❌ Service externe (dépendance)
- ❌ Plan gratuit limité (5 monitors)

---

### Option 3 : cron-job.org (Gratuit)

[cron-job.org](https://cron-job.org/) est un service gratuit de cron jobs.

**Configuration :**
1. Créez un compte sur [cron-job.org](https://cron-job.org)
2. Créez un nouveau job
3. Configurez :
   - **URL** : `https://votre-domaine.com/api/energy/sicea/auto-scrape`
   - **Méthode** : POST
   - **Headers** : 
     ```
     Authorization: Bearer <CRON_SECRET>
     Content-Type: application/json
     ```
   - **Schedule** : `0 2 * * *`

**Avantages :**
- ✅ 100% gratuit
- ✅ Illimité
- ✅ Interface simple

**Inconvénients :**
- ❌ Service externe
- ❌ Pas de monitoring avancé

---

### Option 4 : EasyCron (Gratuit avec limitations)

[EasyCron](https://www.easycron.com/) offre un plan gratuit avec limitations.

**Configuration similaire à cron-job.org**

---

### Option 5 : GitHub Actions (Gratuit pour repos publics)

Si votre code est sur GitHub, vous pouvez utiliser GitHub Actions.

**Créer `.github/workflows/cron-jobs.yml` :**

```yaml
name: Cron Jobs

on:
  schedule:
    # Tous les jours à 2h UTC
    - cron: '0 2 * * *'
    # Toutes les 6 heures
    - cron: '0 */6 * * *'
    # Toutes les 5 minutes
    - cron: '*/5 * * * *'
    # Toutes les heures
    - cron: '0 * * * *'
  workflow_dispatch: # Permet de déclencher manuellement

jobs:
  scrape-sicea:
    runs-on: ubuntu-latest
    if: github.event.schedule == "0 2 * * *"
    steps:
      - name: Call SICEA Auto-Scrape
        run: |
          curl -X POST https://votre-domaine.com/api/energy/sicea/auto-scrape \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"

  sync-health:
    runs-on: ubuntu-latest
    if: github.event.schedule == "0 */6 * * *"
    steps:
      - name: Call Health Sync
        run: |
          curl -X POST https://votre-domaine.com/api/health/sync/auto \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"

  process-reminders:
    runs-on: ubuntu-latest
    if: github.event.schedule == "*/5 * * * *"
    steps:
      - name: Process Reminders
        run: |
          curl -X POST https://votre-domaine.com/api/reminders/process \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"

  sync-calendar:
    runs-on: ubuntu-latest
    if: github.event.schedule == "0 * * * *"
    steps:
      - name: Sync Calendar
        run: |
          curl -X POST https://votre-domaine.com/api/calendar/auto-sync \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**Avantages :**
- ✅ Gratuit pour repos publics
- ✅ Intégré à GitHub
- ✅ Logs et monitoring

**Inconvénients :**
- ❌ Nécessite un repo GitHub
- ❌ Limité pour repos privés (minutes gratuites)

---

### Option 6 : Serveur dédié (Linux cron)

Si vous avez un serveur dédié, vous pouvez utiliser le cron Linux natif.

**Créer un script `cron-jobs.sh` :**

```bash
#!/bin/bash

CRON_SECRET="votre_secret_ici"
DOMAIN="https://votre-domaine.com"

# Scraping SICEA (tous les jours à 2h)
curl -X POST "${DOMAIN}/api/energy/sicea/auto-scrape" \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Sync santé (toutes les 6h)
curl -X POST "${DOMAIN}/api/health/sync/auto" \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Traitement rappels (toutes les 5 min)
curl -X POST "${DOMAIN}/api/reminders/process" \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Sync calendrier (toutes les heures)
curl -X POST "${DOMAIN}/api/calendar/auto-sync" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

**Configurer dans crontab :**

```bash
# Éditer le crontab
crontab -e

# Ajouter les lignes :
0 2 * * * /chemin/vers/cron-jobs.sh scrape-sicea
0 */6 * * * /chemin/vers/cron-jobs.sh sync-health
*/5 * * * * /chemin/vers/cron-jobs.sh process-reminders
0 * * * * /chemin/vers/cron-jobs.sh sync-calendar
```

---

## 🔐 Configuration de sécurité

### Variable d'environnement CRON_SECRET

Ajoutez dans votre `.env` :

```env
CRON_SECRET=votre_secret_tres_securise_ici
```

**Générer un secret sécurisé :**

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

---

## 📊 Monitoring et alertes

### Avec Cronitor

Cronitor envoie des alertes si :
- Un job échoue
- Un job ne s'exécute pas
- Un job prend trop de temps

### Avec Vercel

Vercel envoie des emails en cas d'erreur.

### Logs personnalisés

Tous les endpoints cron loggent leurs activités dans les logs de l'application.

---

## 🧪 Test manuel

Vous pouvez tester manuellement chaque endpoint :

```bash
# Scraping SICEA
curl -X POST http://localhost:3000/api/energy/sicea/auto-scrape \
  -H "Authorization: Bearer votre_secret"

# Sync santé
curl -X POST http://localhost:3000/api/health/sync/auto \
  -H "Authorization: Bearer votre_secret"

# Traitement rappels
curl -X POST http://localhost:3000/api/reminders/process \
  -H "Authorization: Bearer votre_secret"

# Sync calendrier
curl -X POST http://localhost:3000/api/calendar/auto-sync \
  -H "Authorization: Bearer votre_secret"
```

---

## 💡 Recommandation

**Pour la production :**
- Si déployé sur **Vercel** → Utilisez **Vercel Cron** (le plus simple)
- Si déployé ailleurs → Utilisez **cron-job.org** (gratuit) ou **Cronitor** (avec monitoring)

**Pour le développement :**
- Utilisez **cron-job.org** avec un tunnel (ngrok) vers localhost

