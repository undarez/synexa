# Architecture Cinexa Multi-Agents

## 🎯 Vue d'ensemble

Cinexa est un système multi-agents avec un orchestrateur central qui coordonne des agents spécialisés pour gérer la domotique, l'automatisation, le calendrier, la sécurité et les finances.

## 📁 Structure du projet

```
app/lib/cinexa/
├── types.ts                    # Interfaces TypeScript (Intent, Plan, AgentInput/Output)
├── core.ts                     # Cinexa Core Agent (orchestrateur principal)
├── services/
│   ├── supabase-service.ts     # Accès Supabase (contexte, mémoire)
│   ├── grok-service.ts          # Appels Grok (analyse intention, plan)
│   └── memory-service.ts       # Gestion mémoire long terme
├── agents/
│   ├── registry.ts             # Registre et exécution des agents
│   ├── domotic-agent.ts        # Contrôle devices domotiques
│   ├── automation-agent.ts     # Gestion automatisations
│   ├── calendar-agent.ts       # Gestion calendrier
│   ├── security-agent.ts       # Sécurité et monitoring
│   └── finance-agent.ts       # Gestion financière
└── README.md                   # Documentation détaillée

app/api/cinexa/
└── message/route.ts            # Point d'entrée API POST /api/cinexa/message
```

## 🔄 Flux d'exécution

```
┌─────────────────┐
│   User (UI)     │
│   Voice / API   │
└────────┬────────┘
         │ POST /api/cinexa/message
         ▼
┌─────────────────────────────┐
│   Cinexa Core Agent         │
│   (core.ts)                 │
│                             │
│   1. Charger contexte       │
│   2. Analyser intention     │
│   3. Construire plan         │
│   4. Exécuter plan           │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Agent Spécialisé          │
│   (domotic-agent.ts, etc.) │
│                             │
│   - Logique métier pure     │
│   - Appels Supabase/API      │
│   - Retour structuré        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Action réelle             │
│   - Supabase (DB)           │
│   - API IoT                 │
│   - Services externes       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Logs + Mémoire            │
│   - ExecutionLog            │
│   - AgentMemory (Supabase)  │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Réponse utilisateur       │
│   (message formaté)         │
└─────────────────────────────┘
```

## 🏗️ Principes architecturaux

### 1. Cinexa Core = Orchestrateur uniquement

**Responsabilités :**
- ✅ Analyser l'intention utilisateur (via Grok)
- ✅ Charger le contexte depuis Supabase
- ✅ Décider quel(s) agent(s) appeler
- ✅ Superviser l'exécution
- ✅ Logger et mettre à jour la mémoire

**Interdictions :**
- ❌ Ne fait JAMAIS l'action lui-même
- ❌ Ne connaît pas les détails des devices
- ❌ Ne connaît pas les APIs IoT

### 2. Agents spécialisés = Logique métier pure

**Caractéristiques :**
- ✅ Aucune IA dans les agents
- ✅ Logique métier uniquement
- ✅ Appels Supabase / API directs
- ✅ Retour structuré (AgentOutput)

**Exemple :**
```typescript
// domotic-agent.ts
export async function domoticAgent(input: AgentInput): Promise<AgentOutput> {
  // Logique métier pure
  const device = await getDevice(input.userId, input.parameters.deviceId);
  await updateDevice(device.id, { status: "on" });
  return { success: true, result: { deviceId: device.id } };
}
```

### 3. Grok = Stateless

**Caractéristiques :**
- ✅ Aucune mémoire interne
- ✅ Toute la mémoire vient de Supabase
- ✅ Contexte passé explicitement à chaque appel
- ✅ Résultats résumés et stockés dans AgentMemory

**Utilisation :**
- Analyse d'intention : `analyzeIntent({ message, context })`
- Construction de plan : `buildPlan({ intent, context })`

### 4. Supabase = Source de vérité

**Stockage :**
- ✅ Mémoire long terme (`AgentMemory`)
- ✅ État des devices (`Device`)
- ✅ Préférences utilisateur (`User.preferences`)
- ✅ Automatisations (`Routine`)
- ✅ Calendrier (`CalendarEvent`)

**Aucune donnée dans :**
- ❌ localStorage
- ❌ sessionStorage
- ❌ Variables globales

## 📊 Interfaces TypeScript

### CinexaIntent
```typescript
{
  intent: string;              // "create_automation", "control_device"
  confidence: number;          // 0.0 - 1.0
  requiredAgents: string[];   // ["domotic_agent"]
  requiredData: string[];      // ["devices", "preferences"]
  parameters?: Record<string, any>;
}
```

### CinexaPlan
```typescript
{
  intent: string;
  steps: CinexaPlanStep[];
  estimatedDuration?: number;
  requiresConfirmation?: boolean;
}
```

### AgentInput
```typescript
{
  userId: string;
  action: string;             // "turn_on", "create_rule"
  parameters: Record<string, any>;
  context?: CinexaUserContext;
  metadata?: { source, sessionId, timestamp };
}
```

### AgentOutput
```typescript
{
  success: boolean;
  result?: any;
  error?: string;
  logs?: string[];
  requiresUserConfirmation?: boolean;
  nextActions?: string[];
}
```

## 🚀 Utilisation

### Depuis le frontend

```typescript
const response = await fetch("/api/cinexa/message", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Allume la lumière du salon",
    source: "dashboard",
  }),
});

const result = await response.json();
// { success: true, message: "✅ Action exécutée avec succès.", ... }
```

### Depuis une routine

```typescript
import { handleUserMessage } from "@/app/lib/cinexa/core";

const result = await handleUserMessage(
  userId,
  "Vérifie le trafic pour mon rendez-vous",
  "routine"
);
```

## 🔧 Ajouter un nouvel agent

1. **Créer le fichier agent**
   ```typescript
   // app/lib/cinexa/agents/my-agent.ts
   export async function myAgent(input: AgentInput): Promise<AgentOutput> {
     // Logique métier
     return { success: true, result: {} };
   }
   ```

2. **Enregistrer dans le registry**
   ```typescript
   // app/lib/cinexa/agents/registry.ts
   agentRegistry.set("my_agent", myAgent);
   
   agentConfigs.set("my_agent", {
     name: "My Agent",
     description: "...",
     capabilities: ["action1", "action2"],
   });
   ```

3. **Ajouter les permissions** (si nécessaire)
   ```typescript
   requiredPermissions: ["my_agent:manage"]
   ```

## 📝 Tables Supabase

### AgentMemory
```sql
CREATE TABLE "AgentMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "intent" TEXT,
    "agents" TEXT[],
    "result" TEXT,
    "tokens" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
```

## 🔒 Sécurité

- ✅ Vérification d'authentification (`requireUser`)
- ✅ Vérification des permissions (à implémenter)
- ✅ Isolation des agents
- ✅ Logs de toutes les exécutions
- ✅ Aucune donnée sensible dans localStorage

## 🎯 Prochaines étapes

1. **Implémenter les APIs IoT réelles** dans les agents
2. **Système de permissions** pour les agents
3. **Edge Functions Supabase** pour les actions critiques
4. **Tests unitaires** pour chaque agent
5. **Monitoring et métriques** d'exécution

## 📚 Documentation

- Voir `app/lib/cinexa/README.md` pour plus de détails
- Voir les commentaires dans chaque fichier pour la documentation inline
