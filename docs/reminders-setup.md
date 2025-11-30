# Moteur de Rappels Intelligents

Ce document explique le système de rappels intelligents de Synexa qui prend en compte le trafic et la météo.

## Fonctionnalités

- ✅ **Notifications multiples** : Push, Email, SMS
- ✅ **Calcul intelligent** : Prise en compte du trafic en temps réel
- ✅ **Informations météo** : Température et conditions pour s'habiller appropriément
- ✅ **Rappels automatiques** : Envoi automatique selon l'horaire calculé
- ✅ **Association aux événements** : Rappels liés aux événements du calendrier

## Utilisation

### Créer un rappel depuis un événement

1. Allez sur la page **Calendrier**
2. Cliquez sur l'icône 🔔 (cloche) à côté d'un événement
3. Remplissez le formulaire :
   - **Titre** : Titre du rappel
   - **Message** : Message personnalisé (optionnel)
   - **Type de notification** : Push, Email ou SMS
   - **Minutes avant** : Nombre de minutes avant l'événement
   - **Inclure le trafic** : Active le calcul du temps de trajet (nécessite un lieu pour l'événement)
   - **Inclure la météo** : Ajoute les informations météo

### Créer un rappel indépendant

1. Allez sur la page **Rappels**
2. Cliquez sur "Nouveau rappel"
3. Remplissez le formulaire (sans sélectionner d'événement)

## Calcul Intelligent

### Prise en compte du trafic

Quand l'option "Inclure le trafic" est activée :

1. Le système calcule le temps de trajet depuis votre adresse de travail vers le lieu de l'événement
2. Il ajuste automatiquement l'heure d'envoi du rappel pour tenir compte du trafic
3. Un buffer de sécurité de 10 minutes est ajouté
4. Le message inclut des informations sur l'état du trafic (fluide, ralenti, dense)

**Prérequis** :
- Avoir configuré votre adresse de travail dans le profil
- L'événement doit avoir un lieu défini

### Informations météo

Quand l'option "Inclure la météo" est activée :

1. Le système récupère la météo à votre adresse de travail
2. Le message inclut :
   - La température actuelle
   - Les conditions météorologiques
   - Des suggestions vestimentaires (manteau si froid, léger si chaud, parapluie si pluie)

**Prérequis** :
- Avoir configuré votre adresse de travail dans le profil

## Configuration du Job de Traitement

Pour que les rappels soient envoyés automatiquement, vous devez configurer un cron job qui appelle l'endpoint de traitement.

### Avec Vercel

Créez un fichier `vercel.json` à la racine du projet :

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

Cela vérifiera et enverra les rappels toutes les 5 minutes.

### Avec un service externe

Vous pouvez utiliser un service comme [cron-job.org](https://cron-job.org/) ou [EasyCron](https://www.easycron.com/) pour appeler l'endpoint :

```
POST https://votre-domaine.com/api/reminders/process
Authorization: Bearer <CRON_SECRET>
```

Ajoutez `CRON_SECRET` dans vos variables d'environnement pour sécuriser l'endpoint.

### Test manuel

Vous pouvez tester manuellement en appelant :

```bash
curl -X POST http://localhost:3000/api/reminders/process \
  -H "Authorization: Bearer votre_secret"
```

## Types de Notifications

### Push (Notifications navigateur)

- **Statut** : Structure prête, nécessite l'implémentation Web Push API
- **À implémenter** :
  - Service Worker pour recevoir les notifications
  - VAPID keys pour l'authentification
  - Service comme Firebase Cloud Messaging ou OneSignal

### Email

- **Statut** : Structure prête, nécessite un service d'email
- **Options** :
  - [Resend](https://resend.com/)
  - [SendGrid](https://sendgrid.com/)
  - [Nodemailer](https://nodemailer.com/) avec SMTP

### SMS

- **Statut** : Structure prête, nécessite un service SMS
- **Options** :
  - [Twilio](https://www.twilio.com/)
  - [Vonage](https://www.vonage.com/)
  - [AWS SNS](https://aws.amazon.com/sns/)

## API

### Créer un rappel

```http
POST /api/reminders
Content-Type: application/json

{
  "calendarEventId": "event_id",
  "title": "Rappel : Réunion",
  "message": "N'oubliez pas votre présentation",
  "reminderType": "PUSH",
  "minutesBefore": 15,
  "includeTraffic": true,
  "includeWeather": true
}
```

### Lister les rappels

```http
GET /api/reminders?status=PENDING
```

### Mettre à jour un rappel

```http
PATCH /api/reminders/:id
Content-Type: application/json

{
  "title": "Nouveau titre",
  "minutesBefore": 30
}
```

### Supprimer un rappel

```http
DELETE /api/reminders/:id
```

## Statuts des Rappels

- **PENDING** : En attente d'envoi
- **SENT** : Envoyé avec succès
- **FAILED** : Échec d'envoi
- **CANCELLED** : Annulé par l'utilisateur

## Limitations Actuelles

- Les notifications push nécessitent l'implémentation Web Push API
- Les emails nécessitent la configuration d'un service d'email
- Les SMS nécessitent la configuration d'un service SMS
- Le calcul du trafic utilise une API simulée (à remplacer par Google Directions API en production)
- La météo utilise une API simulée (à remplacer par OpenWeatherMap ou similaire en production)

## Prochaines Étapes

1. Implémenter Web Push API pour les notifications push
2. Configurer un service d'email (Resend recommandé)
3. Configurer un service SMS (Twilio recommandé)
4. Intégrer Google Directions API pour le trafic réel
5. Intégrer OpenWeatherMap pour la météo réelle
6. Ajouter des rappels récurrents
7. Ajouter des rappels avec plusieurs notifications (ex: 1h avant + 15min avant)




