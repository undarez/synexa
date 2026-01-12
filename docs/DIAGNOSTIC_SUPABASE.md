# 🔍 Diagnostic des Variables d'Environnement Supabase

## Problème Actuel

Les erreurs `ENOTFOUND placeholder.supabase.co` indiquent que les variables d'environnement Supabase ne sont **pas détectées** par Next.js.

## ✅ Vérifications à Effectuer

### 1. Format du fichier `.env.local`

Assurez-vous que le fichier `.env.local` à la racine du projet contient :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon-très-longue
```

**Points importants :**
- ✅ Pas d'espaces avant ou après le `=`
- ✅ Pas de guillemets autour des valeurs
- ✅ Pas de `;` ou `,` à la fin
- ✅ Le préfixe `NEXT_PUBLIC_` est **obligatoire** pour les variables accessibles côté client

### 2. Emplacement du fichier

Le fichier `.env.local` doit être à la **racine du projet** (même niveau que `package.json`) :

```
synexa-main/
├── .env.local          ← ICI
├── .env
├── package.json
├── app/
└── ...
```

### 3. Redémarrer le serveur

**IMPORTANT** : Après avoir modifié `.env.local`, vous **DEVEZ** redémarrer le serveur :

```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer
npm run dev
```

Next.js ne recharge **pas automatiquement** les variables d'environnement.

### 4. Vérifier que les variables sont chargées

Ajoutez temporairement ce code dans `app/lib/supabase/client.ts` pour déboguer :

```typescript
console.log('🔍 DEBUG Supabase Config:');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Présente' : '❌ Manquante');
console.log('KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Présente' : '❌ Manquante');
console.log('URL value:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...');
```

### 5. Vérifier le format de l'URL

L'URL Supabase doit ressembler à :
- ✅ `https://xxxxxxxxxxxxx.supabase.co`
- ❌ `http://...` (pas de http)
- ❌ `https://supabase.co/...` (mauvais format)
- ❌ `placeholder.supabase.co` (c'est le placeholder)

### 6. Vérifier la clé

La clé anon Supabase est très longue (environ 150+ caractères). Vérifiez qu'elle n'a pas été tronquée.

## 🛠️ Solution Rapide

1. **Vérifiez le contenu de `.env.local`** :
   ```bash
   cat .env.local
   # ou sur Windows PowerShell:
   Get-Content .env.local
   ```

2. **Vérifiez qu'il n'y a pas de doublons** dans `.env` et `.env.local` (`.env.local` a la priorité)

3. **Redémarrez complètement le serveur** :
   ```bash
   # Arrêter (Ctrl+C)
   npm run dev
   ```

4. **Vérifiez les logs au démarrage** - vous devriez voir :
   ```
   ✓ Ready in XXXms
   ```
   **SANS** le message d'avertissement Supabase

## 📝 Exemple de `.env.local` Correct

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## ⚠️ Si le Problème Persiste

1. **Vérifiez que le fichier n'est pas dans `.gitignore`** (c'est normal, mais vérifiez qu'il existe)

2. **Créez un fichier de test** pour vérifier que Next.js charge les variables :
   ```typescript
   // Créez app/test-env/route.ts temporairement
   export async function GET() {
     return Response.json({
       hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
       hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
       urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30),
     });
   }
   ```
   Puis visitez `http://localhost:3000/test-env`

3. **Vérifiez les permissions du fichier** (sur Linux/Mac)

## 🎯 Une Fois Configuré

Une fois les variables correctement configurées, vous ne devriez **plus** voir :
- ❌ `ENOTFOUND placeholder.supabase.co`
- ❌ `⚠️ Variables d'environnement Supabase manquantes`

Et vous devriez voir les requêtes Supabase fonctionner normalement.

