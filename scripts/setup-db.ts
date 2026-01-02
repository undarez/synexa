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
    
    // Vérifie que les tables existent
    const tables = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;
    `;
    
    console.log("📋 Tables créées:");
    tables.forEach(table => {
      console.log(`   ✅ ${table.name}`);
    });
    
    console.log("\n✅ Base de données configurée avec succès!");
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    
    // Si les tables existent déjà, c'est OK
    if (error.message.includes("already exists") || error.message.includes("duplicate")) {
      console.log("\n⚠️  Les tables existent déjà. C'est normal.");
    } else {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();


