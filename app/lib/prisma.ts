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
