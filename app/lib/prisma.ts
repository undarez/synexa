import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const isDevelopment = process.env.NODE_ENV === "development";

// Créer une instance Prisma
let prismaInstance: PrismaClient;

if (!isDevelopment && globalForPrisma.prisma) {
  prismaInstance = globalForPrisma.prisma;
} else {
  try {
    prismaInstance = new PrismaClient({
      log:
        isDevelopment
          ? ["query", "error", "warn"]
          : ["error"],
    });
    
    // Tester la connexion au démarrage
    prismaInstance.$connect()
      .then(() => {
        console.log("✅ [Prisma] Connexion à Supabase réussie");
      })
      .catch((error) => {
        console.error("❌ [Prisma] Erreur de connexion à Supabase:", error);
        if (error.message.includes("DATABASE_URL")) {
          console.error("💡 Vérifiez que DATABASE_URL est configuré dans les variables d'environnement");
        }
      });
    
    if (!isDevelopment) {
      globalForPrisma.prisma = prismaInstance;
    }
  } catch (error) {
    console.error("[Prisma] Erreur lors de l'initialisation:", error);
    throw error;
  }
}

export const prisma = prismaInstance;
export default prisma;
