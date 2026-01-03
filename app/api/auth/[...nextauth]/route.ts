import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/app/lib/prisma";
import bcrypt from "bcrypt";
import { NextRequest } from "next/server";

// Vérifier que Prisma est initialisé
if (!prisma) {
  throw new Error("Prisma client n'est pas initialisé");
}

/**
 * Configuration NextAuth
 * Système d'authentification simple et sécurisé pour App Router
 */
function getAuthOptions(): NextAuthOptions {
  return {
    adapter: PrismaAdapter(prisma),
    
    providers: [
      // Google OAuth
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        authorization: {
          params: {
            scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
            access_type: "offline",
            prompt: "consent",
          },
        },
      }),
      
      // Connexion par email/mot de passe
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
      maxAge: 30 * 24 * 60 * 60, // 30 jours
    },

    pages: {
      signIn: "/auth/signin",
    },

    secret: process.env.NEXTAUTH_SECRET,

    // Configuration explicite des cookies pour HTTPS (Vercel)
    cookies: {
      sessionToken: {
        name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
        },
      },
      callbackUrl: {
        name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.callback-url`,
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
        },
      },
      csrfToken: {
        name: `${process.env.NODE_ENV === "production" ? "__Host-" : ""}next-auth.csrf-token`,
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
        },
      },
    },

    callbacks: {
      async signIn() {
        return true;
      },

      async jwt({ token, user, account }) {
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
        if (session.user && token.sub) {
          session.user.id = token.sub;
        }
        return session;
      },

      async redirect({ url, baseUrl }) {
        if (url.startsWith("/")) {
          return `${baseUrl}${url}`;
        }
        if (new URL(url).origin === baseUrl) {
          return url;
        }
        return `${baseUrl}/dashboard`;
      },
    },
  };
}

// Export pour utilisation dans d'autres fichiers
export const authOptions = getAuthOptions();

// Handler NextAuth pour App Router
// NextAuth v4 nécessite une adaptation pour App Router
const handler = NextAuth(authOptions);

/**
 * Adapter la requête App Router pour NextAuth
 * NextAuth v4 extrait automatiquement les paramètres de l'URL
 * Nous construisons simplement l'URL correcte avec les segments de route
 */
function adaptRequestForNextAuth(req: NextRequest, params: { nextauth: string[] }) {
  const url = new URL(req.url);
  const pathSegments = params.nextauth || [];
  
  // Construire le chemin complet avec les segments
  url.pathname = `/api/auth/${pathSegments.join("/")}`;
  
  // Créer une nouvelle requête avec l'URL adaptée
  return new Request(url, {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    body: req.body ? req.body : null,
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> | { nextauth: string[] } }
) {
  try {
    // Résoudre les params si c'est une Promise (Next.js 15+)
    const params = await Promise.resolve(context.params);
    const adaptedReq = adaptRequestForNextAuth(req, params);
    return await handler(adaptedReq);
  } catch (error) {
    console.error("❌ [D-LOG] Erreur GET NextAuth:", error);
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
  req: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> | { nextauth: string[] } }
) {
  try {
    // Résoudre les params si c'est une Promise (Next.js 15+)
    const params = await Promise.resolve(context.params);
    const adaptedReq = adaptRequestForNextAuth(req, params);
    return await handler(adaptedReq);
  } catch (error) {
    console.error("❌ [D-LOG] Erreur POST NextAuth:", error);
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
