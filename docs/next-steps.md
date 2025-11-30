# Prochaines Étapes - Synexa

## ✅ Ce qui est déjà fait

- ✅ Authentification complète (NextAuth + OAuth)
- ✅ Modèles Prisma (CalendarEvent, Routine, Device, Reminder, Task, etc.)
- ✅ API CRUD complètes (événements, routines, tâches, rappels)
- ✅ Connecteur Google Calendar (sync, création, mise à jour)
- ✅ Moteur de rappels intelligent (push/email/SMS avec trafic/météo)
- ✅ Éditeur de routines (triggers + actions)
- ✅ Dashboard de base
- ✅ Notifications (Resend, Web Push, SMS)
- ✅ Menu navigation amélioré
- ✅ **Création d'événements via langage naturel** (Groq + regex)
- ✅ **Automatisations en langage naturel** (Groq + regex)
- ✅ **Gestion des devices WiFi/Bluetooth** (mDNS/Bonjour + Web Bluetooth API)

## 🎯 Prochaines priorités (Phase 1 - MVP)

### 1. Commandes vocales basiques (Web Speech API) ⭐ PRIORITAIRE

**Objectif** : Permettre de créer des événements/tâches/automatisations en parlant

**À faire :**
- [ ] Créer composant `VoiceInput` avec Web Speech API
- [ ] Intégrer dans le dashboard et les formulaires
- [ ] Parser les commandes vocales ("Créer une tâche...", "Ajouter un événement...", "Quand je dis...")
- [ ] Utiliser les parsers existants (event-parser, routine-parser)
- [ ] Feedback visuel pendant l'écoute
- [ ] Gérer les erreurs (microphone non disponible, etc.)

**Fichiers à créer :**
- `app/components/VoiceInput.tsx` - Composant de saisie vocale
- `app/lib/ai/voice-commands.ts` - Parser de commandes vocales (utilise event-parser/routine-parser)

**Avantage :** Réutilise déjà les parsers de langage naturel existants !

### 2. Amélioration des tâches (priorité, contexte, regroupement)

**Objectif** : Rendre les tâches plus intelligentes

**À faire :**
- [ ] Ajouter champ `priority` (HIGH, MEDIUM, LOW) dans Prisma
- [ ] Ajouter champ `context` (WORK, PERSONAL, SHOPPING, etc.)
- [ ] Ajouter champ `estimatedDuration` (en minutes)
- [ ] Créer vue "Tâches intelligentes" avec regroupement automatique
- [ ] Suggérer des tâches similaires à regrouper
- [ ] Migration Prisma

**Fichiers à modifier :**
- `prisma/schema.prisma` - Ajouter champs Task
- `app/api/tasks/route.ts` - Mettre à jour API
- `app/components/TasksList.tsx` - Améliorer l'affichage
- `app/tasks/page.tsx` - Nouvelle vue intelligente

### 3. Webhooks Google Calendar (au lieu de polling)

**Objectif** : Synchronisation en temps réel au lieu de polling toutes les heures

**À faire :**
- [ ] Créer endpoint `/api/calendar/webhook` pour recevoir les notifications Google
- [ ] Implémenter `channel/watch` de Google Calendar API
- [ ] Stocker les channels dans la base (table `CalendarChannel`)
- [ ] Gérer l'expiration des channels (renouvellement automatique)
- [ ] Traiter les notifications (création, mise à jour, suppression)

**Fichiers à créer :**
- `app/api/calendar/webhook/route.ts` - Endpoint webhook
- `app/lib/google-calendar/webhooks.ts` - Gestion des channels
- Migration Prisma pour `CalendarChannel`

### 4. Brief quotidien amélioré

**Objectif** : Synthèse intelligente de la journée avec suggestions

**À faire :**
- [ ] Améliorer `/api/assistant/brief` avec :
  - Météo du jour
  - Suggestions de trajet (si événements avec lieu)
  - Tâches prioritaires
  - Rappels à venir
  - Suggestions de routines
- [ ] Ajouter génération de texte naturel (LLM optionnel)
- [ ] Créer composant `DailyBrief` avec animations

**Fichiers à modifier :**
- `app/api/assistant/brief/route.ts` - Enrichir la réponse
- `app/components/DailyBrief.tsx` - Nouveau composant

### 5. UI mobile-friendly améliorée

**Objectif** : Meilleure expérience sur mobile

**À faire :**
- [ ] Améliorer la navigation mobile (menu hamburger)
- [ ] Optimiser les formulaires pour mobile
- [ ] Ajouter swipe actions sur les listes
- [ ] Améliorer les cartes événements/tâches pour mobile
- [ ] Tester sur différents écrans

**Fichiers à modifier :**
- `app/components/Navigation.tsx` - Menu mobile
- Tous les composants de liste
- CSS responsive

## 🔮 Phase 2 (Plus tard)

### Domotique
- [ ] Connecteur Philips Hue
- [ ] Abstraction DeviceController
- [ ] Routines multi-pièces
- [ ] État en temps réel

### Bien-être
- [ ] Connecteur Apple Health
- [ ] Connecteur Fitbit
- [ ] Tableau de bord bien-être
- [ ] Alertes graduées

### Finance
- [ ] Suivi des factures
- [ ] Rappels de paiement
- [ ] Budgets

## 📝 Notes

- Les clés API (VAPID, Resend) peuvent être configurées plus tard
- Prioriser les fonctionnalités qui apportent le plus de valeur utilisateur
- Tester chaque fonctionnalité avant de passer à la suivante

