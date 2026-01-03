/**
 * Adaptateur Prisma personnalisé pour NextAuth
 * Filtre les champs non supportés par le schéma Prisma (comme refresh_token_expires_in)
 */

import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Adapter, AdapterUser } from "next-auth/adapters";
import prisma from "@/app/lib/prisma";

// Créer l'adaptateur Prisma de base
let baseAdapter: Adapter;
try {
  baseAdapter = PrismaAdapter(prisma) as Adapter;
} catch (error) {
  console.error("=========================================");
  console.error("❌ [D-LOG] ERREUR INITIALISATION PRISMA ADAPTER");
  console.error("=========================================");
  console.error("[D-LOG] Erreur:", error);
  throw error;
}

// Créer un adaptateur personnalisé qui filtre refresh_token_expires_in
export const customPrismaAdapter: Adapter = {
  ...baseAdapter,
  
  async createUser(data: Parameters<Adapter["createUser"]>[0]) {
    console.log("=========================================");
    console.log("🔍 [D-LOG PRISMA] CREATEUSER APPELÉ");
    console.log("=========================================");
    console.log("[D-LOG PRISMA] Données reçues:", {
      email: data.email,
      name: data.name,
      image: data.image ? "Présent" : "Absent",
      emailVerified: data.emailVerified,
    });
    console.log("[D-LOG PRISMA] Vérification baseAdapter.createUser...");
    
    if (!baseAdapter.createUser) {
      console.error("[D-LOG PRISMA] ❌ createUser non disponible sur baseAdapter");
      throw new Error("createUser method not available on baseAdapter");
    }
    
    console.log("[D-LOG PRISMA] ✅ createUser disponible, appel en cours...");
    
    try {
      console.log("[D-LOG PRISMA] ⏳ Appel baseAdapter.createUser...");
      const user = await baseAdapter.createUser(data);
      console.log("=========================================");
      console.log("✅ [D-LOG PRISMA] CREATEUSER SUCCÈS");
      console.log("=========================================");
      console.log("[D-LOG PRISMA] Utilisateur créé:", {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      });
      console.log("=========================================");
      return user;
    } catch (error: any) {
      console.error("=========================================");
      console.error("❌ [D-LOG PRISMA] CREATEUSER ERREUR");
      console.error("=========================================");
      console.error("[D-LOG PRISMA] Type d'erreur:", error?.constructor?.name);
      console.error("[D-LOG PRISMA] Message:", error?.message);
      console.error("[D-LOG PRISMA] Code:", error?.code);
      console.error("[D-LOG PRISMA] Meta:", error?.meta);
      console.error("[D-LOG PRISMA] Stack:", error?.stack);
      console.error("[D-LOG PRISMA] Email tenté:", data.email);
      console.error("=========================================");
      throw error;
    }
  },
  
  async linkAccount(data: any) {
    console.log("=========================================");
    console.log("🔍 [D-LOG PRISMA] LINKACCOUNT APPELÉ");
    console.log("=========================================");
    console.log("[D-LOG PRISMA] Données reçues:", {
      userId: data.userId,
      provider: data.provider,
      providerAccountId: data.providerAccountId,
      type: data.type,
      access_token: data.access_token ? "Présent" : "Absent",
      refresh_token: data.refresh_token ? "Présent" : "Absent",
      expires_at: data.expires_at,
      token_type: data.token_type,
      scope: data.scope,
      refresh_token_expires_in: data.refresh_token_expires_in,
    });
    
    if (!baseAdapter.linkAccount) {
      console.error("[D-LOG PRISMA] ❌ linkAccount non disponible sur baseAdapter");
      throw new Error("linkAccount method not available on baseAdapter");
    }
    
    // Filtrer refresh_token_expires_in qui n'existe pas dans le schéma Prisma
    const { refresh_token_expires_in, ...accountData } = data;
    console.log("[D-LOG PRISMA] ⚠️ refresh_token_expires_in filtré (non supporté par Prisma)");
    console.log("[D-LOG PRISMA] Données après filtrage:", {
      userId: accountData.userId,
      provider: accountData.provider,
      providerAccountId: accountData.providerAccountId,
      hasAccessToken: !!accountData.access_token,
      hasRefreshToken: !!accountData.refresh_token,
    });
    
    try {
      console.log("[D-LOG PRISMA] ⏳ Appel baseAdapter.linkAccount...");
      const account = await baseAdapter.linkAccount(accountData as any);
      console.log("=========================================");
      console.log("✅ [D-LOG PRISMA] LINKACCOUNT SUCCÈS");
      console.log("=========================================");
      console.log("[D-LOG PRISMA] Compte lié:", {
        id: account.id,
        userId: account.userId,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      });
      console.log("=========================================");
      return account;
    } catch (error: any) {
      console.error("=========================================");
      console.error("❌ [D-LOG PRISMA] LINKACCOUNT ERREUR");
      console.error("=========================================");
      console.error("[D-LOG PRISMA] Type d'erreur:", error?.constructor?.name);
      console.error("[D-LOG PRISMA] Message:", error?.message);
      console.error("[D-LOG PRISMA] Code:", error?.code);
      console.error("[D-LOG PRISMA] Meta:", error?.meta);
      console.error("[D-LOG PRISMA] Stack:", error?.stack);
      console.error("[D-LOG PRISMA] Données qui ont causé l'erreur:", {
        userId: data.userId,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
      });
      console.error("=========================================");
      throw error;
    }
  },
  
  async getUserByEmail(email: string) {
    console.log("=========================================");
    console.log("🔍 [D-LOG PRISMA] GETUSERBYEMAIL APPELÉ");
    console.log("=========================================");
    console.log("[D-LOG PRISMA] Email recherché:", email);
    
    if (!baseAdapter.getUserByEmail) {
      console.error("[D-LOG PRISMA] ❌ getUserByEmail non disponible");
      throw new Error("getUserByEmail method not available on baseAdapter");
    }
    
    try {
      console.log("[D-LOG PRISMA] ⏳ Appel baseAdapter.getUserByEmail...");
      const user = await baseAdapter.getUserByEmail(email);
      console.log("=========================================");
      if (user) {
        console.log("✅ [D-LOG PRISMA] GETUSERBYEMAIL TROUVÉ");
        console.log("[D-LOG PRISMA] Utilisateur:", {
          id: user.id,
          email: user.email,
          name: user.name,
        });
      } else {
        console.log("⚠️ [D-LOG PRISMA] GETUSERBYEMAIL NON TROUVÉ");
        console.log("[D-LOG PRISMA] Aucun utilisateur avec cet email:", email);
      }
      console.log("=========================================");
      return user;
    } catch (error: any) {
      console.error("=========================================");
      console.error("❌ [D-LOG PRISMA] GETUSERBYEMAIL ERREUR");
      console.error("=========================================");
      console.error("[D-LOG PRISMA] Message:", error?.message);
      console.error("[D-LOG PRISMA] Stack:", error?.stack);
      console.error("=========================================");
      throw error;
    }
  },
  
  async getUser(id: string) {
    console.log("=========================================");
    console.log("🔍 [D-LOG PRISMA] GETUSER APPELÉ");
    console.log("=========================================");
    console.log("[D-LOG PRISMA] ID recherché:", id);
    
    if (!baseAdapter.getUser) {
      console.error("[D-LOG PRISMA] ❌ getUser non disponible");
      throw new Error("getUser method not available on baseAdapter");
    }
    
    try {
      console.log("[D-LOG PRISMA] ⏳ Appel baseAdapter.getUser...");
      const user = await baseAdapter.getUser(id);
      console.log("=========================================");
      if (user) {
        console.log("✅ [D-LOG PRISMA] GETUSER TROUVÉ");
        console.log("[D-LOG PRISMA] Utilisateur:", {
          id: user.id,
          email: user.email,
          name: user.name,
        });
      } else {
        console.log("⚠️ [D-LOG PRISMA] GETUSER NON TROUVÉ");
        console.log("[D-LOG PRISMA] Aucun utilisateur avec cet ID:", id);
      }
      console.log("=========================================");
      return user;
    } catch (error: any) {
      console.error("=========================================");
      console.error("❌ [D-LOG PRISMA] GETUSER ERREUR");
      console.error("=========================================");
      console.error("[D-LOG PRISMA] Message:", error?.message);
      console.error("[D-LOG PRISMA] Stack:", error?.stack);
      console.error("=========================================");
      throw error;
    }
  },
  
  async createSession(data: any) {
    console.log("=========================================");
    console.log("🔍 [D-LOG PRISMA] CREATESESSION APPELÉ");
    console.log("=========================================");
    console.log("[D-LOG PRISMA] Données session:", {
      userId: data.userId,
      sessionToken: data.sessionToken ? "Présent" : "Absent",
      expires: data.expires,
    });
    
    if (!baseAdapter.createSession) {
      console.error("[D-LOG PRISMA] ❌ createSession non disponible");
      throw new Error("createSession method not available on baseAdapter");
    }
    
    try {
      console.log("[D-LOG PRISMA] ⏳ Appel baseAdapter.createSession...");
      const session = await baseAdapter.createSession(data);
      console.log("=========================================");
      console.log("✅ [D-LOG PRISMA] CREATESESSION SUCCÈS");
      console.log("=========================================");
      console.log("[D-LOG PRISMA] Session créée:", {
        sessionToken: session.sessionToken ? "Présent" : "Absent",
        userId: session.userId,
        expires: session.expires,
      });
      console.log("=========================================");
      return session;
    } catch (error: any) {
      console.error("=========================================");
      console.error("❌ [D-LOG PRISMA] CREATESESSION ERREUR");
      console.error("=========================================");
      console.error("[D-LOG PRISMA] Message:", error?.message);
      console.error("[D-LOG PRISMA] Code:", error?.code);
      console.error("[D-LOG PRISMA] Stack:", error?.stack);
      console.error("=========================================");
      throw error;
    }
  },
  
  async getSessionAndUser(sessionToken: string) {
    console.log("=========================================");
    console.log("🔍 [D-LOG PRISMA] GETSESSIONANDUSER APPELÉ");
    console.log("=========================================");
    console.log("[D-LOG PRISMA] SessionToken:", sessionToken ? "Présent" : "Absent");
    
    if (!baseAdapter.getSessionAndUser) {
      console.error("[D-LOG PRISMA] ❌ getSessionAndUser non disponible");
      throw new Error("getSessionAndUser method not available on baseAdapter");
    }
    
    try {
      console.log("[D-LOG PRISMA] ⏳ Appel baseAdapter.getSessionAndUser...");
      const result = await baseAdapter.getSessionAndUser(sessionToken);
      console.log("=========================================");
      if (result) {
        console.log("✅ [D-LOG PRISMA] GETSESSIONANDUSER TROUVÉ");
        console.log("[D-LOG PRISMA] Session:", {
          sessionToken: result.session.sessionToken ? "Présent" : "Absent",
          userId: result.session.userId,
          expires: result.session.expires,
        });
        console.log("[D-LOG PRISMA] User:", {
          id: result.user.id,
          email: result.user.email,
        });
      } else {
        console.log("⚠️ [D-LOG PRISMA] GETSESSIONANDUSER NON TROUVÉ");
      }
      console.log("=========================================");
      return result;
    } catch (error: any) {
      console.error("=========================================");
      console.error("❌ [D-LOG PRISMA] GETSESSIONANDUSER ERREUR");
      console.error("=========================================");
      console.error("[D-LOG PRISMA] Message:", error?.message);
      console.error("[D-LOG PRISMA] Stack:", error?.stack);
      console.error("=========================================");
      throw error;
    }
  },
};




