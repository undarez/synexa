# 📋 Récapitulatif complet des variables d'environnement Synexa

Ce document liste **TOUTES** les variables d'environnement utilisées dans le projet Synexa, classées par priorité.

## ✅ Variables OBLIGATOIRES (pour que l'application fonctionne)

Ces variables doivent être configurées pour que l'application démarre correctement :

| Variable | Description | Comment l'obtenir |
|----------|-------------|------------------|
| `NEXTAUTH_URL` | URL de base de l'application | `http://localhost:3000` en dev, votre domaine en prod |
| `NEXTAUTH_SECRET` | Secret pour signer les tokens JWT | `openssl rand -base64 32` ou [générateur](https://generate-secret.vercel.app/32) |
| `DATABASE_URL` | URL de connexion PostgreSQL (Supabase) | `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres` |
| `ENCRYPTION_KEY` | Clé de chiffrement pour les données sensibles | `npx tsx scripts/generate-encryption-key.ts` |
| `CRON_SECRET` | Secret pour sécuriser les endpoints cron | `openssl rand -base64 32` ou [générateur](https://generate-secret.vercel.app/32) |

## ⭐ Variables RECOMMANDÉES (pour les fonctionnalités principales)

Ces variables activent les fonctionnalités principales de l'application :

| Variable | Description | Comment l'obtenir |
|----------|-------------|------------------|
| `GROQ_API_KEY` | Clé API Groq pour l'IA (parsing en langage naturel) | [console.groq.com](https://console.groq.com) - Gratuit |
| `GROQ_MODEL` | Modèle Groq à utiliser (optionnel) | `llama-3.1-8b-instant` (défaut) |
| `VAPID_PUBLIC_KEY` | Clé publique VAPID pour les notifications push | `npx tsx scripts/generate-vapid-keys.ts` |
| `VAPID_PRIVATE_KEY` | Clé privée VAPID pour les notifications push | `npx tsx scripts/generate-vapid-keys.ts` |
| `VAPID_SUBJECT` | Sujet VAPID (format: `mailto:email@exemple.com`) | Votre email |
| `RESEND_API_KEY` | Clé API Resend pour les emails | [resend.com](https://resend.com) - Gratuit jusqu'à 3000/mois |
| `RESEND_FROM_EMAIL` | Email d'expéditeur (format: `Nom <email@domaine.com>`) | Votre email d'expéditeur |

## 🔧 Variables OPTIONNELLES (améliorent l'expérience)

Ces variables activent des fonctionnalités supplémentaires :

### 🗺️ Trafic et Cartes

| Variable | Description | Comment l'obtenir |
|----------|-------------|------------------|
| `GOOGLE_MAPS_API_KEY` | Clé API Google Maps Directions | [Google Cloud Console](https://console.cloud.google.com) - Gratuit jusqu'à 200$/mois |
| `TOMTOM_API_KEY` | Clé API TomTom (serveur) | [developer.tomtom.com](https://developer.tomtom.com/) |
| `NEXT_PUBLIC_TOMTOM_API_KEY` | Clé API TomTom (client/carte) | Même clé que `TOMTOM_API_KEY` |
| `OPENROUTESERVICE_API_KEY` | Clé API OpenRouteService | [openrouteservice.org](https://openrouteservice.org/) |

### 🔐 Authentification OAuth

| Variable | Description | Comment l'obtenir |
|----------|-------------|------------------|
| `GOOGLE_CLIENT_ID` | Client ID Google OAuth | [Google Cloud Console](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET` | Client Secret Google OAuth | [Google Cloud Console](https://console.cloud.google.com) |
| `GOOGLE_REDIRECT_URI` | URI de redirection Google OAuth | `http://localhost:3000/api/auth/callback/google` |
| `GOOGLE_CALENDAR_REDIRECT_URI` | URI de redirection Google Calendar | Optionnel, utilise `GOOGLE_REDIRECT_URI` si non défini |
| `FACEBOOK_CLIENT_ID` | Client ID Facebook OAuth | [developers.facebook.com](https://developers.facebook.com) |
| `FACEBOOK_CLIENT_SECRET` | Client Secret Facebook OAuth | [developers.facebook.com](https://developers.facebook.com) |

### 🏃 Santé et Fitness

| Variable | Description | Comment l'obtenir |
|----------|-------------|------------------|
| `FITBIT_CLIENT_ID` | Client ID Fitbit OAuth | [dev.fitbit.com/apps](https://dev.fitbit.com/apps) |
| `FITBIT_CLIENT_SECRET` | Client Secret Fitbit OAuth | [dev.fitbit.com/apps](https://dev.fitbit.com/apps) |

### 📱 SMS

| Variable | Description | Comment l'obtenir |
|----------|-------------|------------------|
| `TWILIO_ACCOUNT_SID` | Account SID Twilio | [twilio.com](https://www.twilio.com) - Crédit gratuit |
| `TWILIO_AUTH_TOKEN` | Auth Token Twilio | [twilio.com](https://www.twilio.com) |
| `TWILIO_PHONE_NUMBER` | Numéro de téléphone Twilio | [twilio.com](https://www.twilio.com) |

### 📰 Actualités

| Variable | Description | Comment l'obtenir |
|----------|-------------|------------------|
| `NEWS_API_KEY` | Clé API News API | [newsapi.org](https://newsapi.org) |

### ⚡ Énergie

| Variable | Description | Comment l'obtenir |
|----------|-------------|------------------|
| `SICEA_PORTAL_URL` | URL du portail SICEA | `https://www.sicea.fr/espace-client` (défaut) |

### 📧 Contact

| Variable | Description | Comment l'obtenir |
|----------|-------------|------------------|
| `EMAIL_CONTACT` | Email de contact pour le formulaire | Votre email (défaut: `fortuna77320@gmail.com`) |

### 🔐 Sécurité (Alternative)

| Variable | Description | Comment l'obtenir |
|----------|-------------|------------------|
| `ACCESS_TOKEN_SECRET` | Secret alternatif pour les tokens | Utilise `NEXTAUTH_SECRET` si non défini |

## 📊 Statistiques

- **Total de variables** : 33
- **Obligatoires** : 5
- **Recommandées** : 7
- **Optionnelles** : 21

## 🚀 Configuration rapide

### 1. Générer le fichier .env

```powershell
.\scripts\generate-env.ps1
```

### 2. Générer les secrets obligatoires

```powershell
# NEXTAUTH_SECRET
openssl rand -base64 32

# CRON_SECRET
openssl rand -base64 32

# ENCRYPTION_KEY
npx tsx scripts/generate-encryption-key.ts

# Clés VAPID
npx tsx scripts/generate-vapid-keys.ts
```

### 3. Ajouter vos clés API

Consultez `docs/api-keys-setup.md` pour les instructions détaillées sur chaque service.

## 📝 Notes importantes

1. **Sécurité** : Ne partagez JAMAIS vos clés privées (`VAPID_PRIVATE_KEY`, `TWILIO_AUTH_TOKEN`, `NEXTAUTH_SECRET`, etc.)

2. **Gratuit** : 
   - Resend : 3000 emails/mois
   - Groq : limites généreuses
   - Open-Meteo : illimité (utilisé par défaut pour la météo)
   - Google Maps : 200$/mois de crédit gratuit

3. **Production** : Changez `NEXTAUTH_URL` et les URIs de redirection pour votre domaine

4. **HTTPS** : Les notifications push nécessitent HTTPS en production

## 🔍 Variables utilisées dans le code mais non listées ici

- `NODE_ENV` : Géré automatiquement par Next.js (`development` ou `production`)
- Variables système : Gérées automatiquement par le système d'exploitation

## 📚 Documentation complète

Pour plus de détails sur chaque service, consultez :
- `docs/api-keys-setup.md` : Guide complet de configuration
- `README-DEPLOY.md` : Guide de déploiement sur Vercel









