# Guide de configuration Supabase

## 📋 Étapes de configuration

### 1. Créer un projet Supabase

1. Allez sur https://supabase.com
2. Créez un compte ou connectez-vous
3. Créez un nouveau projet
4. Notez votre URL de projet et vos clés API

### 2. Exécuter le schéma SQL

1. Dans le dashboard Supabase, allez dans **SQL Editor**
2. Exécutez les fichiers dans cet ordre :

#### a) Créer les enums et tables
```sql
-- Copiez-collez le contenu de supabase/schema.sql
```

#### b) Ajouter les contraintes
```sql
-- Copiez-collez le contenu de supabase/constraints.sql
```

#### c) Créer les index
```sql
-- Copiez-collez le contenu de supabase/indexes.sql
```

### 3. Configurer les variables d'environnement

Créez un fichier `.env.local` avec :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon-publique
SUPABASE_SERVICE_ROLE_KEY=votre-clé-service-role-secrète

# Mock Auth (temporaire)
MOCK_USER_ID=mock-user-123
```

**Important** :
- `NEXT_PUBLIC_SUPABASE_URL` : Trouvable dans Settings > API > Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Trouvable dans Settings > API > Project API keys > anon public
- `SUPABASE_SERVICE_ROLE_KEY` : Trouvable dans Settings > API > Project API keys > service_role (⚠️ SECRET, ne jamais exposer côté client)

### 4. Installer les dépendances

```bash
npm install
```

Cela installera `@supabase/supabase-js` automatiquement.

### 5. Tester la connexion

Créez un fichier de test `scripts/test-supabase.ts` :

```typescript
import { supabase } from '../app/lib/supabase/client';

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('User')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Erreur:', error);
    } else {
      console.log('✅ Connexion Supabase réussie !');
    }
  } catch (err) {
    console.error('❌ Erreur de connexion:', err);
  }
}

testConnection();
```

Exécutez avec :
```bash
npx tsx scripts/test-supabase.ts
```

## 🔐 Authentification (à venir)

Pour l'instant, l'application utilise un système d'authentification mock. Pour implémenter Supabase Auth :

1. Activez l'authentification dans le dashboard Supabase
2. Configurez les providers (Email, Google, etc.)
3. Remplacez `app/lib/auth/mock.ts` par une implémentation Supabase Auth
4. Mettez à jour `app/middleware.ts` pour vérifier les sessions Supabase

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Guide Supabase Auth](https://supabase.com/docs/guides/auth)
- [Client JavaScript Supabase](https://supabase.com/docs/reference/javascript/introduction)

