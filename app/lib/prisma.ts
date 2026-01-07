import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const isDevelopment = process.env.NODE_ENV === "development";

// Créer une instance Prisma
// Prisma 7.2.0 : connexion directe à PostgreSQL via DATABASE_URL
// Configuration simple sans accelerateUrl - connexion directe standard
function createPrismaClient(): PrismaClient {
  // Vérifier que DATABASE_URL est défini
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL n'est pas défini dans les variables d'environnement");
  }

  // Prisma 7.2.0 : connexion directe à PostgreSQL
  // Utiliser DATABASE_URL directement, sans accelerateUrl
  // accelerateUrl est uniquement pour Prisma Accelerate (service cloud)
  const client = new PrismaClient({
    log:
      isDevelopment
        ? ["query", "error", "warn"]
        : ["error"],
  });
  
  // Tester la connexion au démarrage (en arrière-plan, ne bloque pas)
  client.$connect()
    .then(() => {
      console.log("✅ [Prisma] Connexion à Supabase réussie");
    })
    .catch((error: unknown) => {
      console.error("❌ [Prisma] Erreur de connexion à Supabase:", error);
      if (error instanceof Error && error.message.includes("DATABASE_URL")) {
        console.error("💡 Vérifiez que DATABASE_URL est configuré dans les variables d'environnement");
      }
    });
  
  return client;
}

// Utiliser l'instance globale en production, créer une nouvelle en développement
const prismaInstance: PrismaClient =
  !isDevelopment && globalForPrisma.prisma
    ? globalForPrisma.prisma
    : createPrismaClient();

if (!isDevelopment) {
  globalForPrisma.prisma = prismaInstance;
}

export const prisma = prismaInstance;
export default prisma;
