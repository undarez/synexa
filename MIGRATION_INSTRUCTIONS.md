# Instructions de migration pour les favoris

## Problème
Le client Prisma n'a pas été régénéré après l'ajout des modèles `FavoriteArticle` et `FavoriteStock`, donc `prisma.favoriteStock` et `prisma.favoriteArticle` sont `undefined`.

## Solution

### Étape 1 : Arrêter le serveur
Appuyez sur `Ctrl+C` dans le terminal où le serveur de développement tourne.

### Étape 2 : Régénérer le client Prisma
```bash
npx prisma generate
```

### Étape 3 : Vérifier que la base de données est à jour
```bash
npx prisma db push
```

### Étape 4 : Redémarrer le serveur
```bash
npm run dev
```

## Alternative : Script automatique
Vous pouvez aussi utiliser le script que j'ai créé :
```bash
npm run migrate:favorites
```

Après ces étapes, les favoris (articles et cotations) fonctionneront correctement !






