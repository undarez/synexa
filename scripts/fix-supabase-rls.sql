-- Script SQL pour désactiver RLS sur les tables NextAuth dans Supabase
-- À exécuter dans le SQL Editor de Supabase

-- Désactiver RLS sur les tables NextAuth
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" DISABLE ROW LEVEL SECURITY;

-- Vérifier que les tables existent et ont les bonnes permissions
GRANT ALL ON "User" TO postgres;
GRANT ALL ON "Account" TO postgres;
GRANT ALL ON "Session" TO postgres;
GRANT ALL ON "VerificationToken" TO postgres;

-- Vérifier les séquences aussi (pour les IDs auto-incrémentés)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

