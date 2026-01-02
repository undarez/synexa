// Script pour vérifier la base de données
import { config } from "dotenv";
import { resolve, join } from "path";
import { PrismaClient } from "@prisma/client";

// Charge le fichier .env depuis le répertoire synexa
config({ path: resolve(__dirname, "../.env") });
config({ path: resolve(__dirname, "../.env.local") });

// Corrige le chemin DATABASE_URL pour qu'il soit absolu
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl?.startsWith("file:")) {
  const projectRoot = resolve(__dirname, "..");
  const dbPath = databaseUrl.replace(/^file:\.?\//, "");
  const absolutePath = join(projectRoot, dbPath);
  databaseUrl = `file:${absolutePath}`;
  process.env.DATABASE_URL = databaseUrl;
}

const prisma = new PrismaClient({
  datasources: databaseUrl
    ? {
        db: {
          url: databaseUrl,
        },
      }
    : undefined,
});

async function main() {
  console.log("🔧 Vérification de la base de données...");
  console.log(`📁 DATABASE_URL: ${process.env.DATABASE_URL || "NON DÉFINI"}\n`);
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL n'est pas défini dans .env ou .env.local");
    console.log("💡 Assurez-vous d'avoir DATABASE_URL=\"file:./prisma/dev.db\" dans votre .env");
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
    } else if (error.message?.includes("Unable to open the database file") || error.code === "P1001") {
      console.log("❌ Impossible d'ouvrir le fichier de base de données.");
      console.log(`📁 Chemin attendu: ${databaseUrl?.replace("file:", "")}`);
      console.log("\n💡 Vérifiez que:");
      console.log("   1. Le fichier existe et est accessible");
      console.log("   2. Le chemin dans DATABASE_URL est correct");
      console.log("   3. Vous avez les permissions nécessaires");
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

