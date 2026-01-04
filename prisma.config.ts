import { defineConfig } from "@prisma/config";

// Configuration Prisma 7 pour les migrations
// L'URL de connexion est maintenant dans ce fichier au lieu de schema.prisma
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

