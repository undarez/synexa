# Script PowerShell pour générer un fichier .env complet
# Usage: .\scripts\generate-env.ps1

$envContent = @"
# ============================================
# 🔐 AUTHENTIFICATION (Obligatoire)
# ============================================
# URL de base de l'application
NEXTAUTH_URL=http://localhost:3000
# Secret pour signer les tokens
# Générer avec: npx tsx scripts/generate-secrets.ts
NEXTAUTH_SECRET=
# Alternative pour ACCESS_TOKEN_SECRET (utilise NEXTAUTH_SECRET si non défini)
ACCESS_TOKEN_SECRET=

# ============================================
# 🗄️ BASE DE DONNÉES (Obligatoire)
# ============================================
# URL de connexion PostgreSQL (Supabase)
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
DATABASE_URL="postgresql://postgres:OaEuothDUnRZSMdN@db.deamqbfsidcgrrxsfwuf.supabase.co:5432/postgres"

# ============================================
# 🔐 CHIFFREMENT DES DONNÉES (Obligatoire)
# ============================================
# Clé de chiffrement pour les données sensibles
# Générer avec: npx tsx scripts/generate-encryption-key.ts
ENCRYPTION_KEY=

# ============================================
# ⏰ CRON JOB (Obligatoire pour les rappels automatiques)
# ============================================
# Secret pour sécuriser les endpoints cron
# Générer avec: npx tsx scripts/generate-secrets.ts
CRON_SECRET=

# ============================================
# 📧 EMAIL - Resend (Recommandé)
# ============================================
# Clé API Resend (gratuit jusqu'à 3000 emails/mois)
# Obtenir sur: https://resend.com
RESEND_API_KEY=
# Email d'expéditeur (format: Nom <email@domaine.com>)
RESEND_FROM_EMAIL=Synexa <noreply@votre-domaine.com>
# Email de contact pour le formulaire de contact
EMAIL_CONTACT=fortuna77320@gmail.com

# ============================================
# 🔔 PUSH NOTIFICATIONS - Web Push API (Recommandé)
# ============================================
# Clés VAPID pour les notifications push
# Générer avec: npx tsx scripts/generate-vapid-keys.ts
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
# Sujet VAPID (format: mailto:email@exemple.com)
VAPID_SUBJECT=mailto:votre-email@exemple.com

# ============================================
# 📱 SMS - Twilio (Optionnel)
# ============================================
# Si non configuré, le service SMS fonctionne en mode simulation
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# ============================================
# 🤖 INTELLIGENCE ARTIFICIELLE - Groq (Recommandé)
# ============================================
# Clé API Groq (gratuit avec limites généreuses)
# Obtenir sur: https://console.groq.com
GROQ_API_KEY=
# Modèle Groq à utiliser (optionnel, défaut: llama-3.1-8b-instant)
GROQ_MODEL=llama-3.1-8b-instant

# ============================================
# 🌤️ MÉTÉO (Open-Meteo - Gratuit, utilisé par défaut)
# ============================================
# Aucune clé API nécessaire !
# Open-Meteo est utilisé automatiquement (gratuit, fiable, parfait pour la France)

# ============================================
# 🗺️ TRAFIC (Optionnel mais recommandé)
# ============================================
# Google Maps Directions API (gratuit jusqu'à 200$/mois)
# Obtenir sur: https://console.cloud.google.com
GOOGLE_MAPS_API_KEY=

# TomTom API (alternative à Google Maps)
# Obtenir sur: https://developer.tomtom.com/
TOMTOM_API_KEY=
# Clé TomTom pour le client (carte interactive)
NEXT_PUBLIC_TOMTOM_API_KEY=

# OpenRouteService API (optionnel)
OPENROUTESERVICE_API_KEY=

# ============================================
# 📅 GOOGLE CALENDAR & AUTHENTIFICATION (Optionnel)
# ============================================
# OAuth 2.0 pour Google Calendar et authentification Google
# Obtenir sur: https://console.cloud.google.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# URI de redirection pour OAuth Google
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
# URI de redirection spécifique pour Google Calendar
GOOGLE_CALENDAR_REDIRECT_URI=

# ============================================
# 👤 FACEBOOK AUTHENTIFICATION (Optionnel)
# ============================================
# OAuth pour l'authentification Facebook
# Obtenir sur: https://developers.facebook.com
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# ============================================
# 🏃 SANTÉ - Fitbit (Optionnel)
# ============================================
# OAuth pour la synchronisation Fitbit
# Obtenir sur: https://dev.fitbit.com/apps
FITBIT_CLIENT_ID=
FITBIT_CLIENT_SECRET=

# ============================================
# 📰 ACTUALITÉS - News API (Optionnel)
# ============================================
# Clé API pour les actualités
# Obtenir sur: https://newsapi.org
NEWS_API_KEY=

# ============================================
# ⚡ ÉNERGIE - SICEA (Optionnel)
# ============================================
# URL du portail SICEA pour le scraping des données de consommation
SICEA_PORTAL_URL=https://www.sicea.fr/espace-client
"@

# Écrire le contenu dans le fichier .env
$envContent | Out-File -FilePath ".env" -Encoding utf8 -NoNewline

Write-Host "Fichier .env cree avec succes !" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines etapes :" -ForegroundColor Yellow
Write-Host "1. Generez NEXTAUTH_SECRET et CRON_SECRET : npx tsx scripts/generate-secrets.ts" -ForegroundColor Cyan
Write-Host "2. Generez ENCRYPTION_KEY : npx tsx scripts/generate-encryption-key.ts" -ForegroundColor Cyan
Write-Host "3. Generez les cles VAPID : npx tsx scripts/generate-vapid-keys.ts" -ForegroundColor Cyan
Write-Host "4. Ajoutez vos cles API (GROQ_API_KEY, RESEND_API_KEY, etc.)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour plus de details, consultez: docs/api-keys-setup.md" -ForegroundColor Magenta

