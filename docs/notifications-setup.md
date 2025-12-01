# Configuration des Notifications

Ce guide explique comment configurer les notifications (Email, Push, SMS) pour Synexa.

## 📧 Email avec Resend (Gratuit jusqu'à 3000 emails/mois)

### 1. Créer un compte Resend

1. Allez sur [resend.com](https://resend.com)
2. Créez un compte gratuit
3. Vérifiez votre domaine ou utilisez `onboarding@resend.dev` pour les tests

### 2. Obtenir votre clé API

1. Allez dans **API Keys** dans votre dashboard Resend
2. Créez une nouvelle clé API
3. Copiez la clé

### 3. Configurer les variables d'environnement

Ajoutez à votre fichier `.env`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=Synexa <noreply@votre-domaine.com>
```

**Note:** Pour les tests, vous pouvez utiliser `onboarding@resend.dev` comme email d'expéditeur.

## 🔔 Push Notifications (Web Push API - Gratuit)

### 1. Générer les clés VAPID

Exécutez le script de génération:

```bash
npx tsx scripts/generate-vapid-keys.ts
```

Cela générera deux clés (publique et privée).

### 2. Configurer les variables d'environnement

Ajoutez à votre fichier `.env`:

```env
VAPID_PUBLIC_KEY=BFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_SUBJECT=mailto:votre-email@exemple.com
```

**Note:** Le `VAPID_SUBJECT` doit être un email valide (format `mailto:`).

### 3. Enregistrer le Service Worker

Le service worker est déjà créé dans `public/sw.js`. Il sera automatiquement enregistré par le navigateur.

### 4. Activer les notifications dans l'application

Les utilisateurs devront autoriser les notifications dans leur navigateur. Une fois autorisées, les subscriptions seront enregistrées automatiquement.

## 📱 SMS (Simulation pour l'instant)

Le service SMS est actuellement en mode simulation. Pour activer un service réel:

### Option 1: Twilio (Recommandé)

1. Créez un compte sur [twilio.com](https://www.twilio.com)
2. Obtenez votre `Account SID` et `Auth Token`
3. Obtenez un numéro de téléphone Twilio

Ajoutez à votre fichier `.env`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

Puis décommentez le code dans `app/lib/services/sms.ts`.

**Note:** Twilio offre un crédit gratuit pour commencer.

## 🧪 Tester les notifications

### Email

1. Créez un rappel avec le type "Email"
2. Attendez que le cron job l'envoie (ou testez manuellement)
3. Vérifiez votre boîte email

### Push

1. Autorisez les notifications dans votre navigateur
2. Créez un rappel avec le type "Push"
3. Attendez que le cron job l'envoie
4. Vous devriez recevoir une notification du navigateur

### SMS

1. Ajoutez un numéro de téléphone dans les métadonnées du rappel
2. Créez un rappel avec le type "SMS"
3. Attendez que le cron job l'envoie
4. Vérifiez votre téléphone (si configuré avec Twilio)

## 🔄 Cron Job pour l'envoi automatique

Pour que les rappels soient envoyés automatiquement, configurez un cron job qui appelle:

```
POST /api/reminders/process
Authorization: Bearer <CRON_SECRET>
```

Toutes les 5 minutes (recommandé).

### Avec Vercel

Créez `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/reminders/process",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### En local

Utilisez un service comme [cron-job.org](https://cron-job.org) qui appelle votre serveur via un tunnel (ngrok).

## 📝 Variables d'environnement complètes

```env
# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=Synexa <noreply@votre-domaine.com>

# Push (Web Push API)
VAPID_PUBLIC_KEY=BFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_SUBJECT=mailto:votre-email@exemple.com

# SMS (Twilio - optionnel)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Cron Secret
CRON_SECRET=votre_secret_aleatoire
```

## ⚠️ Notes importantes

1. **Resend**: Gratuit jusqu'à 3000 emails/mois, puis payant
2. **Web Push**: Totalement gratuit, mais nécessite HTTPS en production
3. **Twilio**: Payant mais avec crédit gratuit au départ
4. **Sécurité**: Ne partagez JAMAIS vos clés privées (VAPID_PRIVATE_KEY, TWILIO_AUTH_TOKEN, etc.)

## 🐛 Dépannage

### Les emails ne sont pas envoyés

- Vérifiez que `RESEND_API_KEY` est correct
- Vérifiez les logs du serveur
- En développement, les emails sont simulés si la clé n'est pas définie

### Les notifications push ne fonctionnent pas

- Vérifiez que les clés VAPID sont configurées
- Vérifiez que le service worker est enregistré
- Les notifications push nécessitent HTTPS en production
- Vérifiez la console du navigateur pour les erreurs

### Les SMS ne sont pas envoyés

- Vérifiez que Twilio est configuré (ou utilisez la simulation)
- Vérifiez que le numéro de téléphone est au bon format (+33...)
- Vérifiez les logs du serveur



