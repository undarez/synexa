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
    async signIn({ user, account, profile }) {
      console.log("🔐 [NEXTAUTH] Callback signIn déclenché");
      console.log("🔐 [NEXTAUTH] User:", user ? { id: user.id, email: user.email, name: user.name } : "null");
      console.log("🔐 [NEXTAUTH] Account:", account ? { provider: account.provider, type: account.type } : "null");
      console.log("🔐 [NEXTAUTH] Profile:", profile ? { email: profile.email, name: profile.name } : "null");
      return true;
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
      console.log("📝 [NEXTAUTH] Event signIn déclenché");
      console.log("📝 [NEXTAUTH] User:", user ? { id: user.id, email: user.email } : "null");
      console.log("📝 [NEXTAUTH] Account:", account ? { provider: account.provider } : "null");
      console.log("📝 [NEXTAUTH] Nouvel utilisateur:", isNewUser);
    },
    async createUser({ user }) {
      console.log("➕ [NEXTAUTH] Event createUser déclenché");
      console.log("➕ [NEXTAUTH] Nouvel utilisateur créé:", { id: user.id, email: user.email, name: user.name });
    },
    async linkAccount({ user, account }) {
      console.log("🔗 [NEXTAUTH] Event linkAccount déclenché");
      console.log("🔗 [NEXTAUTH] Compte lié pour:", { userId: user.id, provider: account.provider });
    },
    async session({ session, token }) {
      console.log("📋 [NEXTAUTH] Event session déclenché");
      console.log("📋 [NEXTAUTH] Session:", session.user ? { email: session.user.email } : "null");
    },
  },
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

export async function GET(req: Request) {
  console.log("📥 [NEXTAUTH] GET request reçue");
  console.log("📥 [NEXTAUTH] URL:", req.url);
  console.log("📥 [NEXTAUTH] Method:", req.method);
  
  try {
    const response = await handler(req);
    console.log("✅ [NEXTAUTH] GET response générée avec succès");
    console.log("✅ [NEXTAUTH] Status:", response.status);
    return response;
  } catch (error) {
    console.error("❌ [NEXTAUTH] Erreur dans GET handler:", error);
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

export async function POST(req: Request) {
  console.log("📥 [NEXTAUTH] POST request reçue");
  console.log("📥 [NEXTAUTH] URL:", req.url);
  console.log("📥 [NEXTAUTH] Method:", req.method);
  
  try {
    const response = await handler(req);
    console.log("✅ [NEXTAUTH] POST response générée avec succès");
    console.log("✅ [NEXTAUTH] Status:", response.status);
    return response;
  } catch (error) {
    console.error("❌ [NEXTAUTH] Erreur dans POST handler:", error);
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
