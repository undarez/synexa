# 🚀 Comment commencer avec Supabase - Guide pour débutants

## 📚 Partie 1 : Comprendre Supabase (5 minutes)

### Qu'est-ce que Supabase ?
Supabase est une base de données PostgreSQL avec une API REST automatique. C'est comme avoir :
- Une base de données PostgreSQL (comme votre ancienne base Prisma)
- Une API REST automatique (chaque table = une API)
- Un client JavaScript simple à utiliser

### Concepts de base

#### 1. Tables = Vos modèles Prisma
```sql
-- Votre ancien modèle Prisma :
model Task {
  id String @id
  title String
  userId String
}

-- En Supabase, c'est une table SQL :
CREATE TABLE "Task" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "userId" TEXT NOT NULL
);
```

#### 2. Requêtes Prisma → Supabase
```typescript
// ❌ AVANT (Prisma)
const tasks = await prisma.task.findMany({
  where: { userId: user.id }
});

// ✅ APRÈS (Supabase)
const { data: tasks, error } = await supabase
  .from('Task')
  .select('*')
  .eq('userId', user.id);
```

---

## 🎯 Partie 2 : Configuration Supabase (10 minutes)

### Étape 1 : Créer un compte et projet
1. Allez sur **https://supabase.com**
2. Cliquez sur **"Start your project"** (gratuit)
3. Créez un compte
4. Créez un nouveau projet
   - Nom : `synexa` (ou ce que vous voulez)
   - Mot de passe : Choisissez un mot de passe fort
   - Région : Choisissez la plus proche (Europe = `eu-west-1`)

### Étape 2 : Exécuter le schéma SQL
1. Dans votre projet Supabase, cliquez sur **SQL Editor** (menu gauche)
2. Cliquez sur **New query**
3. Exécutez les fichiers dans cet ordre :

#### a) Créer les tables
- Ouvrez `supabase/schema.sql` dans votre éditeur
- **Copiez tout le contenu** (Ctrl+A, Ctrl+C)
- Collez dans l'éditeur SQL de Supabase
- Cliquez sur **Run** (ou appuyez sur Ctrl+Enter)
- ✅ Vous devriez voir "Success. No rows returned"

#### b) Ajouter les contraintes
- Ouvrez `supabase/constraints.sql`
- Copiez tout le contenu
- Collez dans l'éditeur SQL
- Cliquez sur **Run**
- ✅ Vous devriez voir "Success"

#### c) Créer les index
- Ouvrez `supabase/indexes.sql`
- Copiez tout le contenu
- Collez dans l'éditeur SQL
- Cliquez sur **Run**
- ✅ Vous devriez voir "Success"

### Étape 3 : Récupérer vos clés API
1. Dans Supabase, allez dans **Settings** → **API** (menu gauche)
2. Vous verrez 3 choses importantes :

```
Project URL: https://xxxxx.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Créez un fichier `.env.local` à la racine de votre projet :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Important** : 
- `NEXT_PUBLIC_SUPABASE_URL` : URL publique (sécurisée)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé publique (sécurisée pour le client)
- `SUPABASE_SERVICE_ROLE_KEY` : Clé secrète (⚠️ NE JAMAIS exposer côté client !)

### Étape 4 : Vérifier que ça fonctionne
1. Dans Supabase, allez dans **Table Editor** (menu gauche)
2. Vous devriez voir toutes vos tables : `User`, `Task`, `Routine`, etc.
3. Si vous voyez les tables, ✅ **C'est bon !**

---

## 📝 Partie 3 : Votre première migration (exemple complet)

### Exemple : J'ai migré `app/api/tasks/route.ts` pour vous

**Ce qui a été fait** :
- ✅ GET : Récupérer les tâches avec filtres
- ✅ POST : Créer une nouvelle tâche

**Vous pouvez maintenant** :
1. Tester la route migrée
2. Utiliser cet exemple pour migrer les autres routes

### Comment tester

#### Test 1 : Vérifier que Supabase fonctionne
```bash
# Dans votre terminal
npm run dev
```

Puis dans votre navigateur :
```
http://localhost:3000/api/tasks
```

Si vous voyez `{"tasks":[]}`, ✅ **Ça fonctionne !** (vide car pas de données encore)

#### Test 2 : Créer une tâche
Utilisez Postman, Thunder Client, ou curl :

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Ma première tâche","priority":"HIGH"}'
```

#### Test 3 : Vérifier dans Supabase
1. Allez dans **Table Editor** → **Task**
2. Vous devriez voir votre tâche créée !

---

## 🔄 Partie 4 : Comment migrer les autres fichiers

### Méthode pas à pas

#### Étape 1 : Choisir un fichier simple
Commencez par un fichier simple, par exemple :
- `app/api/preferences/route.ts` (plus simple)
- `app/api/profile/route.ts` (moyen)

#### Étape 2 : Ouvrir le fichier
```bash
# Ouvrez dans votre éditeur
app/api/preferences/route.ts
```

#### Étape 3 : Identifier les appels Prisma
Cherchez toutes les lignes avec `prisma.` :
```typescript
const prefs = await prisma.preference.findMany({...});
const pref = await prisma.preference.create({...});
```

#### Étape 4 : Convertir selon le tableau de conversion

| Prisma | Supabase |
|--------|----------|
| `prisma.model.findMany()` | `supabase.from('Model').select('*')` |
| `prisma.model.findUnique()` | `supabase.from('Model').select('*').eq('id', id).single()` |
| `prisma.model.create()` | `supabase.from('Model').insert({...}).select().single()` |
| `prisma.model.update()` | `supabase.from('Model').update({...}).eq('id', id).select().single()` |
| `prisma.model.delete()` | `supabase.from('Model').delete().eq('id', id)` |
| `where: { userId }` | `.eq('userId', userId)` |
| `where: { completed: false }` | `.eq('completed', false)` |
| `orderBy: { priority: "desc" }` | `.order('priority', { ascending: false })` |

#### Étape 5 : Ajouter la gestion d'erreurs
```typescript
const { data, error } = await supabase.from('Model').select('*');

if (error) {
  console.error('Erreur:', error);
  return NextResponse.json({ error: error.message }, { status: 500 });
}

// Utiliser data
return NextResponse.json({ data });
```

#### Étape 6 : Tester
1. Redémarrez le serveur : `npm run dev`
2. Testez la route avec Postman/curl
3. Vérifiez les logs Supabase (Dashboard → Logs)

---

## 🎓 Partie 5 : Conversions courantes

### 1. findUnique (récupérer un élément)
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

if (error) {
  console.error('Erreur:', error);
  return null;
}
```

### 2. findMany avec filtres
```typescript
// PRISMA
const tasks = await prisma.task.findMany({
  where: {
    userId: user.id,
    completed: false,
    priority: "HIGH"
  },
  orderBy: { createdAt: "desc" }
});

// SUPABASE
const { data: tasks, error } = await supabase
  .from('Task')
  .select('*')
  .eq('userId', user.id)
  .eq('completed', false)
  .eq('priority', 'HIGH')
  .order('createdAt', { ascending: false });
```

### 3. Filtres de date
```typescript
// PRISMA
const tasks = await prisma.task.findMany({
  where: {
    due: {
      gte: startDate,  // >=
      lte: endDate     // <=
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

### 4. create (créer)
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
const now = new Date().toISOString();
const { data: task, error } = await supabase
  .from('Task')
  .insert({
    userId: user.id,
    title: "Nouvelle tâche",
    priority: "HIGH",
    createdAt: now,
    updatedAt: now
  })
  .select()
  .single();
```

### 5. update (mettre à jour)
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

### 6. delete (supprimer)
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

if (error) {
  console.error('Erreur:', error);
}
```

---

## 🛠️ Partie 6 : Outils utiles

### 1. SQL Editor de Supabase
**Où** : Dashboard → SQL Editor
**Utilité** : Tester vos requêtes SQL directement
**Exemple** :
```sql
-- Tester une requête
SELECT * FROM "Task" WHERE "userId" = 'test-id';
```

### 2. Table Editor
**Où** : Dashboard → Table Editor
**Utilité** : Voir vos données, ajouter/modifier manuellement
**Astuce** : Utile pour vérifier que vos migrations fonctionnent

### 3. Logs
**Où** : Dashboard → Logs
**Utilité** : Voir toutes les requêtes SQL exécutées
**Astuce** : Aide à déboguer les problèmes

---

## ✅ Checklist pour chaque migration

Pour chaque fichier que vous migrez :

- [ ] 1. Remplacer `import prisma` par `import { supabase }`
- [ ] 2. Convertir chaque `prisma.model.*` selon le tableau de conversion
- [ ] 3. Ajouter la gestion d'erreurs (`if (error)`)
- [ ] 4. Convertir les dates en ISO string (`.toISOString()`)
- [ ] 5. Ajouter `createdAt` et `updatedAt` dans les insert/update
- [ ] 6. Tester la route avec Postman/curl
- [ ] 7. Vérifier les logs Supabase
- [ ] 8. Vérifier les données dans Table Editor

---

## 🎯 Plan de migration recommandé

### Semaine 1 : Routes simples (2-3 heures)
1. ✅ `app/api/tasks/route.ts` (déjà fait pour vous)
2. `app/api/preferences/route.ts`
3. `app/api/profile/route.ts`

### Semaine 2 : Routes moyennes (3-4 heures)
4. `app/api/calendar/events/route.ts`
5. `app/api/reminders/route.ts`
6. `app/api/routines/route.ts`

### Semaine 3 : Routes complexes (4-5 heures)
7. `app/api/tasks/[taskId]/route.ts`
8. `app/api/routines/[routineId]/route.ts`
9. Autres routes avec relations

### Semaine 4 : Fichiers lib/ (5-6 heures)
10. `app/lib/learning/tracker.ts`
11. `app/lib/dashboard/widget-suggestions.ts`
12. `app/lib/ai/proactive-suggestions.ts`

---

## 🐛 Problèmes courants et solutions

### Problème 1 : "relation does not exist"
**Cause** : La table n'existe pas
**Solution** : Vérifiez que vous avez exécuté `schema.sql`

### Problème 2 : "column does not exist"
**Cause** : Nom de colonne incorrect
**Solution** : Vérifiez le nom exact dans `schema.sql` (attention à la casse)

### Problème 3 : "permission denied"
**Cause** : RLS (Row Level Security) bloque
**Solution** : Allez dans **Authentication** → **Policies** et désactivez temporairement RLS

### Problème 4 : Données vides
**Cause** : Filtre incorrect
**Solution** : Vérifiez dans Table Editor que les données existent

---

## 💡 Conseils pour débutants

1. **Commencez petit** : Une route à la fois
2. **Testez souvent** : Après chaque conversion
3. **Utilisez les logs** : Très utiles pour déboguer
4. **Gardez le stub** : Ne supprimez pas `app/lib/prisma.ts` tout de suite
5. **Documentez** : Notez les patterns que vous découvrez

---

## 📚 Ressources

- **Documentation Supabase** : https://supabase.com/docs
- **Client JavaScript** : https://supabase.com/docs/reference/javascript/introduction
- **Exemples** : https://supabase.com/docs/guides/database/querying

---

## 🎉 Félicitations !

Vous avez maintenant :
- ✅ Configuré Supabase
- ✅ Exécuté le schéma SQL
- ✅ Vu un exemple de migration complète (`app/api/tasks/route.ts`)
- ✅ Les outils pour migrer les autres fichiers

**Prochaine étape** : Migrez `app/api/preferences/route.ts` en suivant le même pattern !

Bon courage ! 🚀

