# 🔧 Correction des politiques RLS Supabase

## 🔴 Problème

L'erreur "Callback" peut être causée par les **politiques RLS (Row Level Security)** de Supabase qui bloquent PrismaAdapter lors de la création des utilisateurs et sessions.

## ✅ Solution : Désactiver RLS sur les tables NextAuth

### Étape 1 : Ouvrir le SQL Editor dans Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor** (dans le menu de gauche)
4. Cliquez sur **New query**

### Étape 2 : Exécuter le script SQL

Copiez et exécutez ce script :

```sql
-- Désactiver RLS sur les tables NextAuth
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" DISABLE ROW LEVEL SECURITY;

-- Accorder les permissions nécessaires
GRANT ALL ON "User" TO postgres;
GRANT ALL ON "Account" TO postgres;
GRANT ALL ON "Session" TO postgres;
GRANT ALL ON "VerificationToken" TO postgres;

-- Vérifier les séquences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

### Étape 3 : Vérifier

Après avoir exécuté le script, testez à nouveau la connexion Google.

## 📝 Note

Si vous préférez garder RLS activé pour la sécurité, vous devrez créer des politiques spécifiques pour permettre à PrismaAdapter d'accéder aux tables. Mais pour le moment, désactiver RLS est la solution la plus simple.

