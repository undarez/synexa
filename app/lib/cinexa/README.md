# Architecture Cinexa Multi-Agents

## Vue d'ensemble

Cinexa est un système multi-agents avec un orchestrateur central (Cinexa Core) qui coordonne des agents spécialisés.

## Structure

```typescript
app/lib/cinexa/
├── types.ts                    # Interfaces TypeScript
├── core.ts                     # Cinexa Core Agent (orchestrateur)
├── services/
│   ├── supabase-service.ts     # Accès Supabase (contexte, mémoire)
│   ├── grok-service.ts          # Appels Grok (intent, plan)
│   └── memory-service.ts       # Gestion mémoire long terme
├── agents/
│   ├── registry.ts             # Registre des agents
│   ├── domotic-agent.ts        # Agent domotique
│   ├── automation-agent.ts     # Agent automatisation
│   ├── calendar-agent.ts       # Agent calendrier
│   ├── security-agent.ts       # Agent sécurité
│   └── finance-agent.ts        # Agent finance
└── README.md                   # Cette documentation
```

## Flux d'exécution

```text
User → POST /api/cinexa/message
  ↓
Cinexa Core Agent (core.ts)
  ├─ Charger contexte Supabase
  ├─ Analyser intention (Grok)
  ├─ Construire plan (Grok)
  └─ Exécuter plan
      ↓
  Agent Spécialisé (domotic-agent.ts, etc.)
      ↓
  Action réelle (API, Supabase)
      ↓
  Logs + Mémoire
      ↓
  Réponse utilisateur
```

## Principes clés

### 1. Cinexa Core = Orchestrateur uniquement

- ❌ Ne fait jamais l'action lui-même
- ✅ Analyse l'intention
- ✅ Charge le contexte
- ✅ Décide quel agent appeler
- ✅ Supervise l'exécution

### 2. Agents spécialisés = Logique métier pure

- ❌ Aucune IA dans les agents
- ✅ Logique métier uniquement
- ✅ Appels API / Supabase
- ✅ Retour structuré

### 3. Grok = Stateless

- ❌ Aucune mémoire interne
- ✅ Toute la mémoire vient de Supabase
- ✅ Contexte passé explicitement
- ✅ Résultats résumés et stockés

### 4. Supabase = Source de vérité

- ✅ Mémoire long terme
- ✅ État des devices
- ✅ Préférences utilisateur
- ✅ Logs d'exécution

## Utilisation

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
console.log(result.message); // "✅ Action exécutée avec succès."
```

### Depuis une routine

```typescript
// Dans une routine automatique
const result = await handleUserMessage(
  userId,
  "Vérifie le trafic pour mon rendez-vous",
  "routine"
);
```

## Ajouter un nouvel agent

1. Créer `app/lib/cinexa/agents/my-agent.ts`
2. Implémenter la fonction `myAgent(input: AgentInput): Promise<AgentOutput>`
3. Enregistrer dans `agents/registry.ts`
4. Ajouter la config dans `agentConfigs`

Exemple :

```typescript
// agents/my-agent.ts
export async function myAgent(input: AgentInput): Promise<AgentOutput> {
  // Logique métier ici
  return { success: true, result: {} };
}

// registry.ts
agentRegistry.set("my_agent", myAgent);
```

## Extensibilité

L'architecture est conçue pour être extensible :

- ✅ Ajouter de nouveaux agents facilement
- ✅ Ajouter de nouvelles capacités aux agents existants
- ✅ Modifier le comportement du Core sans casser les agents
- ✅ Tester chaque agent indépendamment

## Sécurité

- ✅ Vérification d'authentification (`requireUser`)
- ✅ Vérification des permissions (à implémenter)
- ✅ Isolation des agents
- ✅ Logs de toutes les exécutions
