# 📱 Configuration des icônes PWA

## Problème

Les fichiers `icon-192.png` et `icon-512.png` sont requis pour le PWA mais sont actuellement manquants.

## Solution rapide (Recommandée)

### Option 1 : Générateur en ligne (Le plus simple)

1. Allez sur **https://realfavicongenerator.net/**
2. Uploadez un logo ou créez une icône
3. Téléchargez les icônes générées
4. Renommez et placez dans `public/` :
   - `icon-192.png` (192x192 pixels)
   - `icon-512.png` (512x512 pixels)

### Option 2 : Convertir les SVG existants

Des fichiers SVG temporaires ont été créés :
- `public/icon-192.svg`
- `public/icon-512.svg`

Pour les convertir en PNG :

1. Allez sur **https://cloudconvert.com/svg-to-png**
2. Uploadez `icon-192.svg` → Téléchargez `icon-192.png`
3. Uploadez `icon-512.svg` → Téléchargez `icon-512.png`
4. Placez les PNG dans `public/`

### Option 3 : Créer manuellement

1. Créez une image 512x512 pixels avec :
   - Fond bleu/violet (dégradé)
   - Lettre "S" blanche au centre
   - Coins arrondis (optionnel)
2. Redimensionnez à 192x192 pour la petite icône
3. Sauvegardez comme `icon-192.png` et `icon-512.png` dans `public/`

## Vérification

Après avoir ajouté les icônes, redémarrez le serveur et vérifiez :
- Plus d'erreur 404 pour `/icon-192.png`
- Le PWA peut être installé sur mobile
- Les icônes apparaissent dans le manifest

## Note

Les fichiers SVG temporaires fonctionnent mais les PNG sont préférés pour une meilleure compatibilité PWA sur tous les navigateurs.







