/**
 * Adaptateur Prisma personnalisé pour NextAuth
 * Filtre les champs non supportés par le schéma Prisma (comme refresh_token_expires_in)
 */

import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Adapter } from "next-auth/adapters";
import prisma from "@/app/lib/prisma";

// Créer l'adaptateur Prisma de base
const baseAdapter = PrismaAdapter(prisma) as Adapter;

// Créer un adaptateur personnalisé qui filtre refresh_token_expires_in
export const customPrismaAdapter: Adapter = {
  ...baseAdapter,
  
  async linkAccount(data: any) {
    // Filtrer refresh_token_expires_in qui n'existe pas dans le schéma Prisma
    const { refresh_token_expires_in, ...accountData } = data;
    
    // Appeler la méthode linkAccount de l'adaptateur de base avec les données filtrées
    return baseAdapter.linkAccount(accountData as any);
  },
};




