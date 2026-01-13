# 🏗️ Architecture Produit - Plan de Développement

## 🎯 Vision Produit

**Cinexa** : Assistant personnel intelligent orienté domotique, automatisation, sécurité et organisation personnelle.

### Priorités Produit (dans l'ordre)

1. **Authentification complète** → Onboarding fluide
2. **Système d'abonnement** → Monétisation claire
3. **Préparation voix/IA** → Différenciation technique

---

## 📋 Phase 1 : Authentification Complète (PRIORITÉ #1)

### État actuel ✅

- ✅ Authentification Google OAuth via Supabase
- ✅ Middleware de protection des routes
- ✅ Hook `useAuth()` pour le client
- ✅ Synchronisation utilisateur Supabase → User table

### À compléter 🔨

#### 1.1 Email/Password Authentication

**Fichiers à créer :**

```
app/lib/auth/
├── email-password.ts          # Service email/password
└── password-reset.ts           # Service reset password

app/api/auth/
├── signup/route.ts             # Route inscription email/password
├── signin/route.ts             # Route connexion email/password
├── reset-password/route.ts    # Route demande reset
└── confirm-reset/route.ts      # Route confirmation reset

app/components/auth/
├── EmailSignInForm.tsx         # Formulaire connexion email
├── EmailSignUpForm.tsx          # Formulaire inscription email
└── PasswordResetForm.tsx        # Formulaire reset password
```

**Schéma Supabase :**

```sql
-- Pas de modification nécessaire, Supabase Auth gère déjà email/password
-- Vérifier que "Email" provider est activé dans Supabase Dashboard
```

**Implémentation :**

```typescript
// app/lib/auth/email-password.ts
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; error: Error | null }> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { user: data.user, error };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ session: Session | null; error: Error | null }> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { session: data.session, error };
}
```

#### 1.2 Modale d'Inscription Complète

**Fichier à créer :**

```
app/components/auth/
└── SignUpModal.tsx             # Modale complète avec onglets (Google / Email)
```

**Fonctionnalités :**

- Onglets : "Google" / "Email"
- Formulaire email avec validation
- Messages d'erreur clairs
- Redirection après inscription
- Gestion des états (loading, success, error)

**Design :**

```tsx
// Structure recommandée
<Dialog>
  <Tabs>
    <TabsList>
      <TabsTrigger value="google">Google</TabsTrigger>
      <TabsTrigger value="email">Email</TabsTrigger>
    </TabsList>
    <TabsContent value="google">
      <SignInButton />
    </TabsContent>
    <TabsContent value="email">
      <EmailSignUpForm />
    </TabsContent>
  </Tabs>
</Dialog>
```

#### 1.3 Pages d'Erreur (401 / 403)

**Fichiers à créer :**

```
app/
├── (auth)/
│   ├── unauthorized/
│   │   └── page.tsx            # Page 401 - Non authentifié
│   └── forbidden/
│       └── page.tsx            # Page 403 - Permission refusée
└── not-found.tsx               # Page 404 (si pas déjà existante)
```

**Implémentation :**

```typescript
// app/(auth)/unauthorized/page.tsx
export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">401</h1>
        <p className="mt-4 text-muted-foreground">
          Vous devez être connecté pour accéder à cette page.
        </p>
        <Link href="/auth/signin">
          <Button>Se connecter</Button>
        </Link>
      </div>
    </div>
  );
}
```

#### 1.4 Protection des Routes Renforcée

**Fichier à modifier :**

```
app/middleware.ts               # Améliorer la protection
```

**Améliorations :**

- Vérification des rôles utilisateur
- Redirection vers 401/403 selon le cas
- Gestion des routes publiques/privées
- Support des routes API protégées

**Exemple :**

```typescript
// app/middleware.ts
const protectedRoutes = ["/dashboard", "/settings", "/smart-home"];
const publicRoutes = ["/", "/auth", "/pricing"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const supabase = createServerClient(...);
  const { data: { user } } = await supabase.auth.getUser();

  // Route protégée sans utilisateur → 401
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!user) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // Route admin sans permission → 403
  if (pathname.startsWith("/admin")) {
    if (!user || !isAdmin(user)) {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }
  }

  return NextResponse.next();
}
```

---

## 💳 Phase 2 : Système d'Abonnement (PRIORITÉ #2)

### Architecture Abonnement

#### 2.1 Schéma Supabase

**Fichier à créer :**

```
supabase/
└── migrations/
    └── 001_subscription_system.sql
```

**Tables à créer :**

```sql
-- Plan d'abonnement
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PLUS', 'PRO');

-- Statut d'abonnement
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE', 'TRIALING');

-- Subscription
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialEnd" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Usage Quota (pour limiter les fonctionnalités)
CREATE TABLE "UsageQuota" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "quotaType" TEXT NOT NULL, -- 'devices', 'automations', 'voice_requests', etc.
    "limit" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly'
    "resetAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Indexes
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX "UsageQuota_userId_idx" ON "UsageQuota"("userId");
CREATE INDEX "UsageQuota_userId_quotaType_idx" ON "UsageQuota"("userId", "quotaType");

-- Constraints
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_key" UNIQUE ("userId");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "UsageQuota" ADD CONSTRAINT "UsageQuota_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
```

#### 2.2 Service d'Abonnement

**Fichiers à créer :**

```
app/lib/services/
├── subscription-service.ts      # Service principal
├── quota-service.ts            # Service quotas
└── pricing-config.ts           # Configuration des plans
```

**Implémentation :**

```typescript
// app/lib/services/pricing-config.ts
export const PRICING_PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    limits: {
      devices: 5,
      automations: 3,
      voiceRequests: 50, // par mois
      storage: 100, // MB
    },
  },
  PLUS: {
    name: "Plus",
    price: 9.99,
    limits: {
      devices: 50,
      automations: 20,
      voiceRequests: 500,
      storage: 1000,
    },
  },
  PRO: {
    name: "Pro",
    price: 19.99,
    limits: {
      devices: -1, // illimité
      automations: -1,
      voiceRequests: -1,
      storage: 10000,
    },
  },
} as const;

// app/lib/services/subscription-service.ts
export async function getUserSubscription(
  userId: string
): Promise<Subscription | null> {
  const supabase = createServerComponentClient();
  const { data } = await supabase
    .from("Subscription")
    .select("*")
    .eq("userId", userId)
    .single();
  return data;
}

export async function checkUserQuota(
  userId: string,
  quotaType: string
): Promise<{ allowed: boolean; remaining: number }> {
  const subscription = await getUserSubscription(userId);
  const plan = subscription?.plan || "FREE";
  const limit = PRICING_PLANS[plan].limits[quotaType];
  
  if (limit === -1) {
    return { allowed: true, remaining: Infinity };
  }

  const quota = await getUsageQuota(userId, quotaType);
  const remaining = limit - (quota?.used || 0);
  
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
  };
}
```

#### 2.3 Vérification des Droits

**Fichier à créer :**

```
app/lib/middleware/
└── subscription-guard.ts        # Guard pour vérifier les abonnements
```

**Utilisation :**

```typescript
// Dans les routes API
import { checkUserQuota } from "@/app/lib/services/subscription-service";

export async function POST(request: Request) {
  const { userId } = await getSession(request);
  
  // Vérifier le quota avant d'exécuter
  const quota = await checkUserQuota(userId, "devices");
  if (!quota.allowed) {
    return Response.json(
      { error: "Quota de devices dépassé. Passez à Plus ou Pro." },
      { status: 403 }
    );
  }
  
  // Continuer l'exécution
}
```

#### 2.4 Pages Pricing

**Fichiers à créer :**

```
app/
├── pricing/
│   └── page.tsx                # Page pricing avec comparaison des plans
└── components/
    └── pricing/
        ├── PricingCard.tsx     # Carte de plan
        ├── PricingTable.tsx    # Tableau comparatif
        └── UpgradePrompt.tsx   # Prompt d'upgrade
```

**Fonctionnalités :**

- Comparaison visuelle des plans
- CTA vers Stripe (ou autre payment provider)
- Affichage du plan actuel
- Gestion de l'upgrade/downgrade

---

## 🎤 Phase 3 : Préparation Voix / Open Assistant (PRIORITÉ #3)

### Architecture Intent/Action

#### 3.1 Séparation Intent / Action

**Principe :**

```
Voix → Intent Parser → Intent → Agent → Action → Device Service → Connector
```

**Fichiers à créer :**

```
app/lib/cinexa/
├── intents/
│   ├── intent-parser.ts        # Parse la voix en Intent
│   ├── intent-types.ts          # Types d'intents
│   └── intent-validator.ts     # Validation des intents
└── actions/
    ├── action-executor.ts      # Exécute les actions
    ├── action-types.ts          # Types d'actions
    └── action-guard.ts          # Vérifie permissions + quotas
```

**Implémentation :**

```typescript
// app/lib/cinexa/intents/intent-types.ts
export interface Intent {
  type: "TURN_ON_DEVICE" | "TURN_OFF_DEVICE" | "SET_VALUE" | "GET_STATE";
  deviceId?: string;
  deviceName?: string;
  value?: number;
  valueType?: string;
  confidence: number;
  metadata?: Record<string, any>;
}

// app/lib/cinexa/actions/action-executor.ts
export async function executeAction(
  userId: string,
  intent: Intent
): Promise<ActionResult> {
  // 1. Vérifier les permissions
  if (intent.deviceId) {
    const canControl = await canUserControlDevice(userId, intent.deviceId);
    if (!canControl) {
      return { success: false, error: "Permission refusée" };
    }
  }

  // 2. Vérifier les quotas
  const quota = await checkUserQuota(userId, "voiceRequests");
  if (!quota.allowed) {
    return { success: false, error: "Quota dépassé" };
  }

  // 3. Convertir Intent → Action
  const action = intentToAction(intent);

  // 4. Exécuter via Device Service (PAS directement les connectors)
  switch (action.type) {
    case "TURN_ON":
      return await turnOnDevice(userId, action.deviceId);
    case "TURN_OFF":
      return await turnOffDevice(userId, action.deviceId);
    // ...
  }
}
```

#### 3.2 Route API Voix

**Fichier à créer :**

```
app/api/cinexa/
└── voice/route.ts              # Endpoint pour les requêtes voix
```

**Implémentation :**

```typescript
// app/api/cinexa/voice/route.ts
export async function POST(request: Request) {
  const { userId } = await getSession(request);
  const { audio, transcript } = await request.json();

  // 1. Parser l'intent depuis le transcript (ou audio)
  const intent = await parseIntent(transcript, userId);

  // 2. Exécuter l'action
  const result = await executeAction(userId, intent);

  // 3. Incrémenter le quota
  await incrementQuota(userId, "voiceRequests");

  // 4. Retourner le résultat
  return Response.json(result);
}
```

---

## 📁 Structure Complète des Fichiers

### Fichiers à créer (ordre de priorité)

#### Phase 1 : Authentification

```
app/lib/auth/
├── email-password.ts
└── password-reset.ts

app/api/auth/
├── signup/route.ts
├── signin/route.ts
├── reset-password/route.ts
└── confirm-reset/route.ts

app/components/auth/
├── EmailSignInForm.tsx
├── EmailSignUpForm.tsx
├── PasswordResetForm.tsx
└── SignUpModal.tsx

app/(auth)/
├── unauthorized/page.tsx
└── forbidden/page.tsx
```

#### Phase 2 : Abonnement

```
supabase/migrations/
└── 001_subscription_system.sql

app/lib/services/
├── subscription-service.ts
├── quota-service.ts
└── pricing-config.ts

app/lib/middleware/
└── subscription-guard.ts

app/pricing/
└── page.tsx

app/components/pricing/
├── PricingCard.tsx
├── PricingTable.tsx
└── UpgradePrompt.tsx
```

#### Phase 3 : Voix

```
app/lib/cinexa/
├── intents/
│   ├── intent-parser.ts
│   ├── intent-types.ts
│   └── intent-validator.ts
└── actions/
    ├── action-executor.ts
    ├── action-types.ts
    └── action-guard.ts

app/api/cinexa/
└── voice/route.ts
```

---

## 🔒 Bonnes Pratiques Sécurité

### 1. Authentification

- ✅ Toujours vérifier la session côté serveur
- ✅ Utiliser RLS (Row Level Security) dans Supabase
- ✅ Hasher les mots de passe (Supabase le fait automatiquement)
- ✅ Valider les emails avant activation

### 2. Abonnement

- ✅ Vérifier les quotas AVANT l'exécution
- ✅ Logger toutes les tentatives de dépassement
- ✅ Utiliser des transactions pour l'incrémentation des quotas
- ✅ Ne jamais faire confiance au client pour les limites

### 3. Permissions

- ✅ Vérifier les permissions AVANT chaque action IoT
- ✅ Utiliser le Permission Service existant
- ✅ Refuser par défaut en cas d'erreur

---

## 🎨 UX Moderne

### Design System

- Utiliser shadcn/ui pour la cohérence
- Animations fluides (framer-motion)
- Feedback visuel immédiat
- Messages d'erreur clairs et actionnables

### Onboarding

1. **Page d'accueil** → CTA "Commencer"
2. **Inscription** → Modale simple (Google / Email)
3. **Onboarding** → 3 étapes : Nom, Préférences, Premier device
4. **Dashboard** → Vue d'ensemble avec tutoriel

### Pricing

- Comparaison visuelle claire
- Highlight du plan recommandé
- Test gratuit (14 jours)
- Upgrade/downgrade facile

---

## 📊 Ordre de Développement Recommandé

### Sprint 1 : Authentification (1-2 semaines)

1. ✅ Email/password signup
2. ✅ Email/password signin
3. ✅ Modale d'inscription
4. ✅ Pages 401/403
5. ✅ Protection routes renforcée

### Sprint 2 : Abonnement Base (1 semaine)

1. ✅ Schéma Supabase
2. ✅ Service subscription
3. ✅ Service quota
4. ✅ Vérification droits
5. ✅ Page pricing

### Sprint 3 : Abonnement Avancé (1 semaine)

1. ✅ Intégration Stripe
2. ✅ Webhooks Stripe
3. ✅ Gestion upgrade/downgrade
4. ✅ Quotas par fonctionnalité

### Sprint 4 : Préparation Voix (1 semaine)

1. ✅ Architecture Intent/Action
2. ✅ Intent parser
3. ✅ Action executor
4. ✅ Route API voix
5. ✅ Tests avec mock

---

## ✅ Checklist Finale

### Authentification
- [ ] Email/password signup
- [ ] Email/password signin
- [ ] Reset password
- [ ] Modale inscription
- [ ] Pages 401/403
- [ ] Protection routes

### Abonnement
- [ ] Schéma Supabase
- [ ] Service subscription
- [ ] Service quota
- [ ] Vérification droits
- [ ] Page pricing
- [ ] Intégration Stripe (optionnel)

### Voix
- [ ] Architecture Intent/Action
- [ ] Intent parser
- [ ] Action executor
- [ ] Route API voix
- [ ] Tests

---

## 🚀 Conclusion

**L'architecture backend est solide.** Il est temps de se concentrer sur :

1. **L'expérience utilisateur** (auth, onboarding)
2. **Le business model** (pricing, quotas)
3. **La différenciation** (voix, IA)

**Ne pas :**
- ❌ Continuer à raffiner l'architecture backend
- ❌ Ajouter des features IoT sans auth/pricing
- ❌ Ignorer l'UX

**Faire :**
- ✅ Finaliser l'authentification
- ✅ Mettre en place le pricing
- ✅ Préparer la voix proprement

**Prochaine étape concrète :** Implémenter l'authentification email/password et la modale d'inscription.
