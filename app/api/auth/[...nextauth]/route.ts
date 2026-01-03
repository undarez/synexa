import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/app/lib/prisma";
import bcrypt from "bcrypt";

// Logs d'initialisation
console.log("🔧 [NEXTAUTH] Initialisation de la configuration...");
console.log("🔧 [NEXTAUTH] NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
console.log("🔧 [NEXTAUTH] NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? "✅ Défini" : "❌ Manquant");
console.log("🔧 [NEXTAUTH] GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "✅ Défini" : "❌ Manquant");
console.log("🔧 [NEXTAUTH] GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "✅ Défini" : "❌ Manquant");
console.log("🔧 [NEXTAUTH] NODE_ENV:", process.env.NODE_ENV);
console.log("🔧 [NEXTAUTH] VERCEL:", process.env.VERCEL);
console.log("🔧 [NEXTAUTH] VERCEL_URL:", process.env.VERCEL_URL);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/auth/signin",
  },

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log("🔐 [NEXTAUTH] ========== CALLBACK SIGNIN ==========");
      console.log("🔐 [NEXTAUTH] User:", user ? { id: user.id, email: user.email, name: user.name } : "null");
      console.log("🔐 [NEXTAUTH] Account:", account ? { 
        provider: account.provider, 
        type: account.type,
        providerAccountId: account.providerAccountId,
        access_token: account.access_token ? "✅ Présent" : "❌ Manquant",
        refresh_token: account.refresh_token ? "✅ Présent" : "❌ Manquant",
        expires_at: account.expires_at,
      } : "null");
      console.log("🔐 [NEXTAUTH] Profile:", profile ? { 
        email: profile.email, 
        name: profile.name,
        sub: profile.sub,
      } : "null");
      console.log("🔐 [NEXTAUTH] Email:", email);
      console.log("🔐 [NEXTAUTH] Credentials:", credentials ? "✅ Présent" : "null");
      
      try {
        // Vérifier que l'account est valide pour OAuth
        if (account && account.provider === "google") {
          console.log("🔐 [NEXTAUTH] Vérification du compte Google...");
          if (!account.access_token) {
            console.error("❌ [NEXTAUTH] ERREUR: Access token manquant pour Google");
            return false;
          }
          console.log("✅ [NEXTAUTH] Compte Google valide");
        }
        
        console.log("✅ [NEXTAUTH] SignIn autorisé");
        return true;
      } catch (error) {
        console.error("❌ [NEXTAUTH] ERREUR dans signIn callback:", error);
        console.error("❌ [NEXTAUTH] Stack:", error instanceof Error ? error.stack : "N/A");
        return false;
      }
    },

    async jwt({ token, user, account, trigger }) {
      console.log("🎫 [NEXTAUTH] Callback jwt déclenché");
      console.log("🎫 [NEXTAUTH] Trigger:", trigger);
      
      if (user) {
        console.log("🎫 [NEXTAUTH] User détecté, mise à jour du token");
        console.log("🎫 [NEXTAUTH] User ID:", user.id);
        console.log("🎫 [NEXTAUTH] User Email:", user.email);
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }

      if (account) {
        console.log("🎫 [NEXTAUTH] Account détecté, stockage des tokens OAuth");
        console.log("🎫 [NEXTAUTH] Provider:", account.provider);
        console.log("🎫 [NEXTAUTH] Access Token:", account.access_token ? "✅ Présent" : "❌ Manquant");
        console.log("🎫 [NEXTAUTH] Refresh Token:", account.refresh_token ? "✅ Présent" : "❌ Manquant");
        console.log("🎫 [NEXTAUTH] Expires At:", account.expires_at);
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      console.log("🎫 [NEXTAUTH] Token final:", {
        sub: token.sub,
        email: token.email,
        name: token.name,
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
      });

      return token;
    },

    async session({ session, token }) {
      console.log("👤 [NEXTAUTH] Callback session déclenché");
      console.log("👤 [NEXTAUTH] Token sub:", token.sub);
      console.log("👤 [NEXTAUTH] Session user:", session.user ? { email: session.user.email, name: session.user.name } : "null");
      
      if (session.user && token.sub) {
        session.user.id = token.sub;
        console.log("👤 [NEXTAUTH] ID utilisateur ajouté à la session:", token.sub);
      }
      
      console.log("👤 [NEXTAUTH] Session finale:", {
        user: session.user ? { id: session.user.id, email: session.user.email } : null,
        expires: session.expires,
      });
      
      return session;
    },

    async redirect({ url, baseUrl }) {
      console.log("↪️ [NEXTAUTH] Callback redirect déclenché");
      console.log("↪️ [NEXTAUTH] URL demandée:", url);
      console.log("↪️ [NEXTAUTH] Base URL:", baseUrl);
      
      let redirectUrl: string;
      
      if (url.startsWith("/")) {
        redirectUrl = `${baseUrl}${url}`;
        console.log("↪️ [NEXTAUTH] URL relative détectée, redirection vers:", redirectUrl);
      } else if (new URL(url).origin === baseUrl) {
        redirectUrl = url;
        console.log("↪️ [NEXTAUTH] URL même origine, redirection vers:", redirectUrl);
      } else {
        redirectUrl = `${baseUrl}/dashboard`;
        console.log("↪️ [NEXTAUTH] URL externe ou invalide, redirection par défaut vers:", redirectUrl);
      }
      
      console.log("↪️ [NEXTAUTH] URL de redirection finale:", redirectUrl);
      return redirectUrl;
    },
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      console.log("📝 [NEXTAUTH] ========== EVENT SIGNIN ==========");
      console.log("📝 [NEXTAUTH] User:", user ? { id: user.id, email: user.email } : "null");
      console.log("📝 [NEXTAUTH] Account:", account ? { provider: account.provider } : "null");
      console.log("📝 [NEXTAUTH] Nouvel utilisateur:", isNewUser);
    },
    async createUser({ user }) {
      console.log("➕ [NEXTAUTH] ========== EVENT CREATEUSER ==========");
      console.log("➕ [NEXTAUTH] Nouvel utilisateur créé:", { id: user.id, email: user.email, name: user.name });
    },
    async linkAccount({ user, account }) {
      console.log("🔗 [NEXTAUTH] ========== EVENT LINKACCOUNT ==========");
      console.log("🔗 [NEXTAUTH] Compte lié pour:", { userId: user.id, provider: account.provider });
      console.log("🔗 [NEXTAUTH] Account details:", {
        provider: account.provider,
        type: account.type,
        providerAccountId: account.providerAccountId,
        access_token: account.access_token ? "✅ Présent" : "❌ Manquant",
      });
    },
    async session({ session, token }) {
      console.log("📋 [NEXTAUTH] Event session déclenché");
      console.log("📋 [NEXTAUTH] Session:", session.user ? { email: session.user.email } : "null");
    },
    async signOut({ session, token }) {
      console.log("🚪 [NEXTAUTH] ========== EVENT SIGNOUT ==========");
      console.log("🚪 [NEXTAUTH] Session:", session?.user ? { email: session.user.email } : "null");
    },
  },
  
  debug: process.env.NODE_ENV === "development",
};

console.log("🚀 [NEXTAUTH] Création du handler NextAuth...");

let handler: ReturnType<typeof NextAuth>;

try {
  handler = NextAuth(authOptions);
  console.log("✅ [NEXTAUTH] Handler NextAuth créé avec succès");
} catch (error) {
  console.error("❌ [NEXTAUTH] Erreur lors de la création du handler:", error);
  throw error;
}

/**
 * Adapter la requête pour NextAuth
 * NextAuth s'attend à req.query.nextauth qui n'existe pas en App Router
 */
function adaptRequestForNextAuth(req: Request, params: { nextauth: string[] }): any {
  // Créer un objet qui simule la structure attendue par NextAuth
  const adaptedReq = Object.create(req);
  adaptedReq.query = { nextauth: params.nextauth };
  return adaptedReq;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> | { nextauth: string[] } }
) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const searchParams = url.searchParams;
  
  console.log("📥 [NEXTAUTH] ========== GET REQUEST ==========");
  console.log("📥 [NEXTAUTH] URL complète:", req.url);
  console.log("📥 [NEXTAUTH] Pathname:", pathname);
  console.log("📥 [NEXTAUTH] Search params:", Object.fromEntries(searchParams.entries()));
  console.log("📥 [NEXTAUTH] Method:", req.method);
  
  // Résoudre les params si c'est une Promise (Next.js 15+)
  let params: { nextauth: string[] };
  try {
    params = await Promise.resolve(context.params);
    console.log("📥 [NEXTAUTH] Params résolus:", params);
  } catch (error) {
    console.error("❌ [NEXTAUTH] Erreur résolution params:", error);
    // Extraire les params du pathname si la résolution échoue
    const segments = pathname.replace("/api/auth/", "").split("/").filter(Boolean);
    params = { nextauth: segments };
    console.log("📥 [NEXTAUTH] Params extraits du pathname:", params);
  }
  
  // Logs spécifiques pour le callback Google
  if (pathname.includes("/callback/google") || (params.nextauth?.includes("callback") && params.nextauth?.includes("google"))) {
    console.log("🔄 [NEXTAUTH] ========== CALLBACK GOOGLE DÉTECTÉ ==========");
    console.log("🔄 [NEXTAUTH] Code:", searchParams.get("code") ? "✅ Présent" : "❌ Manquant");
    console.log("🔄 [NEXTAUTH] Error:", searchParams.get("error") || "Aucune");
    console.log("🔄 [NEXTAUTH] State:", searchParams.get("state") ? "✅ Présent" : "❌ Manquant");
    console.log("🔄 [NEXTAUTH] Scope:", searchParams.get("scope") || "N/A");
  }
  
  try {
    // Adapter la requête pour NextAuth
    const adaptedReq = adaptRequestForNextAuth(req, params);
    console.log("📥 [NEXTAUTH] Requête adaptée avec query.nextauth:", adaptedReq.query);
    
    const response = await handler(adaptedReq);
    console.log("✅ [NEXTAUTH] GET response générée");
    console.log("✅ [NEXTAUTH] Status:", response.status);
    console.log("✅ [NEXTAUTH] Headers:", Object.fromEntries(response.headers.entries()));
    
    // Si c'est une redirection, logger la destination
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      console.log("↪️ [NEXTAUTH] Redirection vers:", location);
    }
    
    return response;
  } catch (error) {
    console.error("❌ [NEXTAUTH] ========== ERREUR GET HANDLER ==========");
    console.error("❌ [NEXTAUTH] Erreur:", error);
    console.error("❌ [NEXTAUTH] Message:", error instanceof Error ? error.message : "Unknown error");
    console.error("❌ [NEXTAUTH] Stack:", error instanceof Error ? error.stack : "N/A");
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> | { nextauth: string[] } }
) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  console.log("📥 [NEXTAUTH] ========== POST REQUEST ==========");
  console.log("📥 [NEXTAUTH] URL complète:", req.url);
  console.log("📥 [NEXTAUTH] Pathname:", pathname);
  console.log("📥 [NEXTAUTH] Method:", req.method);
  
  // Résoudre les params si c'est une Promise (Next.js 15+)
  let params: { nextauth: string[] };
  try {
    params = await Promise.resolve(context.params);
    console.log("📥 [NEXTAUTH] Params résolus:", params);
  } catch (error) {
    console.error("❌ [NEXTAUTH] Erreur résolution params:", error);
    // Extraire les params du pathname si la résolution échoue
    const segments = pathname.replace("/api/auth/", "").split("/").filter(Boolean);
    params = { nextauth: segments };
    console.log("📥 [NEXTAUTH] Params extraits du pathname:", params);
  }
  
  try {
    // Adapter la requête pour NextAuth
    const adaptedReq = adaptRequestForNextAuth(req, params);
    console.log("📥 [NEXTAUTH] Requête adaptée avec query.nextauth:", adaptedReq.query);
    
    const response = await handler(adaptedReq);
    console.log("✅ [NEXTAUTH] POST response générée");
    console.log("✅ [NEXTAUTH] Status:", response.status);
    return response;
  } catch (error) {
    console.error("❌ [NEXTAUTH] ========== ERREUR POST HANDLER ==========");
    console.error("❌ [NEXTAUTH] Erreur:", error);
    console.error("❌ [NEXTAUTH] Message:", error instanceof Error ? error.message : "Unknown error");
    console.error("❌ [NEXTAUTH] Stack:", error instanceof Error ? error.stack : "N/A");
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
