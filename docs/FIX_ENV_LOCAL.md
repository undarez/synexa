# 🔧 Solution au problème .env.local

## Problème identifié

Le fichier `.env.local` existe mais Next.js ne détecte pas les variables. Causes possibles :

1. **Cache Next.js** - Le cache `.next` peut empêcher le rechargement des variables
2. **Encodage du fichier** - Le fichier peut être dans un mauvais encodage
3. **Format incorrect** - Espaces, guillemets, ou caractères invisibles

## ✅ Solution Rapide

### Étape 1 : Supprimer le cache Next.js

```powershell
# Arrêtez d'abord le serveur (Ctrl+C)
Remove-Item -Recurse -Force .next
```

### Étape 2 : Vérifier/Recréer .env.local

**Option A : Via l'éditeur (Recommandé)**

1. Ouvrez `.env.local` dans VS Code
2. **Supprimez tout le contenu**
3. **Ajoutez ces lignes** (sans espaces, sans guillemets) :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon-très-longue
```

4. **Enregistrez** (Ctrl+S)
5. **Vérifiez l'encodage** : Dans VS Code, en bas à droite, cliquez sur l'encodage et sélectionnez "UTF-8"

**Option B : Via PowerShell**

```powershell
# Remplacez les valeurs par vos vraies clés Supabase
$content = @"
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon-très-longue
"@

$content | Out-File -FilePath .env.local -Encoding utf8 -NoNewline
```

### Étape 3 : Redémarrer le serveur

```bash
npm run dev
```

### Étape 4 : Vérifier

Visitez `http://localhost:3000/api/test-env`

Vous devriez voir :
```json
{
  "diagnostic": {
    "hasUrl": true,
    "hasKey": true,
    ...
  }
}
```

## 🔍 Diagnostic Avancé

Exécutez le script de diagnostic :

```powershell
powershell -ExecutionPolicy Bypass -File scripts/diagnostic-env.ps1
```

## ⚠️ Erreurs Courantes

### Erreur : Variables toujours non détectées après redémarrage

**Solution** :
1. Vérifiez qu'il n'y a **pas d'espaces** autour du `=`
2. Vérifiez qu'il n'y a **pas de guillemets**
3. Vérifiez que chaque variable est sur **une seule ligne**
4. Vérifiez l'**encodage** (doit être UTF-8)
5. **Supprimez le cache** `.next` et redémarrez

### Erreur : "Cannot read property of undefined"

**Solution** : Le serveur n'a pas été redémarré. Arrêtez (Ctrl+C) et relancez `npm run dev`

## 📝 Format Correct

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Points importants** :
- ✅ Pas d'espaces : `VARIABLE=valeur` (pas `VARIABLE = valeur`)
- ✅ Pas de guillemets : `VARIABLE=valeur` (pas `VARIABLE="valeur"`)
- ✅ Une variable par ligne
- ✅ Pas de point-virgule à la fin
- ✅ Encodage UTF-8

## 🚀 Si ça ne fonctionne toujours pas

1. **Vérifiez que vous êtes à la racine du projet** (même niveau que `package.json`)
2. **Vérifiez qu'il n'y a pas de `.env` qui écrase `.env.local`**
3. **Créez un nouveau fichier** `.env.local` depuis zéro
4. **Vérifiez les permissions** du fichier (sur Linux/Mac)

