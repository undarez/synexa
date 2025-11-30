import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Vérification de la base de données...\n");
  
  try {
    // Teste si les tables existent en essayant de compter les enregistrements
    const userCount = await prisma.user.count();
    const accountCount = await prisma.account.count();
    const sessionCount = await prisma.session.count();
    
    console.log("✅ Tables trouvées:");
    console.log(`   - User: ${userCount} enregistrements`);
    console.log(`   - Account: ${accountCount} enregistrements`);
    console.log(`   - Session: ${sessionCount} enregistrements`);
    console.log("\n✅ Base de données opérationnelle!");
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    if (error.message.includes("does not exist")) {
      console.log("\n💡 Les tables n'existent pas. Exécutez: npx prisma db push");
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


