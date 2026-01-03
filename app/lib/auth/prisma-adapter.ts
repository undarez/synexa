/**
 * Adaptateur Prisma personnalisé pour NextAuth
 * Filtre les champs non supportés par le schéma Prisma (comme refresh_token_expires_in)
 */

import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Adapter, AdapterUser } from "next-auth/adapters";
import prisma from "@/app/lib/prisma";

// Créer l'adaptateur Prisma de base
const baseAdapter = PrismaAdapter(prisma) as Adapter;

// Créer un adaptateur personnalisé qui filtre refresh_token_expires_in
export const customPrismaAdapter: Adapter = {
  ...baseAdapter,
  
  async createUser(data: Parameters<Adapter["createUser"]>[0]) {
    console.log("[PrismaAdapter] createUser appelé avec:", {
      email: data.email,
      name: data.name,
      image: data.image,
    });
    
    if (!baseAdapter.createUser) {
      throw new Error("createUser method not available on baseAdapter");
    }
    
    try {
      const user = await baseAdapter.createUser(data);
      console.log("[PrismaAdapter] createUser SUCCÈS:", {
        id: user.id,
        email: user.email,
        name: user.name,
      });
      return user;
    } catch (error: any) {
      console.error("[PrismaAdapter] createUser ERREUR:", {
        message: error.message,
        code: error.code,
        meta: error.meta,
        email: data.email,
      });
      throw error;
    }
  },
  
  async getUser(id: string) {
    console.log("[PrismaAdapter] getUser appelé avec id:", id);
    if (!baseAdapter.getUser) {
      throw new Error("getUser method not available on baseAdapter");
    }
    try {
      const user = await baseAdapter.getUser(id);
      console.log("[PrismaAdapter] getUser résultat:", user ? { id: user.id, email: user.email } : "null");
      return user;
    } catch (error: any) {
      console.error("[PrismaAdapter] getUser ERREUR:", error.message);
      throw error;
    }
  },
  
  async getUserByEmail(email: string) {
    console.log("[PrismaAdapter] getUserByEmail appelé avec email:", email);
    if (!baseAdapter.getUserByEmail) {
      throw new Error("getUserByEmail method not available on baseAdapter");
    }
    try {
      const user = await baseAdapter.getUserByEmail(email);
      console.log("[PrismaAdapter] getUserByEmail résultat:", user ? { id: user.id, email: user.email } : "null");
      return user;
    } catch (error: any) {
      console.error("[PrismaAdapter] getUserByEmail ERREUR:", error.message);
      throw error;
    }
  },
  
  async linkAccount(data: any) {
    console.log("[PrismaAdapter] linkAccount appelé:", {
      userId: data.userId,
      provider: data.provider,
      providerAccountId: data.providerAccountId,
    });
    
    if (!baseAdapter.linkAccount) {
      throw new Error("linkAccount method not available on baseAdapter");
    }
    
    // Filtrer refresh_token_expires_in qui n'existe pas dans le schéma Prisma
    const { refresh_token_expires_in, ...accountData } = data;
    
    try {
      const account = await baseAdapter.linkAccount(accountData as any);
      console.log("[PrismaAdapter] linkAccount SUCCÈS:", {
        id: account.id,
        userId: account.userId,
        provider: account.provider,
      });
      return account;
    } catch (error: any) {
      console.error("[PrismaAdapter] linkAccount ERREUR:", {
        message: error.message,
        code: error.code,
        meta: error.meta,
        userId: data.userId,
        provider: data.provider,
      });
      throw error;
    }
  },
};




