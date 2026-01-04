/**
 * Script pour tester la connexion à Supabase
 * Usage: npx tsx scripts/test-supabase-connection.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testConnection() {
  console.log("🔍 Test de connexion à Supabase...\n");

  try {
    // Test 1: Connexion de base
    console.log("1️⃣ Test de connexion...");
    await prisma.$connect();
    console.log("✅ Connexion réussie!\n");

    // Test 2: Vérifier que les tables existent
    console.log("2️⃣ Vérification des tables...");
    const userCount = await prisma.user.count();
    console.log(`✅ Table 'User' trouvée (${userCount} utilisateurs)\n`);

    // Test 3: Vérifier les tables NextAuth
    console.log("3️⃣ Vérification des tables NextAuth...");
    const accountCount = await prisma.account.count();
    const sessionCount = await prisma.session.count();
    console.log(`✅ Table 'Account' trouvée (${accountCount} comptes)`);
    console.log(`✅ Table 'Session' trouvée (${sessionCount} sessions)\n`);

    console.log("🎉 Tous les tests sont passés! Supabase est correctement configuré.");
  } catch (error: any) {
    console.error("❌ Erreur de connexion:", error.message);
    
    if (error.message.includes("password")) {
      console.error("\n💡 Vérifiez que le mot de passe dans DATABASE_URL est correct.");
      console.error("   Vous pouvez le réinitialiser dans Supabase → Settings → Database");
    } else if (error.message.includes("does not exist")) {
      console.error("\n💡 Les tables n'existent pas encore. Exécutez:");
      console.error("   npx prisma migrate deploy");
    } else {
      console.error("\n💡 Vérifiez votre connection string dans DATABASE_URL");
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

