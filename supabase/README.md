# Migration vers Supabase

## Fichiers SQL

Ce dossier contient les fichiers SQL générés depuis le schema Prisma, prêts à être exécutés dans Supabase.

### Ordre d'exécution

1. **schema.sql** - Crée tous les types ENUM et toutes les tables
2. **constraints.sql** - Ajoute toutes les contraintes (UNIQUE, FOREIGN KEY)
3. **indexes.sql** - Crée tous les index pour l'optimisation

### Comment exécuter

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Exécutez les fichiers dans l'ordre :
   - Copiez-collez le contenu de `schema.sql` et exécutez
   - Copiez-collez le contenu de `constraints.sql` et exécutez
   - Copiez-collez le contenu de `indexes.sql` et exécutez

### Notes importantes

- Les tables `Account`, `Session`, et `VerificationToken` sont incluses mais peuvent être supprimées si vous n'utilisez pas NextAuth
- Tous les champs JSONB sont compatibles avec Supabase
- Les contraintes ON DELETE CASCADE sont préservées
- Les index sont optimisés pour les requêtes fréquentes

### Après l'exécution

Une fois les fichiers exécutés, votre base de données Supabase sera prête à être utilisée avec le client Supabase JavaScript.

