# Icônes PWA manquantes

Les fichiers `icon-192.png` et `icon-512.png` sont requis pour le PWA.

## Solution rapide

1. Allez sur https://realfavicongenerator.net/
2. Créez ou uploadez un logo
3. Téléchargez les icônes 192x192 et 512x512
4. Placez-les dans `public/` avec les noms :
   - `icon-192.png`
   - `icon-512.png`

## Solution avec Sharp (Node.js)

```bash
npm install sharp
npx tsx scripts/generate-pwa-icons.ts
```

## Icône temporaire

Pour l'instant, vous pouvez utiliser n'importe quelle image PNG de 192x192 et 512x512.


