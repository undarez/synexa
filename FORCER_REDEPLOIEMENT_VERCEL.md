# 🔄 Forcer un redéploiement sur Vercel

## Problème
Vercel reste bloqué sur une ancienne version même après avoir poussé les changements sur GitHub.

## Solutions

### Solution 1 : Redéploiement manuel (RECOMMANDÉ)

1. **Allez sur votre projet Vercel**
   - https://vercel.com/dashboard
   - Sélectionnez votre projet `synexa`

2. **Allez dans l'onglet "Deployments"**

3. **Trouvez le dernier déploiement** (celui qui est actuellement en production)

4. **Cliquez sur les 3 points** (⋯) à droite du déploiement

5. **Sélectionnez "Redeploy"**
   - ⚠️ **IMPORTANT** : Cochez **"Use existing Build Cache"** = **DÉCOCHÉ** (pour forcer un nouveau build)
   - Cliquez sur **"Redeploy"**

6. **Attendez la fin du build** (2-3 minutes)

### Solution 2 : Vider le cache de build

1. **Allez dans "Settings"** → **"General"**

2. **Scroll jusqu'à "Build & Development Settings"**

3. **Cliquez sur "Clear Build Cache"** (si disponible)

4. **Puis faites un nouveau déploiement** (Solution 1)

### Solution 3 : Créer un commit vide pour forcer le déploiement

Si les solutions 1 et 2 ne fonctionnent pas :

```bash
# Créer un commit vide
git commit --allow-empty -m "Force redeploy on Vercel"

# Pousser sur GitHub
git push origin main
```

Cela forcera Vercel à détecter un nouveau commit et à redéployer.

### Solution 4 : Vérifier la connexion GitHub-Vercel

1. **Allez dans "Settings"** → **"Git"**

2. **Vérifiez que votre repository GitHub est bien connecté**

3. **Vérifiez que la branche "main" est bien surveillée**

4. **Si nécessaire, reconnectez le repository**

## ✅ Vérification après redéploiement

1. **Allez dans "Deployments"**
2. **Vérifiez que le nouveau déploiement a un nouveau commit hash**
3. **Vérifiez les logs du build** pour confirmer que les nouveaux fichiers sont utilisés
4. **Testez l'application** pour confirmer que les changements sont actifs

## 🔍 Comment vérifier que Vercel utilise la bonne version

Dans les logs de build Vercel, cherchez :
```
Cloning github.com/undarez/synexa (Branch: main, Commit: [HASH])
```

Comparez ce hash avec votre dernier commit local :
```bash
git log -1 --format="%H"
```

Si les hashs ne correspondent pas, Vercel utilise une ancienne version.

## ⚠️ Problèmes courants

- **Cache de build** : Vercel peut utiliser un cache de build ancien
- **Webhook GitHub** : Le webhook peut ne pas être déclenché
- **Branche incorrecte** : Vercel peut surveiller une autre branche

## 🎯 Solution rapide (1 minute)

1. Allez sur Vercel Dashboard
2. Deployments → 3 points (⋯) → Redeploy
3. **DÉCOCHEZ** "Use existing Build Cache"
4. Cliquez "Redeploy"

C'est tout ! Le nouveau build utilisera vos derniers fichiers.

