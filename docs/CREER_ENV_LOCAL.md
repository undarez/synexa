# 🔧 Créer le fichier .env.local avec Supabase

## Problème
Le fichier `.env.local` existe mais est **vide**. Les variables Supabase ne sont donc pas détectées.

## Solution : Ajouter les variables manuellement

### Option 1 : Via l'éditeur de code

1. **Ouvrez le fichier `.env.local`** dans votre éditeur (VS Code, etc.)

2. **Ajoutez ces lignes** (remplacez par vos vraies valeurs Supabase) :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon-très-longue-ici
```

### Option 2 : Via PowerShell

Exécutez cette commande (remplacez les valeurs) :

```powershell
@"
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon-très-longue-ici
"@ | Out-File -FilePath .env.local -Encoding utf8
```

## 📋 Où trouver les valeurs Supabase ?

### Si vous avez déjà un projet Supabase :

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans **Settings** → **API**
4. Copiez :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Si vous n'avez pas encore de projet Supabase :

1. Créez un compte sur https://supabase.com
2. Créez un nouveau projet
3. Attendez que le projet soit prêt (2-3 minutes)
4. Suivez les étapes ci-dessus pour récupérer les clés

## ✅ Vérification

Après avoir ajouté les variables :

1. **Redémarrez le serveur** :
   ```bash
   # Arrêtez avec Ctrl+C
   npm run dev
   ```

2. **Testez** : Visitez `http://localhost:3000/api/test-env`
   - Vous devriez voir `hasUrl: true` et `hasKey: true`

3. **Vérifiez les logs** : Au démarrage, vous ne devriez **plus** voir le message d'avertissement Supabase

## 📝 Format correct

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Important** :
- ✅ Pas d'espaces autour du `=`
- ✅ Pas de guillemets
- ✅ Pas de `;` ou `,` à la fin
- ✅ L'URL doit commencer par `https://`
- ✅ La clé est très longue (150+ caractères)

## 🚨 Erreurs courantes

❌ **Mauvais format** :
```env
NEXT_PUBLIC_SUPABASE_URL = "https://..."  # Espaces et guillemets
NEXT_PUBLIC_SUPABASE_URL=https://...;     # Point-virgule
```

✅ **Bon format** :
```env
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## 📚 Documentation complète

Consultez `SUPABASE_SETUP_GUIDE.md` pour :
- Créer le schéma de base de données
- Configurer les permissions (RLS)
- Migrer les données existantes

