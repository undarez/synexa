// app/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const isDevelopment = process.env.NODE_ENV === "development";

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL n'est pas défini dans les variables d'environnement");
  }

  // Pool PostgreSQL natif
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Adapter Prisma 7 pour PostgreSQL
  const adapter = new PrismaPg(pool);

  // Création du client Prisma
  const client = new PrismaClient({
    adapter, // obligatoire en Prisma 7 "client"
    log: isDevelopment ? ["query", "error", "warn"] : ["error"],
  });

  // Connexion asynchrone au démarrage
  client.$connect()
    .then(() => console.log("✅ [Prisma] Connexion PostgreSQL réussie"))
    .catch((err) => console.error("❌ [Prisma] Erreur de connexion Prisma:", err));

  return client;
}

// Instance globale pour Next.js
const prisma: PrismaClient =
  !isDevelopment && globalForPrisma.prisma
    ? globalForPrisma.prisma
    : createPrismaClient();

if (!isDevelopment) {
  globalForPrisma.prisma = prisma;
}

export { prisma };
export default prisma;

