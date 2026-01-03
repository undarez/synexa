import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/app/lib/prisma";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
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
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Host-" : ""}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("🔐 [NEXTAUTH] signIn callback:", {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider,
        hasAccessToken: !!account?.access_token,
      });
      
      // Vérifier que l'authentification Google a réussi
      if (account?.provider === "google") {
        if (!account.access_token) {
          console.error("❌ [NEXTAUTH] Google access_token manquant");
          return false;
        }
        console.log("✅ [NEXTAUTH] Google signIn autorisé");
      }
      
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      console.log("🎫 [NEXTAUTH] jwt callback:", {
        trigger,
        hasUser: !!user,
        hasAccount: !!account,
        tokenSub: token.sub,
      });
      
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("👤 [NEXTAUTH] session callback:", {
        hasToken: !!token,
        tokenSub: token.sub,
        sessionUser: session.user?.email,
      });
      
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log("↪️ [NEXTAUTH] redirect callback:", { url, baseUrl });
      
      // Toujours rediriger vers /dashboard après authentification réussie
      // Ignorer l'URL demandée pour éviter les boucles
      if (url.includes("/auth/signin") || url.includes("/api/auth")) {
        console.log("↪️ [NEXTAUTH] Redirection vers /dashboard (éviter boucle)");
        return `${baseUrl}/dashboard`;
      }
      
      // Si l'URL est relative, l'autoriser
      if (url.startsWith("/")) {
        const finalUrl = `${baseUrl}${url}`;
        console.log("↪️ [NEXTAUTH] Redirection relative:", finalUrl);
        return finalUrl;
      }
      
      // Si l'URL est de la même origine, l'autoriser
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) {
          console.log("↪️ [NEXTAUTH] Redirection même origine:", url);
          return url;
        }
      } catch (e) {
        // URL invalide, rediriger vers dashboard
      }
      
      // Par défaut, rediriger vers le dashboard
      console.log("↪️ [NEXTAUTH] Redirection par défaut vers /dashboard");
      return `${baseUrl}/dashboard`;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Ajouter des événements pour logger les erreurs
authOptions.events = {
  async signIn({ user, account, isNewUser }) {
    console.log("📝 [NEXTAUTH] Event signIn:", {
      userId: user?.id,
      email: user?.email,
      isNewUser,
      provider: account?.provider,
    });
  },
  async createUser({ user }) {
    console.log("➕ [NEXTAUTH] Event createUser:", {
      userId: user.id,
      email: user.email,
    });
  },
  async linkAccount({ user, account }) {
    console.log("🔗 [NEXTAUTH] Event linkAccount:", {
      userId: user.id,
      provider: account.provider,
    });
  },
  async session({ session, token }) {
    console.log("📋 [NEXTAUTH] Event session:", {
      userEmail: session.user?.email,
      hasToken: !!token,
    });
  },
  async signOut({ session, token }) {
    console.log("🚪 [NEXTAUTH] Event signOut");
  },
};

// Ajouter debug en développement
authOptions.debug = process.env.NODE_ENV === "development";

let handler: ReturnType<typeof NextAuth>;

try {
  handler = NextAuth(authOptions);
  console.log("✅ [NEXTAUTH] Handler NextAuth créé avec succès");
} catch (error) {
  console.error("❌ [NEXTAUTH] Erreur lors de la création du handler:", error);
  throw error;
}

/**
 * Adapter pour convertir une Request App Router en format NextAuth
 * NextAuth s'attend à req.query.nextauth qui n'existe pas en App Router
 */
function adaptRequestForNextAuth(
  req: Request,
  params: { nextauth: string[] }
): any {
  const url = new URL(req.url);
  
  // Extraire les segments nextauth depuis l'URL
  const pathSegments = url.pathname.split("/").filter(Boolean);
  const authIndex = pathSegments.indexOf("auth");
  const nextauthParams = params.nextauth || (authIndex >= 0 ? pathSegments.slice(authIndex + 1) : []);
  
  // Extraire les query params de l'URL
  const queryParams: Record<string, string | string[]> = {};
  url.searchParams.forEach((value, key) => {
    // Si la clé existe déjà, convertir en tableau
    if (queryParams[key]) {
      const existing = queryParams[key];
      queryParams[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      queryParams[key] = value;
    }
  });
  
  // CRITIQUE: S'assurer que query.nextauth existe toujours
  queryParams.nextauth = nextauthParams;
  
  // Créer un objet compatible avec NextAuth (format Pages Router)
  // L'objet doit avoir exactement la structure attendue par NextAuth
  const adaptedReq = {
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    // CRITIQUE: query doit être un objet avec nextauth
    query: queryParams,
    cookies: (() => {
      const cookieHeader = req.headers.get("cookie");
      if (!cookieHeader) return {};
      const cookies: Record<string, string> = {};
      cookieHeader.split("; ").forEach(cookie => {
        const [key, ...values] = cookie.split("=");
        if (key) {
          cookies[key.trim()] = decodeURIComponent(values.join("="));
        }
      });
      return cookies;
    })(),
  };
  
  // Vérification critique
  if (!adaptedReq.query || !Array.isArray(adaptedReq.query.nextauth)) {
    console.error("❌ [NEXTAUTH] ERREUR: query.nextauth n'est pas défini correctement!");
    console.error("❌ [NEXTAUTH] query:", adaptedReq.query);
    console.error("❌ [NEXTAUTH] nextauthParams:", nextauthParams);
    throw new Error("query.nextauth must be an array");
  }
  
  console.log("🔧 [NEXTAUTH] Requête adaptée:", {
    url: adaptedReq.url,
    method: adaptedReq.method,
    nextauth: adaptedReq.query.nextauth,
    queryKeys: Object.keys(adaptedReq.query),
  });
  
  return adaptedReq;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> } | { params: { nextauth: string[] } }
) {
  try {
    const params = await Promise.resolve(context.params);
    console.log("📥 [NEXTAUTH] GET request:", req.url);
    console.log("📥 [NEXTAUTH] Params:", params);
    
    const adaptedReq = adaptRequestForNextAuth(req, params);
    const response = await handler(adaptedReq);
    
    console.log("✅ [NEXTAUTH] GET response:", response.status);
    return response;
  } catch (error) {
    console.error("❌ [NEXTAUTH] Erreur GET:", error);
    console.error("❌ [NEXTAUTH] Stack:", error instanceof Error ? error.stack : "N/A");
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
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
  context: { params: Promise<{ nextauth: string[] }> } | { params: { nextauth: string[] } }
) {
  try {
    const params = await Promise.resolve(context.params);
    console.log("📥 [NEXTAUTH] POST request:", req.url);
    console.log("📥 [NEXTAUTH] Params:", params);
    
    const adaptedReq = adaptRequestForNextAuth(req, params);
    const response = await handler(adaptedReq);
    
    console.log("✅ [NEXTAUTH] POST response:", response.status);
    return response;
  } catch (error) {
    console.error("❌ [NEXTAUTH] Erreur POST:", error);
    console.error("❌ [NEXTAUTH] Stack:", error instanceof Error ? error.stack : "N/A");
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
