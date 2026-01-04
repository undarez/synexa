# Migration des favoris - Instructions

Pour activer les fonctionnalités de favoris (articles et cotations), vous devez :

1. **Arrêter le serveur de développement** (Ctrl+C)

2. **Régénérer le client Prisma** :
   ```bash
   npx prisma generate
   ```

3. **Mettre à jour la base de données** :
   ```bash
   npx prisma db push
   ```

4. **Redémarrer le serveur de développement** :
   ```bash
   npm run dev
   ```

Les tables `FavoriteArticle` et `FavoriteStock` seront créées dans la base de données.








