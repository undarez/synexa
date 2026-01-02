# Synexa · Feuille de route

## 1. Vision & Identité

- **Mission** : offrir un·e assistant·e personnel(le) multimodal(e) (texte + voix) qui orchestre agenda, maison connectée et bien-être.
- **Personnalité** : chaleureuse, proactive, transparente sur ses limites, humour léger sur demande.
- **Nom & rôle** : `Synexa`, copilote contextuel gardant la mémoire des préférences, routines et objectifs.
- **Principes** : confidentialité contrôlable, suggestions avant actions, explications claires des décisions.

## 2. Domaines d’action prioritaires

1. **Gestion des rendez-vous** : import calendriers, compréhension langage naturel, rappels intelligents (lieu, trafic, météo).
2. **Organisation des tâches** : listes dynamiques (priorité, énergie, durée) et regroupement intelligent.
3. **Domotique vocale** : hub Matter/Thread + connecteurs Hue, HomeKit, Google Home, routines combinées (« tamise + musique »).
4. **Routines intelligentes** : scénarios « Je rentre », « Focus », triggers par voix, horaire ou géolocalisation.
5. **Bien-être & santé** : sync wearables (Apple Health, Fitbit, Withings) pour sommeil, hydratation, activité, alertes graduées.
6. **Synthèse personnelle** : briefs quotidiens, rappel paiements (EDF), état objectifs, recherche contextuelle (« Qu’ai-je prévu demain ? »).
7. **Mémoire longue durée** : préférences, contacts clés, historiques d’actions pour interactions naturelles.
8. **Confidentialité adaptative** : modes local-first vs cloud, audit log, consentements par connecteur.

## 3. Architecture Technique (draft)

- **Front** : Next.js App Router, server actions, UI multi-device (desktop, mobile web).
- **Auth** : NextAuth + Prisma + OAuth (Google, Facebook) + credentials (bcrypt). MFA ultérieurement.
- **Données** : Prisma sur SQLite dev, Postgres prod. Modèles prévus : `User`, `Task`, `Routine`, `Device`, `CalendarEvent`, `Preference`, `HealthMetric`.
- **IA/NLP** :
  - Interpréteur commandes (LangChain / OpenAI Realtime à terme).
  - Module de planification (priorisation tasks, suggestions routines).
- **Intégrations** :
  - Calendriers (Google/Outlook/iCloud) via OAuth + webhooks.
  - Domotique : abstractions `DeviceController` + connecteurs (Matter, Hue, HomeKit).
  - Santé : Apple HealthKit proxy, Fitbit, Withings.
- **Voix** : Web Speech API (MVP) puis WebRTC + TTS/ASR cloud.
- **Sécurité** : chiffrement repos (DB) + secrets via Edge Config/ENV, journaux audités.

## 4. Roadmap & Jalons

### Phase 0 · Socle (en cours)

- Authentification complète + onboarding préférences.
- Base UI dashboard (rendez-vous du jour, tâches, routine active).
- Documentation produit (présent fichier) + guidelines tonalité.

### Phase 1 · MVP Calendrier & Routines (Q1 2026)

- Modèles Prisma `CalendarEvent`, `Routine`, `Device`.
- Connecteur Google Calendar + création événement via langage naturel.
- Moteur de rappel intelligent (push/email + notification SMS optionnelle).
- Éditeur de routine : triggers (horaire/commande) + actions (domotique, rappel, média).
- UI mobile-friendly + commandes vocales basiques (Web Speech).

### Phase 2 · Domotique & Tâches intelligentes (Q2 2026)

- Intégration Hue + pont abstrait Matter/Thread.
- Gestion tâches enrichie (priorité, contexte, suggestion automatic grouping).
- Routines multi-pièces, état en temps réel, retour vocal.
- Déploiement mode hors-ligne partiel (stockage local chiffré).

### Phase 3 · Bien-être & Synthèse financière (S2 2026)

- Connecteurs santé (Apple Health, Fitbit).
- Tableau de bord bien-être (tendance sommeil, hydratation, activité).
- Modules finance/énergie (factures EDF, suivi budgets).
- Génération briefs quotidiens + réponses contextuelles (« Ai-je payé X ? »).

## 5. Backlog & Opportunités

- Suggestions proactives basées sur météo/trafic.
- API partenaires (skills externes).
- Mode famille (multi-utilisateurs, rôles).
- Marketplace routines prédéfinies (créateurs).
- Matrice conformité RGPD/IA Act + certifications (ISO, SOC2).

## 6. Risques & Gardes-fous

- **Silo données tiers** : prévoir abstractions + gestion rafraîchissement tokens.
- **Latence IA** : fallback local + réponses streaming.
- **Sécurité domotique** : sandbox commandes, confirmations vocales critiques.
- **Vie privée** : paramétrage granularité mémoire + bouton oubli.
- **Charge cognitive** : UI minimaliste avec priorisation automatique.

## 7. Prochaines actions (dev)

1. Définir schéma Prisma pour `CalendarEvent`, `Routine`, `Device`, `Preference`.
2. Créer endpoints/App Routes pour CRUD événements + routines.
3. Implémenter connecteur Google Calendar (OAuth + sync jobs).
4. Concevoir orchestrateur de routines côté serveur (queue + webhooks domotique).
5. Mettre en place design system (tokens, composants) et premières vues dashboard & routine builder.

Ce document servira de référence pour découper les issues GitHub/Trello et suivre la progression jusqu’au MVP 2026.

## 8. APIs & Connecteurs (draft)

### 8.1 App Routes / API

- `POST /api/auth/webhook` : callbacks OAuth (calendriers, domotique) et rafraîchissement tokens.
- `GET /api/calendar/events?from=&to=&source=` : requête filtrée.
- `POST /api/calendar/events` : création locale + option `syncSource`.
- `PATCH/DELETE /api/calendar/events/:id` : mise à jour/suppression avec propagation.
- `POST /api/calendar/import` : ingestion webhooks → file de traitement.
- `GET/POST/PATCH/DELETE /api/routines` : CRUD avec steps imbriqués.
- `POST /api/routines/:id/execute` : déclenchement manuel, réponse SSE pour suivre chaque step.
- `GET/POST/PATCH/DELETE /api/devices` : inventaire domotique.
- `POST /api/devices/:id/command` : commandes (`turn_on`, `set_temperature`, etc.).
- `GET/PATCH /api/preferences` : lecture/écriture des préférences (ton, notifications, confidentialité).
- `GET /api/assistant/brief` : synthèse quotidienne (agenda, tâches, santé, paiements).

### 8.2 Connecteurs Calendrier

- **Google Calendar** : OAuth (scopes `calendar`), stockage refresh token, webhooks `channel/watch`, mapping `CalendarEvent.externalId`. Gestion des conflits via `etag`, delta sync.
- **Outlook/Graph** : OAuth v2, scopes `Calendars.ReadWrite`, `delta` queries, webhooks Graph (notifications différées).
- **iCloud/CalDAV** : tokens app-spécifiques, polling programmé, conversion vers format interne.

### 8.3 Connecteurs Domotique

- Abstraction `DeviceController` avec méthodes `discover`, `executeCommand`, `subscribeState`.
- **Hue** : app key bridge + WebSocket v2 pour état en temps réel.
- **Matter/Thread** : intégration via hub local (Home Assistant, esp32) exposant API REST/WS.
- **HomeKit** : passerelle `homebridge` → API HTTP sécurisée.
- **Google Home / Alexa** : phase ultérieure (Smart Home actions/intents).

### 8.4 Santé & Bien-être

- **Apple Health** : app compagnon mobile, export HealthKit → API backend, stockage agrégé `HealthMetric`.
- **Fitbit / Withings** : OAuth + webhooks (poids, sommeil). Normalisation unités, calcul tendances glissantes.

### 8.5 Sécurité & Confidentialité

- Middleware NextAuth + vérification ownership (`userId`) sur toutes routes.
- Secrets connecteurs via `Edge Config` / `ENV`, tokens sensibles chiffrés (AES-GCM).
- Audit log pour actions critiques (domotique, santé).
- Préférences pour choisir mode `cloud`, `hybride`, `local-only` + purge programmée de l’historique.
