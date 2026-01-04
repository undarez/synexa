# 🔑 Configuration complète des clés API et variables d'environnement

Ce guide récapitule **tous** les comptes API et configurations nécessaires pour Synexa.

## 📋 Liste complète des variables d'environnement

### 🔐 Authentification (NextAuth)

```env
# URL de base de l'application
NEXTAUTH_URL=http://localhost:3000
# Secret pour signer les tokens (générer avec: openssl rand -base64 32)
NEXTAUTH_SECRET=votre_secret_aleatoire_ici
```

**Comment obtenir :**
- `NEXTAUTH_URL` : URL de votre application (localhost en dev, votre domaine en prod)
- `NEXTAUTH_SECRET` : Générez avec `openssl rand -base64 32` ou [ce générateur](https://generate-secret.vercel.app/32)

---

### 🗄️ Base de données (Prisma/PostgreSQL - Supabase)

```env
# URL de connexion PostgreSQL (Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

**Configuration :**
1. Créez un projet sur [supabase.com](https://supabase.com)
2. Récupérez la connection string dans **Settings** → **Database** → **Connection string** → **URI**
3. Remplacez `[PASSWORD]` par votre mot de passe Supabase
4. Remplacez `[PROJECT_REF]` par votre Project ID Supabase

---

### 📧 Email - Resend (Gratuit jusqu'à 3000 emails/mois)

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=Synexa <noreply@votre-domaine.com>
```

**Comment obtenir :**
1. Allez sur [resend.com](https://resend.com)
2. Créez un compte gratuit
3. Allez dans **API Keys** → Créez une nouvelle clé
4. Copiez la clé API
5. Pour les tests, utilisez `onboarding@resend.dev` comme email d'expéditeur

**Lien :** https://resend.com

---

### 🔔 Push Notifications - Web Push API (Gratuit)

```env
VAPID_PUBLIC_KEY=BFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_SUBJECT=mailto:votre-email@exemple.com
```

**Comment obtenir :**
1. Exécutez le script de génération :
   ```bash
   npx tsx scripts/generate-vapid-keys.ts
   ```
2. Copiez les clés générées dans votre `.env`
3. `VAPID_SUBJECT` doit être un email valide (format `mailto:`)

**Note :** Les notifications push nécessitent HTTPS en production.

---

### 📱 SMS - Twilio (Optionnel, avec crédit gratuit)

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

**Comment obtenir :**
1. Allez sur [twilio.com](https://www.twilio.com)
2. Créez un compte (crédit gratuit offert)
3. Allez dans **Console** → **Account Info**
4. Copiez `Account SID` et `Auth Token`
5. Obtenez un numéro de téléphone dans **Phone Numbers**

**Lien :** https://www.twilio.com

**Note :** Si non configuré, le service SMS fonctionne en mode simulation.

---

### 🤖 Intelligence Artificielle - Groq (Gratuit avec limites généreuses)

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Comment obtenir :**
1. Allez sur [console.groq.com](https://console.groq.com)
2. Créez un compte gratuit
3. Allez dans **API Keys** → Créez une nouvelle clé
4. Copiez la clé API

**Lien :** https://console.groq.com

**Note :** Utilisé pour le parsing en langage naturel (événements, routines) et les conversations avec l'IA. Si non configuré, un parser regex est utilisé en fallback.

**Modèle par défaut :** `llama-3.1-8b-instant` (rapide et gratuit)

**Modèles disponibles :**
- `llama-3.1-8b-instant` (recommandé, rapide, gratuit)
- `llama-3.3-70b-versatile` (plus puissant, plus lent)
- `mixtral-8x7b-32768` (bon compromis)

**Personnaliser le modèle (optionnel) :**
```env
GROQ_MODEL=llama-3.1-8b-instant
```

---

### 🌤️ Météo - Open-Meteo (Gratuit, excellent pour la France, utilisé par défaut)

**Aucune clé API nécessaire !** 🎉

Le service utilise **Open-Meteo** par défaut, qui est :
- ✅ **100% gratuit** (sans limite de requêtes)
- ✅ **Sans clé API** (fonctionne immédiatement)
- ✅ **Parfait pour la France** (utilise les modèles météo européens ECMWF)
- ✅ **Géolocalisation native** (fonctionne avec latitude/longitude)
- ✅ **Prévisions jusqu'à 16 jours**
- ✅ **Données précises** pour toute l'Europe, y compris la France

**Lien :** https://open-meteo.com/

**Note :** 
- Open-Meteo est utilisé automatiquement, aucune configuration nécessaire
- L'API utilise les modèles météo européens (ECMWF) qui sont très précis pour la France
- Parfait pour la géolocalisation : il suffit de fournir latitude/longitude
- Si vous préférez une autre API, vous pouvez modifier `app/lib/services/weather.ts`

---

### 🗺️ Trafic - Google Maps Directions API (Recommandé pour données en temps réel)

```env
GOOGLE_MAPS_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Comment obtenir :**
1. Allez sur [Google Cloud Console](https://console.cloud.google.com)
2. Créez un nouveau projet ou sélectionnez-en un
3. Activez l'API **Directions API** et **Maps JavaScript API**
4. Allez dans **Credentials** → **Create Credentials** → **API Key**
5. Copiez la clé API
6. (Recommandé) Restreignez la clé API pour la sécurité :
   - Application restrictions : HTTP referrers (web sites)
   - API restrictions : Directions API, Maps JavaScript API

**Lien :** https://console.cloud.google.com

**Note :** 
- **Gratuit jusqu'à 200$ de crédit/mois** (environ 28 000 requêtes Directions API)
- Fournit des données de trafic en temps réel précises
- Si non configuré, le système utilise une simulation avec Deep Links Waze
- Les Deep Links Waze fonctionnent sans clé API (ouvrent l'app Waze)

**Alternative Waze :**
- Waze Deep Links sont automatiquement générés (pas de clé nécessaire)
- Cliquez sur "Ouvrir dans Waze" pour utiliser l'app Waze
- L'API officielle Waze nécessite un partenariat (non disponible publiquement)

---

### 📅 Google Calendar & Authentification (Optionnel)

```env
GOOGLE_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

**Comment obtenir :**
1. Allez sur [Google Cloud Console](https://console.cloud.google.com)
2. Créez un nouveau projet ou sélectionnez-en un
3. Activez l'API **Google Calendar API**
4. Allez dans **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configurez :
   - Application type : Web application
   - Authorized redirect URIs : `http://localhost:3000/api/auth/callback/google`
6. Copiez `Client ID` et `Client Secret`

**Lien :** https://console.cloud.google.com

**Note :** Nécessaire pour l'authentification Google et la synchronisation avec Google Calendar.

---

### 👤 Facebook Authentification (Optionnel)

```env
FACEBOOK_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FACEBOOK_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Comment obtenir :**
1. Allez sur [Facebook Developers](https://developers.facebook.com)
2. Créez une nouvelle application
3. Allez dans **Settings** → **Basic**
4. Copiez `App ID` et `App Secret`
5. Ajoutez `http://localhost:3000/api/auth/callback/facebook` dans **Valid OAuth Redirect URIs**

**Lien :** https://developers.facebook.com

**Note :** Nécessaire uniquement si vous voulez permettre la connexion via Facebook.

---

### 🔐 Chiffrement des Données (Requis pour la protection des données sensibles)

```env
ENCRYPTION_KEY=votre_cle_generee_ici
```

**Comment obtenir :**
1. Exécutez le script de génération :
   ```bash
   npx tsx scripts/generate-encryption-key.ts
   ```
2. Copiez la clé générée dans votre `.env`

**⚠️ IMPORTANT :**
- La clé doit contenir au moins 32 caractères
- Ne commitez JAMAIS cette clé dans Git
- Gardez-la dans un gestionnaire de mots de passe sécurisé
- Si vous perdez cette clé, les données chiffrées seront irrécupérables

**Note :** Utilisé pour chiffrer les données sensibles (adresses, coordonnées GPS, etc.). Voir `docs/encryption-setup.md` pour plus de détails.

---

### ⏰ Cron Job Secret (Pour l'envoi automatique des rappels)

```env
CRON_SECRET=votre_secret_aleatoire_ici
```

**Comment obtenir :**
- Générez un secret aléatoire avec `openssl rand -base64 32` ou [ce générateur](https://generate-secret.vercel.app/32)

**Note :** Utilisé pour sécuriser l'endpoint `/api/reminders/process` appelé par le cron job.

---

## 📝 Fichier `.env` complet (exemple)

Créez un fichier `.env` à la racine du projet avec :

```env
# ============================================
# 🔐 AUTHENTIFICATION
# ============================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre_secret_aleatoire_ici

# ============================================
# 🗄️ BASE DE DONNÉES
# ============================================
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# ============================================
# 📧 EMAIL (Resend)
# ============================================
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=Synexa <noreply@votre-domaine.com>

# ============================================
# 🔔 PUSH NOTIFICATIONS (Web Push API)
# ============================================
VAPID_PUBLIC_KEY=BFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_SUBJECT=mailto:votre-email@exemple.com

# ============================================
# 📱 SMS (Twilio - Optionnel)
# ============================================
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# ============================================
# 🤖 INTELLIGENCE ARTIFICIELLE (Groq)
# ============================================
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# 🌤️ MÉTÉO (Open-Meteo - Gratuit, utilisé par défaut, aucune clé nécessaire)
# ============================================
# Aucune configuration nécessaire !
# Open-Meteo est utilisé automatiquement (gratuit, fiable, parfait pour la France)

# ============================================
# 🗺️ TRAFIC (Google Maps Directions API - Optionnel mais recommandé)
# ============================================
GOOGLE_MAPS_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Si non configuré, utilise une simulation avec Deep Links Waze (gratuit)

# ============================================
# 📅 GOOGLE CALENDAR (Optionnel)
# ============================================
GOOGLE_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# ============================================
# 👤 FACEBOOK AUTHENTIFICATION (Optionnel)
# ============================================
FACEBOOK_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FACEBOOK_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# 🔐 CHIFFREMENT DES DONNÉES
# ============================================
ENCRYPTION_KEY=votre_cle_generee_ici
# Générer avec: npx tsx scripts/generate-encryption-key.ts

# ============================================
# ⏰ CRON JOB
# ============================================
CRON_SECRET=votre_secret_aleatoire_ici
```

---

## 🎯 Priorités de configuration

### ✅ **Obligatoires** (pour que l'app fonctionne)
1. `NEXTAUTH_URL` et `NEXTAUTH_SECRET` - Authentification
2. `DATABASE_URL` - Base de données
3. `ENCRYPTION_KEY` - Chiffrement des données sensibles

### ⭐ **Recommandées** (pour les fonctionnalités principales)
3. `GROQ_API_KEY` - Parsing en langage naturel (sinon regex en fallback)
4. `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` - Notifications push
5. `RESEND_API_KEY`, `RESEND_FROM_EMAIL` - Notifications email

### 🔧 **Optionnelles** (améliorent l'expérience)
6. `GOOGLE_MAPS_API_KEY` - Données de trafic en temps réel (sinon simulation + Waze Deep Links)
7. `TWILIO_*` - SMS réels (sinon simulation)
8. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Sync Google Calendar + Auth Google
9. `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` - Auth Facebook
10. `CRON_SECRET` - Envoi automatique des rappels

**Note :** 
- La météo utilise Open-Meteo par défaut (gratuit, sans clé, excellent pour la France)
- Le trafic utilise Google Maps si configuré, sinon simulation + Deep Links Waze (gratuit)

---

## 🚀 Guide de configuration rapide

### 1. Configuration minimale (pour démarrer)

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

### 2. Ajouter les notifications

```bash
# Générer les clés VAPID
npx tsx scripts/generate-vapid-keys.ts

# Puis ajouter dans .env :
RESEND_API_KEY=re_xxx...
VAPID_PUBLIC_KEY=BFxxx...
VAPID_PRIVATE_KEY=xxx...
VAPID_SUBJECT=mailto:votre-email@exemple.com
```

### 3. Ajouter l'IA (optionnel mais recommandé)

```env
GROQ_API_KEY=gsk_xxx...
```

### 4. La météo fonctionne déjà ! 🎉

**Aucune configuration nécessaire** - Open-Meteo est utilisé automatiquement :
- ✅ Gratuit et sans limite
- ✅ Parfait pour la France (modèles européens ECMWF)
- ✅ Géolocalisation native (latitude/longitude)
- ✅ Prévisions jusqu'à 16 jours

---

## 📚 Liens utiles

- **Resend** : https://resend.com
- **Groq** : https://console.groq.com
- **Twilio** : https://www.twilio.com
- **Open-Meteo** : https://open-meteo.com/ (utilisé par défaut, gratuit, excellent pour la France)
- **Google Cloud Console** : https://console.cloud.google.com
- **Générateur de secrets** : https://generate-secret.vercel.app/32

---

## ⚠️ Notes importantes

1. **Sécurité** : Ne partagez JAMAIS vos clés privées (`VAPID_PRIVATE_KEY`, `TWILIO_AUTH_TOKEN`, `NEXTAUTH_SECRET`, etc.)
2. **Gratuit** : Resend (3000 emails/mois), Groq (limites généreuses), Open-Meteo (illimité)
3. **Production** : Changez `NEXTAUTH_URL` et `GOOGLE_REDIRECT_URI` pour votre domaine
4. **HTTPS** : Les notifications push nécessitent HTTPS en production

---

## 🐛 Dépannage

### Les variables ne sont pas chargées
- Vérifiez que le fichier `.env` est à la racine du projet
- Redémarrez le serveur de développement après modification
- Vérifiez qu'il n'y a pas d'espaces autour du `=` dans `.env`

### Les clés API ne fonctionnent pas
- Vérifiez que les clés sont correctement copiées (sans espaces)
- Vérifiez les quotas/limites de votre compte
- Consultez les logs du serveur pour les erreurs détaillées

