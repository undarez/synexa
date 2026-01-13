# 🏗️ Schéma d'Architecture Cinexa

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Pages      │  │  Components  │  │   Hooks      │         │
│  │              │  │              │  │              │         │
│  │ - /dashboard │  │ - Auth       │  │ - useAuth()  │         │
│  │ - /pricing   │  │ - Pricing    │  │ - useSession │         │
│  │ - /settings  │  │ - Devices    │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API ROUTES (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │  /api/auth/*     │  │  /api/cinexa/*    │                  │
│  │                  │  │                   │                  │
│  │ - signup         │  │ - /voice          │                  │
│  │ - signin         │  │ - /message        │                  │
│  │ - reset-password │  │                   │                  │
│  └──────────────────┘  └──────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CINEXA CORE (Orchestrateur)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Cinexa Core Agent                                        │ │
│  │  - Parse Intent                                           │ │
│  │  - Route vers Agent Spécialisé                           │ │
│  │  - Gère le contexte                                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              AGENTS SPÉCIALISÉS (Sans IA)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Domotic     │  │  Automation  │  │  Security    │        │
│  │  Agent       │  │  Agent       │  │  Agent       │        │
│  │              │  │              │  │              │        │
│  │  - turnOn()  │  │  - create()  │  │  - check()    │        │
│  │  - turnOff() │  │  - execute() │  │  - alert()   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DEVICE SERVICE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │  Permission      │  │  Error Handler   │                  │
│  │  Service         │  │                   │                  │
│  │                  │  │  - Retry          │                  │
│  │  - canControl()  │  │  - Backoff         │                  │
│  │  - canRead()     │  │  - Logging         │                  │
│  └──────────────────┘  └──────────────────┘                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Device Service                                          │  │
│  │  - turnOnDevice()                                        │  │
│  │  - turnOffDevice()                                       │  │
│  │  - setDeviceValue()                                      │  │
│  │  - getDeviceState()                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONNECTOR REGISTRY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Connector Registry                                       │ │
│  │  - getConnectorForDevice()                                │ │
│  │  - buildConnectorConfig()                                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONNECTORS IoT                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Mock        │  │  Home         │  │  Hue         │        │
│  │  Connector   │  │  Assistant    │  │  Connector   │        │
│  │              │  │  Connector    │  │              │        │
│  │  (Par défaut)│  │  (Futur)      │  │  (Futur)     │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Source de Vérité)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Auth        │  │  Database    │  │  Storage     │        │
│  │              │  │              │  │              │        │
│  │  - Users     │  │  - Devices   │  │  - Files     │        │
│  │  - Sessions  │  │  - Subscriptions│  - Media     │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Flux d'exécution : Commande Voix

```
1. Utilisateur : "Allume la lumière du salon"
   │
   ▼
2. Frontend : POST /api/cinexa/voice
   │
   ▼
3. Intent Parser : Parse "allume la lumière du salon"
   │
   └─> Intent {
         type: "TURN_ON_DEVICE",
         deviceName: "lumière du salon",
         confidence: 0.9
       }
   │
   ▼
4. Cinexa Core : Route vers Domotic Agent
   │
   ▼
5. Domotic Agent : Appelle Device Service
   │
   ▼
6. Device Service :
   │  ├─> Permission Service : canUserControlDevice() ✅
   │  ├─> Quota Service : checkQuota() ✅
   │  └─> Connector Registry : getConnector()
   │
   ▼
7. Connector (Mock/Home Assistant/Hue) : turnOn()
   │
   ├─> Succès
   │   └─> Device Service : updateDeviceInSupabase()
   │
   └─> Erreur
       └─> Error Handler : Retry avec backoff
```

## Flux d'authentification

```
1. Utilisateur : Clique "Se connecter"
   │
   ▼
2. Frontend : useAuth().signInWithGoogle()
   │
   ▼
3. Supabase Auth : Redirige vers Google OAuth
   │
   ▼
4. Google : Authentifie l'utilisateur
   │
   ▼
5. Supabase Auth : Reçoit le callback
   │
   ▼
6. Middleware : Vérifie la session
   │
   ├─> Session valide
   │   └─> Redirige vers /dashboard
   │
   └─> Session invalide
       └─> Redirige vers /unauthorized
```

## Flux d'abonnement

```
1. Utilisateur : Inscription
   │
   ▼
2. Supabase Auth : Crée l'utilisateur
   │
   ▼
3. Subscription Service : createFreeSubscription()
   │
   └─> Crée Subscription { plan: "FREE", status: "ACTIVE" }
   │
   ▼
4. Quota Service : Initialise les quotas
   │
   └─> Crée UsageQuota { devices: 0/5, automations: 0/3, ... }
   │
   ▼
5. Utilisateur : Action (ex: créer un device)
   │
   ▼
6. Device Service : Vérifie le quota
   │
   ├─> Quota OK
   │   └─> Exécute l'action
   │
   └─> Quota dépassé
       └─> Retourne erreur + CTA upgrade
```

## Séparation des responsabilités

```
┌─────────────────────────────────────────────────────────────┐
│  AGENTS                                                      │
│  - Logique métier uniquement                                │
│  - Ne connaissent pas les vendors                           │
│  - Ne gèrent pas les erreurs                                │
│  - Ne vérifient pas les permissions                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DEVICE SERVICE                                              │
│  - Vérifie les permissions                                  │
│  - Vérifie les quotas                                       │
│  - Gère les retries                                          │
│  - Met à jour Supabase                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CONNECTORS                                                  │
│  - Appels API IoT uniquement                                │
│  - Gestion des erreurs réseau                               │
│  - Retournent un résultat structuré                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SUPABASE                                                    │
│  - Source de vérité                                          │
│  - Mis à jour uniquement après succès                       │
│  - RLS pour la sécurité                                      │
└─────────────────────────────────────────────────────────────┘
```

## Points d'extension futurs

```
┌─────────────────────────────────────────────────────────────┐
│  VOIX / IA                                                   │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Open        │  │  Speech-to-   │                        │
│  │  Assistant   │  │  Text         │                        │
│  │              │  │              │                        │
│  │  - NLP       │  │  - Whisper   │                        │
│  │  - Intent    │  │  - Web Speech│                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PAYMENT                                                     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Stripe      │  │  Webhooks    │                        │
│  │              │  │              │                        │
│  │  - Checkout  │  │  - Events    │                        │
│  │  - Billing   │  │  - Updates   │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```
