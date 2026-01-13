# 🚀 Guide de Démarrage Rapide - Prochaines Étapes

## 📍 Où en sommes-nous ?

✅ **Backend solide** : Architecture multi-agents, connectors, permissions, error handling  
🔨 **À faire maintenant** : Authentification complète, Pricing, Préparation voix

---

## 🎯 Sprint 1 : Authentification (Commencez ici)

### Étape 1.1 : Email/Password - Service

**Fichier à créer :** `app/lib/auth/email-password.ts`

```typescript
"use client";

import { getBrowserClient } from "@/app/lib/supabase/client-browser";
import type { User, Session } from "@supabase/supabase-js";

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; error: Error | null }> {
  const supabase = getBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { user: data.user, error: error as Error | null };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ session: Session | null; error: Error | null }> {
  const supabase = getBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { session: data.session, error: error as Error | null };
}

export async function resetPassword(email: string): Promise<{ error: Error | null }> {
  const supabase = getBrowserClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  return { error: error as Error | null };
}
```

### Étape 1.2 : Formulaire Email Sign Up

**Fichier à créer :** `app/components/auth/EmailSignUpForm.tsx`

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { signUpWithEmail } from "@/app/lib/auth/email-password";
import { Loader2 } from "lucide-react";

export function EmailSignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { user, error: signUpError } = await signUpWithEmail(email, password);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (user) {
      setSuccess(true);
      // Rediriger ou afficher message de confirmation
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <p className="text-green-600">
          Vérifiez votre email pour confirmer votre compte.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <div>
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          disabled={loading}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Inscription...
          </>
        ) : (
          "S'inscrire"
        )}
      </Button>
    </form>
  );
}
```

### Étape 1.3 : Modale d'Inscription

**Fichier à créer :** `app/components/auth/SignUpModal.tsx`

```typescript
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { SignInButton } from "./SignInButton";
import { EmailSignUpForm } from "./EmailSignUpForm";

interface SignUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignUpModal({ open, onOpenChange }: SignUpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un compte</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="google" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="google">Google</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>
          <TabsContent value="google" className="mt-4">
            <SignInButton />
          </TabsContent>
          <TabsContent value="email" className="mt-4">
            <EmailSignUpForm />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

### Étape 1.4 : Pages d'Erreur

**Fichier à créer :** `app/(auth)/unauthorized/page.tsx`

```typescript
import Link from "next/link";
import { Button } from "@/app/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">401</h1>
        <h2 className="text-2xl font-semibold">Non autorisé</h2>
        <p className="text-muted-foreground max-w-md">
          Vous devez être connecté pour accéder à cette page.
        </p>
        <Link href="/auth/signin">
          <Button size="lg">Se connecter</Button>
        </Link>
      </div>
    </div>
  );
}
```

**Fichier à créer :** `app/(auth)/forbidden/page.tsx`

```typescript
import Link from "next/link";
import { Button } from "@/app/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">403</h1>
        <h2 className="text-2xl font-semibold">Accès refusé</h2>
        <p className="text-muted-foreground max-w-md">
          Vous n'avez pas la permission d'accéder à cette ressource.
        </p>
        <Link href="/dashboard">
          <Button size="lg">Retour au dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
```

---

## 💳 Sprint 2 : Abonnement (Après Sprint 1)

### Étape 2.1 : Migration Supabase

**Fichier à créer :** `supabase/migrations/001_subscription_system.sql`

```sql
-- Voir ARCHITECTURE_PRODUIT.md pour le schéma complet
-- Exécuter dans Supabase SQL Editor
```

### Étape 2.2 : Service Subscription

**Fichier à créer :** `app/lib/services/subscription-service.ts`

```typescript
import { createServerComponentClient } from "@/app/lib/supabase/server-client";

export type SubscriptionPlan = "FREE" | "PLUS" | "PRO";
export type SubscriptionStatus = "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIALING";

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getUserSubscription(
  userId: string
): Promise<Subscription | null> {
  const supabase = createServerComponentClient();
  const { data, error } = await supabase
    .from("Subscription")
    .select("*")
    .eq("userId", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Subscription;
}

export async function createFreeSubscription(
  userId: string
): Promise<Subscription> {
  const supabase = createServerComponentClient();
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data, error } = await supabase
    .from("Subscription")
    .insert({
      id: crypto.randomUUID(),
      userId,
      plan: "FREE",
      status: "ACTIVE",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Erreur création abonnement");
  }

  return data as Subscription;
}
```

---

## 🎤 Sprint 3 : Préparation Voix (Après Sprint 2)

### Étape 3.1 : Types Intent

**Fichier à créer :** `app/lib/cinexa/intents/intent-types.ts`

```typescript
export type IntentType =
  | "TURN_ON_DEVICE"
  | "TURN_OFF_DEVICE"
  | "SET_VALUE"
  | "GET_STATE"
  | "CREATE_AUTOMATION"
  | "UNKNOWN";

export interface Intent {
  type: IntentType;
  deviceId?: string;
  deviceName?: string;
  value?: number;
  valueType?: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface IntentParseResult {
  intent: Intent;
  rawText: string;
  entities: Record<string, any>;
}
```

### Étape 3.2 : Intent Parser (Mock)

**Fichier à créer :** `app/lib/cinexa/intents/intent-parser.ts`

```typescript
import type { Intent, IntentParseResult } from "./intent-types";

export async function parseIntent(
  text: string,
  userId: string
): Promise<IntentParseResult> {
  // TODO: Intégrer avec Open Assistant ou autre NLP
  // Pour l'instant, parser simple basé sur des mots-clés

  const lowerText = text.toLowerCase();

  // Détection basique
  if (lowerText.includes("allume") || lowerText.includes("active")) {
    return {
      intent: {
        type: "TURN_ON_DEVICE",
        deviceName: extractDeviceName(text),
        confidence: 0.8,
      },
      rawText: text,
      entities: {},
    };
  }

  if (lowerText.includes("éteint") || lowerText.includes("désactive")) {
    return {
      intent: {
        type: "TURN_OFF_DEVICE",
        deviceName: extractDeviceName(text),
        confidence: 0.8,
      },
      rawText: text,
      entities: {},
    };
  }

  return {
    intent: {
      type: "UNKNOWN",
      confidence: 0.1,
    },
    rawText: text,
    entities: {},
  };
}

function extractDeviceName(text: string): string | undefined {
  // Extraction basique - à améliorer avec NLP
  const words = text.split(" ");
  const deviceKeywords = ["lumière", "lampe", "thermostat", "volet"];
  return words.find((word) => deviceKeywords.includes(word.toLowerCase()));
}
```

---

## ✅ Checklist Implémentation

### Sprint 1 : Authentification
- [ ] Créer `app/lib/auth/email-password.ts`
- [ ] Créer `app/components/auth/EmailSignUpForm.tsx`
- [ ] Créer `app/components/auth/EmailSignInForm.tsx`
- [ ] Créer `app/components/auth/SignUpModal.tsx`
- [ ] Créer `app/(auth)/unauthorized/page.tsx`
- [ ] Créer `app/(auth)/forbidden/page.tsx`
- [ ] Améliorer `app/middleware.ts`

### Sprint 2 : Abonnement
- [ ] Créer migration Supabase
- [ ] Créer `app/lib/services/subscription-service.ts`
- [ ] Créer `app/lib/services/quota-service.ts`
- [ ] Créer `app/lib/services/pricing-config.ts`
- [ ] Créer `app/pricing/page.tsx`

### Sprint 3 : Voix
- [ ] Créer `app/lib/cinexa/intents/intent-types.ts`
- [ ] Créer `app/lib/cinexa/intents/intent-parser.ts`
- [ ] Créer `app/lib/cinexa/actions/action-executor.ts`
- [ ] Créer `app/api/cinexa/voice/route.ts`

---

## 🎯 Prochaine Action Immédiate

**Commencez par :**

1. Créer `app/lib/auth/email-password.ts` (copier le code ci-dessus)
2. Créer `app/components/auth/EmailSignUpForm.tsx` (copier le code ci-dessus)
3. Tester l'inscription email/password
4. Créer la modale d'inscription

**Temps estimé :** 2-3 heures

---

## 📚 Ressources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
