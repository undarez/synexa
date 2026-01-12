# Exemple de migration complète : app/api/tasks/route.ts

## 📋 Fichier à migrer
`app/api/tasks/route.ts` - Route API pour gérer les tâches (CRUD complet)

---

## 🔍 Étape 1 : Analyser le fichier actuel

### Code actuel (Prisma)
```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
import { trackActivity } from "@/app/lib/learning/tracker";
import type { Task, Prisma, TaskPriority, TaskContext } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const completed = searchParams.get("completed");
    const priority = searchParams.get("priority");
    const context = searchParams.get("context");

    const where: Prisma.TaskWhereInput = { userId: user.id };

    if (completed !== null) {
      where.completed = completed === "true";
    }

    if (priority) {
      where.priority = priority as TaskPriority;
    }

    if (context) {
      where.context = context as TaskContext;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { priority: "desc" },
        { due: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
```

---

## ✏️ Étape 2 : Conversion vers Supabase

### Code converti (Supabase)
```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase/client";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
import { trackActivity } from "@/app/lib/learning/tracker";
import type { Task, TaskPriority, TaskContext } from "@/app/lib/prisma-types";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const completed = searchParams.get("completed");
    const priority = searchParams.get("priority");
    const context = searchParams.get("context");

    // Construire la requête Supabase
    let query = supabase
      .from('Task')
      .select('*')
      .eq('userId', user.id);

    // Ajouter les filtres
    if (completed !== null) {
      query = query.eq('completed', completed === "true");
    }

    if (priority) {
      const validPriorities: TaskPriority[] = ["HIGH", "MEDIUM", "LOW"];
      if (validPriorities.includes(priority as TaskPriority)) {
        query = query.eq('priority', priority);
      }
    }

    if (context) {
      const validContexts: TaskContext[] = ["PERSONAL", "WORK", "SHOPPING", "HEALTH", "OTHER"];
      if (validContexts.includes(context as TaskContext)) {
        query = query.eq('context', context);
      }
    }

    // Ajouter le tri
    query = query
      .order('priority', { ascending: false })
      .order('due', { ascending: true, nullsFirst: false })
      .order('createdAt', { ascending: false });

    // Exécuter la requête
    const { data: tasks, error } = await query;

    // Gérer les erreurs
    if (error) {
      console.error('[API Tasks] Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des tâches', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error) {
    console.error('[API Tasks] Erreur:', error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
```

---

## 🔑 Points clés de la conversion

### 1. Import
```typescript
// AVANT
import prisma from "@/app/lib/prisma";

// APRÈS
import { supabase } from "@/app/lib/supabase/client";
```

### 2. Construction de requête
```typescript
// AVANT (objet where)
const where = { userId: user.id, completed: false };
const tasks = await prisma.task.findMany({ where });

// APRÈS (chaînage de méthodes)
let query = supabase.from('Task').select('*').eq('userId', user.id);
if (completed !== null) {
  query = query.eq('completed', completed === "true");
}
const { data: tasks, error } = await query;
```

### 3. Tri multiple
```typescript
// AVANT
orderBy: [
  { priority: "desc" },
  { due: { sort: "asc", nulls: "last" } }
]

// APRÈS
.order('priority', { ascending: false })
.order('due', { ascending: true, nullsFirst: false })
```

### 4. Gestion d'erreurs
```typescript
// AVANT (try/catch uniquement)
try {
  const tasks = await prisma.task.findMany();
} catch (error) {
  // ...
}

// APRÈS (vérification error)
const { data: tasks, error } = await query;
if (error) {
  console.error('Erreur:', error);
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

---

## 🧪 Étape 3 : Tester la migration

### Test 1 : Récupérer toutes les tâches
```bash
curl http://localhost:3000/api/tasks
```

### Test 2 : Filtrer par complétion
```bash
curl "http://localhost:3000/api/tasks?completed=false"
```

### Test 3 : Filtrer par priorité
```bash
curl "http://localhost:3000/api/tasks?priority=HIGH"
```

### Vérifier dans Supabase
1. Allez dans **Table Editor** → **Task**
2. Vérifiez que les données sont correctes
3. Allez dans **Logs** pour voir les requêtes SQL exécutées

---

## 📝 Checklist de migration

Pour cette route spécifique :

- [x] Remplacer `import prisma` par `import { supabase }`
- [x] Convertir `prisma.task.findMany()` en `supabase.from('Task').select()`
- [x] Convertir les filtres `where` en `.eq()`
- [x] Convertir `orderBy` en `.order()`
- [x] Ajouter la gestion d'erreurs `if (error)`
- [x] Tester avec curl/Postman
- [x] Vérifier les logs Supabase
- [x] Vérifier les données dans Table Editor

---

## 🎯 Prochaine route à migrer

Une fois cette route migrée et testée, passez à :
- `app/api/tasks/[taskId]/route.ts` (GET, PUT, DELETE pour une tâche spécifique)

