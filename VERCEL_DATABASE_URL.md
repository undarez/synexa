# ⚠️ IMPORTANT : Configuration DATABASE_URL sur Vercel

## 🔴 Problème actuel

L'erreur "Callback" indique que le callback OAuth Google échoue. Cela se produit généralement parce que **`DATABASE_URL` n'est pas configuré sur Vercel**.

Avec `strategy: "database"`, NextAuth doit créer une session dans Supabase. Si la connexion à la base de données échoue, le callback OAuth échoue avec l'erreur "Callback".

## ✅ Solution : Configurer DATABASE_URL sur Vercel

### Étape 1 : Aller dans les paramètres Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous et sélectionnez votre projet **synexa-xi**
3. Allez dans **Settings** → **Environment Variables**

### Étape 2 : Ajouter DATABASE_URL

1. Cliquez sur **Add New**
2. **Key** : `DATABASE_URL`
3. **Value** : 
   ```
   postgresql://postgres:OaEuothDUnRZSMdN@db.deamqbfsidcgrrxsfwuf.supabase.co:5432/postgres
   ```
4. Sélectionnez **Production**, **Preview** et **Development**
5. Cliquez sur **Save**

### Étape 3 : Redéployer

Après avoir ajouté la variable d'environnement, vous devez redéployer :

1. Allez dans **Deployments**
2. Cliquez sur les **3 points** (⋯) du dernier déploiement
3. Cliquez sur **Redeploy**
4. Ou faites un nouveau commit et push

## 🔍 Vérification

Après le redéploiement, les logs Vercel devraient montrer :
- ✅ `🔐 [NEXTAUTH] signIn callback: { hasDatabaseUrl: true }`
- ✅ `➕ [NEXTAUTH] Event createUser:`
- ✅ `🔗 [NEXTAUTH] Event linkAccount:`

Si vous voyez `hasDatabaseUrl: false`, cela signifie que `DATABASE_URL` n'est toujours pas configuré.

## 📝 Note de sécurité

**Ne partagez jamais votre mot de passe de base de données publiquement.** Utilisez toujours des variables d'environnement.

