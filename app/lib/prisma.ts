import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const isDevelopment = process.env.NODE_ENV === "development";

// Créer une instance Prisma
// Pour Prisma 7, l'URL est lue depuis prisma.config.ts pour les migrations
// Pour le client, on utilise accelerateUrl avec le format prisma+postgres://
let prismaInstance: PrismaClient;

if (!isDevelopment && globalForPrisma.prisma) {
  prismaInstance = globalForPrisma.prisma;
} else {
  try {
    // Vérifier que DATABASE_URL est défini
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL n'est pas défini dans les variables d'environnement");
    }

    // Prisma 7 : convertir l'URL PostgreSQL en format prisma+postgres://
    // pour utiliser accelerateUrl (connexion directe, pas Prisma Accelerate)
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL n'est pas défini");
    }
    
    // Convertir postgresql:// ou postgres:// en prisma+postgres://
    const accelerateUrl = dbUrl.replace(/^(postgresql|postgres):\/\//, "prisma+postgres://");

    prismaInstance = new PrismaClient({
      accelerateUrl: accelerateUrl as any,
      log:
        isDevelopment
          ? ["query", "error", "warn"]
          : ["error"],
    } as any);
    
    // Tester la connexion au démarrage
    prismaInstance.$connect()
      .then(() => {
        console.log("✅ [Prisma] Connexion à Supabase réussie");
      })
      .catch((error: unknown) => {
        console.error("❌ [Prisma] Erreur de connexion à Supabase:", error);
        if (error instanceof Error && error.message.includes("DATABASE_URL")) {
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
