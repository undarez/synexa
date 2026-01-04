// Script pour vérifier la base de données
import { config } from "dotenv";
import { resolve, join } from "path";
import { PrismaClient } from "@prisma/client";

// Charge le fichier .env depuis le répertoire synexa
config({ path: resolve(__dirname, "../.env") });
config({ path: resolve(__dirname, "../.env.local") });

// Vérifie que DATABASE_URL est configuré (PostgreSQL)
const databaseUrl = process.env.DATABASE_URL;

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Vérification de la base de données...");
  console.log(`📁 DATABASE_URL: ${process.env.DATABASE_URL || "NON DÉFINI"}\n`);
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL n'est pas défini dans .env ou .env.local");
    console.log("💡 Assurez-vous d'avoir DATABASE_URL configuré avec votre connection string PostgreSQL (Supabase)");
    console.log("   Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres");
    process.exit(1);
  }
  
  // Vérifier que c'est une URL PostgreSQL
  if (!databaseUrl?.startsWith("postgresql://") && !databaseUrl?.startsWith("postgres://")) {
    console.error("❌ DATABASE_URL doit être une URL PostgreSQL");
    console.log("💡 Format attendu: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres");
    process.exit(1);
  }
  
  try {
    // Teste une requête simple pour voir si les tables existent
    await prisma.user.findMany({ take: 1 });
    console.log("✅ Les tables existent déjà!");
    console.log("✅ La base de données est prête à être utilisée.");
  } catch (error: any) {
    if (error.code === "P2021" || error.message?.includes("does not exist")) {
      console.log("❌ Les tables n'existent pas dans la base de données.");
      console.log("\n💡 Pour créer les tables, exécutez:");
      console.log("   npm run db:push");
      console.log("   ou");
      console.log("   npx prisma db push");
      process.exit(1);
    } else if (error.code === "P1001" || error.message?.includes("Can't reach database server")) {
      console.log("❌ Impossible de se connecter à la base de données PostgreSQL.");
      console.log("\n💡 Vérifiez que:");
      console.log("   1. DATABASE_URL est correct (format PostgreSQL)");
      console.log("   2. Le mot de passe dans DATABASE_URL est correct");
      console.log("   3. Supabase est accessible et la base de données existe");
      console.log("   4. Les politiques RLS sont désactivées sur les tables NextAuth");
      process.exit(1);
    } else {
      console.error("❌ Erreur:", error.message);
      if (error.code) console.error(`   Code: ${error.code}`);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("\n❌ Erreur:", error.message);
  process.exit(1);
});

