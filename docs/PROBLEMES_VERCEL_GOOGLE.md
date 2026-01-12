# 🔴 Pourquoi Google OAuth ne fonctionne pas sur Vercel (alors que ça marche en local)

## 📋 Analyse de votre configuration

D'après les images que vous avez partagées, votre configuration semble correcte :
- ✅ Variables d'environnement configurées sur Vercel
- ✅ URIs de redirection dans Google Console
- ✅ NEXTAUTH_URL configuré

**Mais voici les raisons spécifiques à Vercel qui peuvent empêcher ça de fonctionner :**

---

## 🔴 PROBLÈME #1 : Redéploiement nécessaire après modification des variables

**C'est probablement le problème principal !**

### Le problème :
Quand vous modifiez des variables d'environnement sur Vercel, **elles ne sont pas automatiquement appliquées aux déploiements existants**. Vercel utilise les variables d'environnement **au moment du build**, pas au runtime.

### Solution :
1. Allez dans votre projet Vercel
2. Cliquez sur **"Deployments"**
3. Cliquez sur les **3 points** (⋯) du dernier déploiement
4. Sélectionnez **"Redeploy"**
5. OU créez un nouveau déploiement en poussant un commit

**⚠️ IMPORTANT :** Si vous avez ajouté/modifié `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, ou `GOOGLE_CLIENT_SECRET` après le déploiement, vous **DEVEZ** redéployer !

---

## 🔴 PROBLÈME #2 : NEXTAUTH_URL avec slash final

### Le problème :
Vercel peut être sensible au slash final dans `NEXTAUTH_URL`. Si vous avez :
```
NEXTAUTH_URL=https://synexa-xi.vercel.app/
```
au lieu de :
```
NEXTAUTH_URL=https://synexa-xi.vercel.app
```

NextAuth peut générer des URIs de callback incorrectes.

### Solution :
1. Allez dans **Settings** → **Environment Variables** sur Vercel
2. Vérifiez que `NEXTAUTH_URL` est **exactement** : `https://synexa-xi.vercel.app` (sans slash final)
3. Redéployez après modification

---

## 🔴 PROBLÈME #3 : Variables d'environnement par environnement

### Le problème :
Sur Vercel, vous pouvez définir des variables pour :
- **Production** (votre domaine principal)
- **Preview** (déploiements de branches/PR)
- **Development** (local)

Si vous avez ajouté les variables uniquement pour "Development" ou "Preview", elles ne seront pas disponibles en production !

### Solution :
1. Allez dans **Settings** → **Environment Variables**
2. Pour chaque variable (`NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`), vérifiez qu'elle est activée pour **"Production"** ✅
3. Si ce n'est pas le cas, modifiez la variable et cochez **"Production"**
4. Redéployez

---

## 🔴 PROBLÈME #4 : Cache de build Vercel

### Le problème :
Vercel met en cache les builds. Si vous avez modifié des variables d'environnement, le cache peut contenir les anciennes valeurs.

### Solution :
1. Allez dans **Settings** → **General**
2. Faites défiler jusqu'à **"Build & Development Settings"**
3. Cliquez sur **"Clear Build Cache"**
4. Redéployez

---

## 🔴 PROBLÈME #5 : Différence entre local et production

### Le problème :
En local, Next.js lit les variables depuis `.env` au démarrage.
Sur Vercel, les variables sont injectées **au moment du build**, pas au runtime.

### Vérification :
1. Allez dans votre déploiement Vercel
2. Cliquez sur **"View Function Logs"**
3. Cherchez les logs de démarrage qui affichent :
   ```
   [NextAuth Config] GOOGLE_CLIENT_ID: ✅ Configuré (...)
   [NextAuth Config] GOOGLE_CLIENT_SECRET: ✅ Configuré
   [NextAuth Config] NEXTAUTH_URL: https://synexa-xi.vercel.app
   ```

Si vous voyez `❌ Non configuré`, les variables ne sont pas disponibles au build.

---

## 🔴 PROBLÈME #6 : URI de callback non autorisée dans Google Console

### Le problème :
Même si vous avez ajouté les URIs dans Google Console, il faut vérifier qu'elles correspondent **exactement** à ce que Vercel génère.

### Vérification :
1. Allez dans [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Cliquez sur votre **OAuth 2.0 Client ID**
4. Vérifiez que vous avez **exactement** ces URIs (sans espaces, sans slash final) :

**Pour les requêtes du navigateur :**
- `http://localhost:3000`
- `https://synexa-xi.vercel.app`

**Pour les requêtes du serveur Web :**
- `http://localhost:3000/api/auth/callback/google`
- `https://synexa-xi.vercel.app/api/auth/callback/google`
- `http://localhost:3000/api/health/sync/google-fit/callback`
- `https://synexa-xi.vercel.app/api/health/sync/google-fit/callback`

**⚠️ IMPORTANT :** 
- Pas de slash final
- Pas d'espaces
- Correspondance exacte (majuscules/minuscules)

---

## 🔴 PROBLÈME #7 : Application Google en mode "Test"

### Le problème :
Si votre application OAuth est en mode "Test" dans Google Console, seuls les emails ajoutés comme testeurs peuvent se connecter.

### Solution :
1. Allez dans **APIs & Services** → **OAuth consent screen**
2. Vérifiez le statut : **"Testing"** ou **"In production"**
3. Si c'est "Testing", ajoutez votre email dans **"Test users"**
4. OU publiez l'application (nécessite vérification Google)

---

## 🔴 PROBLÈME #8 : Timing - Variables ajoutées après le build

### Le problème :
Si vous avez ajouté les variables d'environnement **après** le premier déploiement, elles ne sont pas disponibles dans le build actuel.

### Solution :
**Redéployez toujours après avoir ajouté/modifié des variables d'environnement !**

---

## ✅ CHECKLIST DE VÉRIFICATION VERCEL

Cochez chaque point :

- [ ] `NEXTAUTH_URL` est défini pour **Production** (pas seulement Development/Preview)
- [ ] `NEXTAUTH_URL` est exactement `https://synexa-xi.vercel.app` (sans slash final, sans espaces)
- [ ] `GOOGLE_CLIENT_ID` est défini pour **Production**
- [ ] `GOOGLE_CLIENT_SECRET` est défini pour **Production**
- [ ] `NEXTAUTH_SECRET` est défini pour **Production**
- [ ] Vous avez **redéployé** après avoir ajouté/modifié ces variables
- [ ] Les URIs dans Google Console correspondent exactement (sans slash final)
- [ ] L'application Google n'est pas en mode "Test" OU votre email est dans les testeurs
- [ ] Vous avez vérifié les logs Vercel pour voir si les variables sont chargées

---

## 🧪 TEST RAPIDE

Pour vérifier si le problème vient de Vercel :

1. **Vérifiez les logs Vercel :**
   - Allez dans votre déploiement
   - Cliquez sur **"View Function Logs"**
   - Cherchez les logs `[NextAuth Config]`
   - Si vous voyez `❌ Non configuré`, les variables ne sont pas chargées

2. **Testez l'endpoint de callback directement :**
   ```
   https://synexa-xi.vercel.app/api/auth/callback/google?error=test
   ```
   Si ça redirige vers la page de connexion avec une erreur, la route fonctionne.

3. **Vérifiez que NEXTAUTH_URL est correct :**
   - Allez sur `https://synexa-xi.vercel.app/api/auth/signin`
   - Si ça fonctionne, NextAuth est configuré
   - Si ça donne une erreur, `NEXTAUTH_URL` est probablement incorrect

---

## 🎯 SOLUTION LA PLUS PROBABLE

**Dans 90% des cas, le problème est :**

1. ✅ Variables ajoutées mais **pas redéployé**
2. ✅ Variables définies pour "Development" au lieu de "Production"
3. ✅ `NEXTAUTH_URL` avec un slash final ou des espaces

**Action immédiate :**
1. Vérifiez que toutes les variables sont pour **Production** ✅
2. Vérifiez que `NEXTAUTH_URL` est exactement `https://synexa-xi.vercel.app` (sans slash)
3. **Redéployez** votre application
4. Testez à nouveau

---

## 📞 Si ça ne fonctionne toujours pas

1. Partagez-moi les logs Vercel (View Function Logs)
2. Partagez-moi une capture d'écran de vos variables d'environnement Vercel (en masquant les secrets)
3. Partagez-moi l'erreur exacte que vous voyez quand vous essayez de vous connecter

