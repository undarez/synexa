# 🧪 Tester en local en attendant le redéploiement Vercel

## Situation
Vous avez atteint la limite des 100 déploiements gratuits sur Vercel. Vous devez attendre 6 heures avant de pouvoir redéployer.

## ✅ Solutions pour tester en local

### 1. Tester la connexion Google OAuth en local

**Configuration requise :**

1. **Créez un fichier `.env.local`** (si pas déjà fait) :
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre_secret_ici
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
DATABASE_URL=votre_database_url
```

2. **Dans Google Cloud Console**, ajoutez cette URI de redirection :
```
http://localhost:3000/api/auth/callback/google
```

3. **Lancez le serveur local** :
```bash
npm run dev
```

4. **Testez la connexion Google** :
   - Allez sur http://localhost:3000/auth/signin
   - Cliquez sur "Continuer avec Google"
   - Vérifiez que tout fonctionne

### 2. Vérifier que le code est correct

**Commandes à exécuter :**

```bash
# Vérifier que le build fonctionne
npm run build

# Vérifier les erreurs TypeScript
npx tsc --noEmit

# Vérifier les erreurs ESLint
npm run lint
```

Si tout passe en local, ça fonctionnera sur Vercel.

### 3. Optimiser les déploiements futurs

**Pour éviter d'atteindre la limite :**

1. **Ne déployez que quand nécessaire**
   - Testez en local d'abord
   - Faites plusieurs commits avant de pousser

2. **Utilisez les Preview Deployments avec parcimonie**
   - Les PR créent automatiquement des previews
   - Limitez le nombre de PRs ouvertes en même temps

3. **Groupez vos commits**
   - Au lieu de 10 commits = 10 déploiements
   - Faites 1 commit avec tous les changements = 1 déploiement

4. **Utilisez `git commit --amend`** pour modifier le dernier commit au lieu d'en créer un nouveau

## 📋 Checklist avant le prochain déploiement

Quand vous pourrez redéployer (dans 6 heures) :

- [ ] Tout fonctionne en local (`npm run build` passe)
- [ ] La connexion Google fonctionne en local
- [ ] Les variables d'environnement sont correctes sur Vercel
- [ ] L'URI de callback est configurée dans Google Console
- [ ] Vous êtes prêt à redéployer avec le cache désactivé

## 🎯 Plan d'action

1. **Maintenant** : Testez tout en local
2. **Dans 6 heures** : Redéployez sur Vercel avec cache désactivé
3. **À l'avenir** : Testez en local avant chaque déploiement

## 💡 Alternative : Plan Vercel Pro

Si vous avez besoin de plus de déploiements :
- **Vercel Pro** : $20/mois, déploiements illimités
- **Vercel Hobby** : Gratuit, mais limite de 100 déploiements/mois

Pour un projet en développement, 100 déploiements/mois est généralement suffisant si vous testez en local d'abord.

