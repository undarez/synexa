# ⚠️ Limitation Puppeteer sur Vercel

## 🚫 Problème

**Puppeteer n'est pas compatible avec Vercel (serverless functions)** car :
- Puppeteer nécessite Chrome/Chromium (~300MB)
- Les fonctions serverless ont des limites de taille
- Le temps de démarrage de Chrome est trop long pour les fonctions serverless

## ✅ Solution appliquée

Le scraping SICEA a été rendu **optionnel** :
- Si Puppeteer est disponible → scraping fonctionne
- Si Puppeteer n'est pas disponible (Vercel) → retourne une erreur explicite

## 🔧 Alternatives pour le scraping SICEA

### Option 1 : Service externe (Recommandé)

Utilisez un service de scraping externe :

#### Browserless.io
```typescript
import puppeteer from "puppeteer-core";

const browser = await puppeteer.connect({
  browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`,
});
```

#### ScrapingBee
```typescript
const response = await fetch(
  `https://app.scrapingbee.com/api/v1/?api_key=${process.env.SCRAPINGBEE_KEY}&url=${encodeURIComponent(url)}`
);
```

### Option 2 : Serveur dédié

Créez un microservice séparé sur un serveur dédié (VPS, Railway, Render) qui :
- Exécute le scraping SICEA
- Expose une API REST
- Appelée par Vercel via HTTP

### Option 3 : API SICEA (si disponible)

Si SICEA propose une API officielle, utilisez-la directement.

### Option 4 : Cron externe

Utilisez un service de cron externe (cron-job.org, GitHub Actions) qui :
- S'exécute sur un serveur avec Puppeteer
- Appelle votre API Vercel avec les données scrapées

## 📝 Configuration recommandée

Pour l'instant, le scraping SICEA est **désactivé sur Vercel** mais reste fonctionnel sur un serveur dédié.

Pour activer le scraping sur un serveur dédié :
1. Installez Puppeteer : `npm install puppeteer`
2. Le code détectera automatiquement Puppeteer et activera le scraping

## 🔐 Sécurité

Même avec un service externe, les identifiants SICEA restent :
- ✅ Chiffrés avec AES-256
- ✅ Stockés de manière sécurisée
- ✅ Protégés par TOTP

