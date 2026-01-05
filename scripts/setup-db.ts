import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Configuration de la base de données...\n");
  
  try {
    // Lit le fichier de migration SQL
    const migrationPath = join(__dirname, "../prisma/migrations/20251127084401_init/migration.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");
    
    console.log("📝 Exécution de la migration SQL...");
    
    // Exécute le SQL directement
    await prisma.$executeRawUnsafe(migrationSQL);
    
    console.log("✅ Migration appliquée avec succès!\n");
    
    // Vérifie que les tables existent (PostgreSQL)
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
    `;
    
    console.log("📋 Tables créées:");
    tables.forEach((table: { tablename: string }) => {
      console.log(`   ✅ ${table.tablename}`);
    });
    
    console.log("\n✅ Base de données configurée avec succès!");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erreur:", errorMessage);
    
    // Si les tables existent déjà, c'est OK
    if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
      console.log("\n⚠️  Les tables existent déjà. C'est normal.");
    } else {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();


