# Migration vers Supabase - Guide complet

## ✅ Ce qui a été fait

### 1. Export SQL
- ✅ `supabase/schema.sql` - Toutes les tables et enums
- ✅ `supabase/constraints.sql` - Contraintes UNIQUE et FOREIGN KEY
- ✅ `supabase/indexes.sql` - Tous les index d'optimisation

### 2. Suppression NextAuth
- ✅ Supprimé `app/api/auth/[...nextauth]/route.ts`
- ✅ Supprimé `app/lib/auth/prisma-adapter.ts`
- ✅ Supprimé `app/lib/auth/session.ts`
- ✅ Supprimé `types/next-auth.d.ts`

### 3. Suppression Prisma
- ✅ Supprimé `prisma/schema.prisma`
- ✅ Supprimé `prisma.config.ts`
- ✅ Supprimé `app/lib/prisma.ts`
- ✅ Mis à jour `package.json` (supprimé dépendances Prisma/NextAuth, ajouté Supabase)

### 4. Couche Supabase
- ✅ Créé `app/lib/supabase/client.ts` - Client Supabase
- ✅ Créé `app/lib/supabase/types.ts` - Types TypeScript
- ✅ Créé `app/lib/supabase/helpers.ts` - Helpers utilitaires
- ✅ Créé `app/lib/auth/mock.ts` - Authentification mock temporaire

## 📋 À faire maintenant

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer Supabase

1. Créez un projet Supabase sur https://supabase.com
2. Exécutez les fichiers SQL dans l'ordre :
   - `supabase/schema.sql`
   - `supabase/constraints.sql`
   - `supabase/indexes.sql`
3. Récupérez vos clés API depuis le dashboard Supabase
4. Ajoutez les variables d'environnement :

```env
NEXT_PUBLIC_SUPABASE_URL=https://hilrngenhjwjspqeemne.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpbHJuZ2VuaGp3anNwcWVlbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5Mjc5MTEsImV4cCI6MjA4MzUwMzkxMX0.acDC9VQkcaK32kSqiWPix_IIyvJ_nN1L6Uu-GagdFeA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpbHJuZ2VuaGp3anNwcWVlbW5lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkyNzkxMSwiZXhwIjoyMDgzNTAzOTExfQ.SSsWzrOPvXlRD4u4gguUSLl-HhQgj-yR-SabWiT2riY
```

### 3. Remplacer les appels Prisma par Supabase

#### Avant (Prisma) :
```typescript
import prisma from '@/app/lib/prisma';

const user = await prisma.user.findUnique({
  where: { id: userId }
});
```

#### Après (Supabase) :
```typescript
import { supabase } from '@/app/lib/supabase/client';

const { data: user, error } = await supabase
  .from('User')
  .select('*')
  .eq('id', userId)
  .single();
```

### 4. Fichiers à modifier

Les fichiers suivants contiennent encore des références à Prisma/NextAuth et doivent être mis à jour :

- `app/middleware.ts` - Remplacer la vérification de session NextAuth
- `app/providers.tsx` - Supprimer SessionProvider NextAuth
- `app/auth/signin/page.tsx` - Remplacer par un formulaire Supabase Auth
- Tous les fichiers dans `app/api/` qui utilisent `prisma`
- Tous les fichiers dans `app/lib/` qui utilisent `prisma`
- Tous les composants qui utilisent `useSession` de NextAuth

### 5. Authentification temporaire

En attendant d'implémenter Supabase Auth, utilisez le système mock :

```typescript
import { getCurrentUser, requireAuth } from '@/app/lib/auth/mock';

// Dans une route API
export async function GET() {
  requireAuth();
  const user = await getCurrentUser();
  // ...
}
```

## 🔄 Migration progressive

Vous pouvez migrer progressivement :

1. Commencez par les routes API les plus simples
2. Testez chaque route après migration
3. Migrez les composants un par un
4. Enfin, implémentez Supabase Auth pour remplacer le mock

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

