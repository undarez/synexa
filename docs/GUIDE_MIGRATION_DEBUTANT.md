# Guide de migration pour débutants - Supabase

## 🎯 Objectif
Migrer progressivement votre application de Prisma vers Supabase, en commençant par les routes API les plus simples.

---

## 📚 Partie 1 : Comprendre Supabase (5 minutes)

### Qu'est-ce que Supabase ?
Supabase est une alternative open-source à Firebase, basée sur PostgreSQL. C'est une base de données avec :
- **Interface SQL** : Vous pouvez écrire du SQL directement
- **API REST automatique** : Chaque table a une API REST
- **Client JavaScript** : Bibliothèque simple pour interagir avec la base
- **Auth intégré** : Système d'authentification complet

### Concepts de base

#### 1. Tables = Modèles Prisma
```sql
-- En Prisma, vous aviez :
model User {
  id String @id
  email String
}

-- En Supabase (SQL), c'est :
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT
);
```

#### 2. Requêtes Prisma → Supabase
```typescript
// PRISMA (avant)
const user = await prisma.user.findUnique({
  where: { id: userId }
});

// SUPABASE (après)
const { data: user, error } = await supabase
  .from('User')
  .select('*')
  .eq('id', userId)
  .single();
```

---

## 🚀 Partie 2 : Configuration initiale (10 minutes)

### Étape 1 : Créer un compte Supabase
1. Allez sur https://supabase.com
2. Cliquez sur "Start your project"
3. Créez un compte (gratuit jusqu'à 500 MB)
4. Créez un nouveau projet

### Étape 2 : Exécuter le schéma SQL
1. Dans votre projet Supabase, allez dans **SQL Editor** (menu de gauche)
2. Cliquez sur **New query**
3. Exécutez les fichiers dans cet ordre :

#### a) Créer les tables
- Ouvrez `supabase/schema.sql`
- Copiez tout le contenu
- Collez dans l'éditeur SQL
- Cliquez sur **Run** (ou Ctrl+Enter)

#### b) Ajouter les contraintes
- Ouvrez `supabase/constraints.sql`
- Copiez tout le contenu
- Collez dans l'éditeur SQL
- Cliquez sur **Run**

#### c) Créer les index
- Ouvrez `supabase/indexes.sql`
- Copiez tout le contenu
- Collez dans l'éditeur SQL
- Cliquez sur **Run**

### Étape 3 : Récupérer les clés API
1. Dans Supabase, allez dans **Settings** → **API**
2. Copiez ces valeurs :

```env
# Project URL
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co

# anon public key (sécurisée pour le client)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# service_role key (SECRÈTE, uniquement serveur)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

3. Ajoutez-les dans votre fichier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon
SUPABASE_SERVICE_ROLE_KEY=votre-clé-service-role
```

### Étape 4 : Installer les dépendances
```bash
npm install
```

---

## 📝 Partie 3 : Votre première migration (15 minutes)

### Exemple : Migrer `app/api/tasks/route.ts`

#### Étape 1 : Ouvrir le fichier
```bash
# Ouvrez dans votre éditeur
app/api/tasks/route.ts
```

#### Étape 2 : Comprendre le code actuel
```typescript
// AVANT (Prisma)
import prisma from "@/app/lib/prisma";

const tasks = await prisma.task.findMany({
  where: { userId: user.id },
  orderBy: { priority: "desc" }
});
```

#### Étape 3 : Convertir en Supabase

**Règle de base** :
- `prisma.model.findMany()` → `supabase.from('Model').select()`
- `where: { userId }` → `.eq('userId', userId)`
- `orderBy: { priority: "desc" }` → `.order('priority', { ascending: false })`

**Code converti** :
```typescript
// APRÈS (Supabase)
import { supabase } from "@/app/lib/supabase/client";

const { data: tasks, error } = await supabase
  .from('Task')
  .select('*')
  .eq('userId', user.id)
  .order('priority', { ascending: false });

if (error) {
  console.error('Erreur Supabase:', error);
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

#### Étape 4 : Gérer les erreurs
Supabase retourne toujours `{ data, error }`. Toujours vérifier `error` :

```typescript
const { data, error } = await supabase.from('Task').select('*');

if (error) {
  // Gérer l'erreur
  console.error('Erreur:', error);
  return NextResponse.json({ error: error.message }, { status: 500 });
}

// Utiliser data
return NextResponse.json({ tasks: data });
```

---

## 🔄 Partie 4 : Conversions courantes

### 1. findUnique → select().eq().single()
```typescript
// PRISMA
const user = await prisma.user.findUnique({
  where: { id: userId }
});

// SUPABASE
const { data: user, error } = await supabase
  .from('User')
  .select('*')
  .eq('id', userId)
  .single();
```

### 2. findMany avec filtres
```typescript
// PRISMA
const tasks = await prisma.task.findMany({
  where: {
    userId: user.id,
    completed: false,
    priority: "HIGH"
  }
});

// SUPABASE
const { data: tasks, error } = await supabase
  .from('Task')
  .select('*')
  .eq('userId', user.id)
  .eq('completed', false)
  .eq('priority', 'HIGH');
```

### 3. Filtres de date
```typescript
// PRISMA
const tasks = await prisma.task.findMany({
  where: {
    due: {
      gte: startDate,  // greater than or equal
      lte: endDate     // less than or equal
    }
  }
});

// SUPABASE
const { data: tasks, error } = await supabase
  .from('Task')
  .select('*')
  .gte('due', startDate.toISOString())
  .lte('due', endDate.toISOString());
```

### 4. create
```typescript
// PRISMA
const task = await prisma.task.create({
  data: {
    userId: user.id,
    title: "Nouvelle tâche",
    priority: "HIGH"
  }
});

// SUPABASE
const { data: task, error } = await supabase
  .from('Task')
  .insert({
    userId: user.id,
    title: "Nouvelle tâche",
    priority: "HIGH",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
  .select()
  .single();
```

### 5. update
```typescript
// PRISMA
const task = await prisma.task.update({
  where: { id: taskId },
  data: { completed: true }
});

// SUPABASE
const { data: task, error } = await supabase
  .from('Task')
  .update({ 
    completed: true,
    updatedAt: new Date().toISOString()
  })
  .eq('id', taskId)
  .select()
  .single();
```

### 6. delete
```typescript
// PRISMA
await prisma.task.delete({
  where: { id: taskId }
});

// SUPABASE
const { error } = await supabase
  .from('Task')
  .delete()
  .eq('id', taskId);
```

### 7. upsert
```typescript
// PRISMA
const widget = await prisma.dashboardWidget.upsert({
  where: { userId_widgetType: { userId, widgetType } },
  update: { position: 1 },
  create: { userId, widgetType, position: 1 }
});

// SUPABASE
// Supabase n'a pas d'upsert direct, il faut utiliser insert avec onConflict
const { data: widget, error } = await supabase
  .from('DashboardWidget')
  .upsert({
    userId,
    widgetType,
    position: 1,
    updatedAt: new Date().toISOString()
  }, {
    onConflict: 'userId,widgetType'
  })
  .select()
  .single();
```

### 8. Relations (include)
```typescript
// PRISMA
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { tasks: true }
});

// SUPABASE
// Option 1 : Deux requêtes séparées
const { data: user } = await supabase
  .from('User')
  .select('*')
  .eq('id', userId)
  .single();

const { data: tasks } = await supabase
  .from('Task')
  .select('*')
  .eq('userId', userId);

// Option 2 : Une seule requête avec select imbriqué (si relation définie)
const { data: user } = await supabase
  .from('User')
  .select(`
    *,
    tasks:Task(*)
  `)
  .eq('id', userId)
  .single();
```

---

## 🎯 Partie 5 : Plan de migration progressif

### Phase 1 : Routes API simples (1-2 heures)

#### 1.1 Commencer par `app/api/tasks/route.ts`
**Pourquoi** : C'est une route CRUD simple, bonne pour apprendre

**Étapes** :
1. Ouvrir le fichier
2. Remplacer `import prisma` par `import { supabase }`
3. Convertir chaque `prisma.task.*` selon les exemples ci-dessus
4. Ajouter la gestion d'erreurs
5. Tester avec Postman ou le navigateur

**Exemple de conversion complète** :
```typescript
// AVANT
const tasks = await prisma.task.findMany({
  where: { userId: user.id, completed: false },
  orderBy: { priority: "desc" }
});

// APRÈS
const { data: tasks, error } = await supabase
  .from('Task')
  .select('*')
  .eq('userId', user.id)
  .eq('completed', false)
  .order('priority', { ascending: false });

if (error) {
  console.error('Erreur récupération tâches:', error);
  return NextResponse.json(
    { error: 'Erreur lors de la récupération des tâches' },
    { status: 500 }
  );
}
```

#### 1.2 Continuer avec les autres routes simples
- `app/api/preferences/route.ts`
- `app/api/profile/route.ts` (plus complexe, mais important)

### Phase 2 : Routes API moyennes (2-3 heures)

#### 2.1 Routes avec relations
- `app/api/calendar/events/route.ts`
- `app/api/reminders/route.ts`

#### 2.2 Routes avec filtres complexes
- `app/api/tasks/[taskId]/route.ts`
- `app/api/routines/route.ts`

### Phase 3 : Fichiers lib/ (3-4 heures)

#### 3.1 Services simples
- `app/lib/dashboard/widget-suggestions.ts`
- `app/lib/learning/tracker.ts`

#### 3.2 Services complexes
- `app/lib/ai/proactive-suggestions.ts`
- `app/lib/routines/engine.ts`

### Phase 4 : Authentification (1-2 heures)

#### 4.1 Implémenter Supabase Auth
- Remplacer `app/lib/auth/mock.ts` par Supabase Auth
- Mettre à jour `app/auth/signin/page.tsx`
- Mettre à jour `app/middleware.ts`

---

## 🛠️ Partie 6 : Outils et astuces

### Outil 1 : SQL Editor de Supabase
- **Où** : Dashboard Supabase → SQL Editor
- **Utilité** : Tester vos requêtes SQL directement
- **Exemple** :
```sql
-- Tester une requête
SELECT * FROM "Task" WHERE "userId" = 'test-user-id';
```

### Outil 2 : Table Editor de Supabase
- **Où** : Dashboard Supabase → Table Editor
- **Utilité** : Voir vos données, ajouter/modifier manuellement
- **Astuce** : Utile pour vérifier que vos migrations fonctionnent

### Outil 3 : Logs Supabase
- **Où** : Dashboard Supabase → Logs
- **Utilité** : Voir toutes les requêtes SQL exécutées
- **Astuce** : Aide à déboguer les problèmes

### Astuce 1 : Toujours convertir les dates
```typescript
// Prisma accepte Date directement
where: { due: new Date() }

// Supabase nécessite ISO string
.eq('due', new Date().toISOString())
```

### Astuce 2 : Gérer les champs JSON
```typescript
// Prisma
metadata: { key: "value" }

// Supabase (même chose, mais vérifier le type dans le schéma)
metadata: { key: "value" }  // Fonctionne si la colonne est JSONB
```

### Astuce 3 : Gérer les valeurs null
```typescript
// Prisma
where: { description: null }

// Supabase
.is('description', null)
```

---

## ✅ Checklist pour chaque migration

Pour chaque fichier que vous migrez :

- [ ] 1. Remplacer `import prisma` par `import { supabase }`
- [ ] 2. Convertir chaque `prisma.model.*` en `supabase.from('Model').*`
- [ ] 3. Ajouter la gestion d'erreurs (`if (error)`)
- [ ] 4. Convertir les dates en ISO string
- [ ] 5. Tester la route avec Postman/Thunder Client
- [ ] 6. Vérifier les logs Supabase pour les erreurs SQL
- [ ] 7. Vérifier que les données sont correctes dans Table Editor

---

## 🐛 Résolution de problèmes courants

### Problème 1 : "relation does not exist"
**Cause** : La table n'existe pas dans Supabase
**Solution** : Vérifiez que vous avez exécuté `schema.sql`

### Problème 2 : "column does not exist"
**Cause** : La colonne n'existe pas dans la table
**Solution** : Vérifiez le nom de la colonne dans `schema.sql` (attention à la casse)

### Problème 3 : "permission denied"
**Cause** : RLS (Row Level Security) bloque l'accès
**Solution** : Désactivez temporairement RLS ou configurez les politiques

### Problème 4 : Données vides retournées
**Cause** : Filtre incorrect ou données inexistantes
**Solution** : Vérifiez dans Table Editor que les données existent

---

## 📚 Ressources d'apprentissage

1. **Documentation officielle** : https://supabase.com/docs
2. **Client JavaScript** : https://supabase.com/docs/reference/javascript/introduction
3. **Exemples de requêtes** : https://supabase.com/docs/guides/database/querying

---

## 🎓 Exercice pratique : Migrer votre première route

### Exercice : `app/api/tasks/route.ts`

1. **Ouvrez le fichier** dans votre éditeur
2. **Identifiez toutes les utilisations de `prisma.task`**
3. **Convertissez-les une par une** selon les exemples ci-dessus
4. **Testez** avec :
   ```bash
   # Dans votre terminal
   curl http://localhost:3000/api/tasks
   ```
5. **Vérifiez les logs** dans Supabase Dashboard → Logs

**Si ça fonctionne** : ✅ Vous avez réussi votre première migration !
**Si ça ne fonctionne pas** : Vérifiez les logs Supabase et les erreurs dans la console

---

## 💡 Conseils pour débutants

1. **Commencez petit** : Migrez une route à la fois
2. **Testez souvent** : Après chaque conversion, testez
3. **Utilisez les logs** : Les logs Supabase sont très utiles
4. **Ne supprimez pas le stub** : Gardez `app/lib/prisma.ts` jusqu'à ce que toutes les migrations soient faites
5. **Documentez vos conversions** : Notez les patterns que vous découvrez

---

## 🚀 Prochaines étapes

Une fois que vous avez migré quelques routes :
1. Migrez les routes API restantes
2. Migrez les fichiers `app/lib/`
3. Implémentez Supabase Auth
4. Supprimez le stub `app/lib/prisma.ts`
5. Testez l'application complète

Bon courage ! 🎉

