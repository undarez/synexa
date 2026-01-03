import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { customPrismaAdapter } from "@/app/lib/auth/prisma-adapter";
import prisma from "@/app/lib/prisma";
import bcrypt from "bcrypt";
import { NextRequest } from "next/server";

// ============================================
// 🔍 LOGS DE CONFIGURATION DÉTAILLÉS
// ============================================
const googleClientId = process.env.GOOGLE_CLIENT_ID?.replace(/^["']|["']$/g, '') || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.replace(/^["']|["']$/g, '') || '';
const nextAuthUrl = process.env.NEXTAUTH_URL?.trim() || '';

console.log("=========================================");
console.log("🔍 [D-LOG] CONFIGURATION NEXTAUTH");
console.log("=========================================");
console.log("[D-LOG] GOOGLE_CLIENT_ID:", googleClientId ? `✅ Configuré (${googleClientId.substring(0, 20)}...)` : "❌ Non configuré");
console.log("[D-LOG] GOOGLE_CLIENT_SECRET:", googleClientSecret ? "✅ Configuré" : "❌ Non configuré");
console.log("[D-LOG] NEXTAUTH_URL:", nextAuthUrl || "❌ Non configuré");
console.log("[D-LOG] NEXTAUTH_URL (raw):", JSON.stringify(process.env.NEXTAUTH_URL));
console.log("[D-LOG] NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? "✅ Configuré" : "❌ Non configuré");
console.log("[D-LOG] NODE_ENV:", process.env.NODE_ENV);
console.log("[D-LOG] VERCEL:", process.env.VERCEL ? "✅ Oui" : "❌ Non");
console.log("[D-LOG] VERCEL_URL:", process.env.VERCEL_URL || "Non défini");
console.log("[D-LOG] VERCEL_ENV:", process.env.VERCEL_ENV || "Non défini");
console.log("=========================================");

export const authOptions: NextAuthOptions = {
  adapter: customPrismaAdapter,
  providers: [
    // Google Provider - seulement si les clés sont configurées
    // Enlever les guillemets si présents
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            authorization: {
              params: {
                scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
                access_type: "offline",
                prompt: "consent", // Force la demande de consentement pour obtenir les nouveaux scopes
              },
            },
          }),
        ]
      : (() => {
          console.error("=========================================");
          console.error("❌ [D-LOG] GOOGLE PROVIDER NON CONFIGURÉ");
          console.error("=========================================");
          console.error("[D-LOG] GOOGLE_CLIENT_ID présent:", !!process.env.GOOGLE_CLIENT_ID);
          console.error("[D-LOG] GOOGLE_CLIENT_SECRET présent:", !!process.env.GOOGLE_CLIENT_SECRET);
          console.error("[D-LOG] GOOGLE_CLIENT_ID valeur:", process.env.GOOGLE_CLIENT_ID ? "Présent (masqué)" : "Absent");
          console.error("[D-LOG] GOOGLE_CLIENT_SECRET valeur:", process.env.GOOGLE_CLIENT_SECRET ? "Présent (masqué)" : "Absent");
          console.error("=========================================");
          return [];
        })()),
    // Facebook Provider - seulement si les clés sont configurées
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? [
          FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("[NextAuth Credentials] Email ou mot de passe manquant");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          console.log("[NextAuth Credentials] Utilisateur non trouvé");
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isValid) {
          console.log("[NextAuth Credentials] Mot de passe incorrect");
          return null;
        }

        // Retourner un objet avec les propriétés attendues par NextAuth
        console.log("[NextAuth Credentials] Connexion réussie pour:", user.email);
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
  pages: { signIn: "/auth/signin" },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  events: {
    async createUser({ user }) {
      console.log("=========================================");
      console.log("🔍 [D-LOG] EVENT: USER CREATED");
      console.log("=========================================");
      console.log("[D-LOG] User créé:", {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image ? "Présent" : "Absent",
      });
      console.log("=========================================");
    },
    async signIn({ user, account, profile }) {
      console.log("=========================================");
      console.log("🔍 [D-LOG] EVENT: SIGN IN");
      console.log("=========================================");
      console.log("[D-LOG] Connexion réussie:", {
        userId: user?.id,
        email: user?.email,
        name: user?.name,
        provider: account?.provider,
        accountId: account?.providerAccountId,
        accountType: account?.type,
        hasAccessToken: !!account?.access_token,
        hasRefreshToken: !!account?.refresh_token,
        scope: account?.scope,
      });
      console.log("[D-LOG] Profile:", profile ? "Présent" : "Absent");
      console.log("=========================================");
    },
    async linkAccount({ user, account }) {
      console.log("=========================================");
      console.log("🔍 [D-LOG] EVENT: ACCOUNT LINKED");
      console.log("=========================================");
      console.log("[D-LOG] Compte lié:", {
        userId: user.id,
        userEmail: user.email,
        provider: account.provider,
        accountId: account.providerAccountId,
        accountType: account.type,
      });
      console.log("=========================================");
    },
    async session({ session, token }) {
      console.log("=========================================");
      console.log("🔍 [D-LOG] EVENT: SESSION CREATED");
      console.log("=========================================");
      console.log("[D-LOG] Session créée:", {
        userId: session.user?.id,
        email: session.user?.email,
        name: session.user?.name,
        hasToken: !!token.sub,
        tokenSub: token.sub,
      });
      console.log("=========================================");
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("=========================================");
      console.log("🔍 [D-LOG] CALLBACK SIGNIN");
      console.log("=========================================");
      console.log("[D-LOG] User:", {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        image: user?.image ? "Présent" : "Absent",
      });
      console.log("[D-LOG] Account:", {
        provider: account?.provider,
        type: account?.type,
        providerAccountId: account?.providerAccountId,
        access_token: account?.access_token ? "Présent" : "Absent",
        refresh_token: account?.refresh_token ? "Présent" : "Absent",
        expires_at: account?.expires_at,
        scope: account?.scope,
      });
      console.log("[D-LOG] Profile:", profile ? "Présent" : "Absent");
      
      // Pour OAuth, on laisse toujours l'adapter Prisma créer/gérer l'utilisateur
      if (account?.provider === "google" || account?.provider === "facebook") {
        console.log("[D-LOG] ✅ Connexion OAuth détectée:", account.provider);
        console.log("[D-LOG] ✅ Autorisation de la connexion");
        console.log("[D-LOG] ✅ L'adapter Prisma va créer/mettre à jour l'utilisateur automatiquement");
        console.log("=========================================");
        return true;
      }
      
      // Pour les autres cas (credentials, etc.), on laisse NextAuth gérer
      console.log("[D-LOG] ✅ Connexion autorisée (credentials)");
      console.log("=========================================");
      return true;
    },
    async redirect({ url, baseUrl }) {
      console.log("=========================================");
      console.log("🔍 [D-LOG] CALLBACK REDIRECT");
      console.log("=========================================");
      // NextAuth fournit baseUrl basé sur NEXTAUTH_URL - on l'utilise directement
      // Enlever le slash final s'il existe
      const finalBaseUrl = baseUrl.replace(/\/$/, '');
      
      console.log("[D-LOG] URL reçue:", url);
      console.log("[D-LOG] BaseUrl (NextAuth):", baseUrl);
      console.log("[D-LOG] BaseUrl (final, sans slash):", finalBaseUrl);
      console.log("[D-LOG] NEXTAUTH_URL (env):", process.env.NEXTAUTH_URL);
      console.log("[D-LOG] VERCEL_URL (env):", process.env.VERCEL_URL);
      
      // Extraire le chemin de l'URL
      let path = "/";
      try {
        if (url.startsWith("/")) {
          path = url.split("?")[0]; // Enlever les query params
        } else if (url.startsWith("http://") || url.startsWith("https://")) {
          const urlObj = new URL(url);
          path = urlObj.pathname;
        } else {
          path = url;
        }
      } catch (e) {
        console.error("[NextAuth Redirect] Erreur parsing URL:", e);
        path = "/dashboard";
      }
      
      // Toujours rediriger vers /dashboard sauf si c'est déjà une route protégée valide
      const validRoutes = ["/dashboard", "/calendar", "/tasks", "/reminders", "/routines", "/devices", "/profile", "/synexa", "/energy", "/weather", "/news"];
      
      // Si c'est la page de connexion, l'accueil, ou une route invalide, rediriger vers dashboard
      if (path === "/" || path.startsWith("/auth/") || path === "/signin" || !validRoutes.some(route => path.startsWith(route))) {
        const redirectTo = `${finalBaseUrl}/dashboard`;
        console.log("[D-LOG] ✅ Redirection vers /dashboard");
        console.log("[D-LOG] URL finale:", redirectTo);
        console.log("=========================================");
        return redirectTo;
      }
      
      // Sinon, utiliser l'URL demandée
      const redirectUrl = url.startsWith("/") ? `${finalBaseUrl}${url}` : url;
      console.log("[D-LOG] ✅ Redirection vers:", path);
      console.log("[D-LOG] URL finale:", redirectUrl);
      console.log("=========================================");
      return redirectUrl;
    },
    async jwt({ token, user, account }) {
      console.log("=========================================");
      console.log("🔍 [D-LOG] CALLBACK JWT");
      console.log("=========================================");
      console.log("[D-LOG] User présent:", !!user);
      console.log("[D-LOG] Account présent:", !!account);
      console.log("[D-LOG] Account provider:", account?.provider);
      
      // Lors de la première connexion, stocker l'ID utilisateur dans le token
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        console.log("[D-LOG] ✅ Utilisateur reçu et ajouté au token:", { 
          id: user.id, 
          email: user.email,
          name: user.name 
        });
      }
      
      // Si c'est une connexion OAuth et qu'on n'a pas encore l'ID utilisateur, le récupérer depuis la DB
      if (account && (!token.sub || !token.email)) {
        console.log("[D-LOG] 🔄 Récupération utilisateur depuis DB...");
        try {
          const accountRecord = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            include: {
              user: true,
            },
          });
          
          if (accountRecord?.user) {
            token.sub = accountRecord.user.id;
            token.email = accountRecord.user.email;
            token.name = accountRecord.user.name;
            token.picture = accountRecord.user.image;
            console.log("[D-LOG] ✅ Utilisateur récupéré depuis DB:", { 
              id: accountRecord.user.id, 
              email: accountRecord.user.email 
            });
          } else {
            console.log("[D-LOG] ⚠️ Aucun compte trouvé dans DB pour:", {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            });
          }
        } catch (error) {
          console.error("[D-LOG] ❌ Erreur récupération utilisateur:", error);
          if (error instanceof Error) {
            console.error("[D-LOG] ❌ Message d'erreur:", error.message);
            console.error("[D-LOG] ❌ Stack:", error.stack);
          }
        }
      }
      
      // Si c'est une connexion OAuth, mettre à jour les informations
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        console.log("[D-LOG] ✅ Tokens OAuth ajoutés au JWT:", {
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          expiresAt: account.expires_at,
          scope: account.scope,
        });
      }
      
      console.log("[D-LOG] ✅ Token JWT final:", { 
        sub: token.sub, 
        email: token.email,
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
      });
      console.log("=========================================");
      return token;
    },
    async session({ session, token }) {
      console.log("=========================================");
      console.log("🔍 [D-LOG] CALLBACK SESSION");
      console.log("=========================================");
      console.log("[D-LOG] Session initiale:", {
        userId: session.user?.id,
        email: session.user?.email,
        name: session.user?.name,
      });
      console.log("[D-LOG] Token:", {
        sub: token.sub,
        email: token.email,
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
      });
      
      // Ajouter l'ID utilisateur à la session
      if (session.user && token.sub) {
        session.user.id = token.sub;
        console.log("[D-LOG] ✅ ID utilisateur ajouté depuis token:", token.sub);
      }
      
      // Si on n'a pas l'ID utilisateur, essayer de le récupérer depuis la DB
      if (session.user && !session.user.id && token.email) {
        console.log("[D-LOG] 🔄 Récupération utilisateur depuis DB (fallback)...");
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, email: true, name: true, image: true },
          });
          
          if (dbUser) {
            session.user.id = dbUser.id;
            session.user.email = dbUser.email || session.user.email;
            session.user.name = dbUser.name || session.user.name;
            session.user.image = dbUser.image || session.user.image;
            console.log("[D-LOG] ✅ Utilisateur récupéré depuis DB (fallback):", { 
              id: dbUser.id, 
              email: dbUser.email 
            });
          } else {
            console.log("[D-LOG] ⚠️ Aucun utilisateur trouvé dans DB pour email:", token.email);
          }
        } catch (error) {
          console.error("[D-LOG] ❌ Erreur récupération utilisateur (fallback):", error);
          if (error instanceof Error) {
            console.error("[D-LOG] ❌ Message d'erreur:", error.message);
          }
        }
      }
      
      // Ajouter les informations du token à la session si nécessaire
      if (token.email) {
        session.user.email = token.email as string;
      }
      if (token.name) {
        session.user.name = token.name as string;
      }
      if (token.picture) {
        session.user.image = token.picture as string;
      }
      
      console.log("[D-LOG] ✅ Session finale créée:", { 
        userId: session.user.id, 
        email: session.user.email,
        name: session.user.name,
      });
      console.log("=========================================");
      return session;
    },
  },
};

// ============================================
// 🔍 HANDLER NEXTAUTH AVEC LOGS DÉTAILLÉS
// ============================================
const handler = NextAuth(authOptions);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  console.log("=========================================");
  console.log("🔍 [D-LOG] GET REQUEST - NEXTAUTH");
  console.log("=========================================");
  console.log("[D-LOG] URL complète:", request.url);
  console.log("[D-LOG] Pathname:", url.pathname);
  console.log("[D-LOG] Search params:", Object.fromEntries(url.searchParams.entries()));
  
  // Si c'est un callback OAuth, logger les paramètres importants
  if (url.pathname.includes("/callback")) {
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const state = url.searchParams.get("state");
    console.log("[D-LOG] ⚠️ CALLBACK OAUTH DÉTECTÉ:");
    console.log("[D-LOG]   - Code:", code ? "Présent" : "Absent");
    console.log("[D-LOG]   - Error:", error || "Absent");
    console.log("[D-LOG]   - State:", state || "Absent");
  }
  
  try {
    const response = await handler.GET(request as any);
    
    console.log("[D-LOG] ✅ GET Response status:", response.status);
    
    // Si c'est une redirection, logger la destination
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      console.log("[D-LOG] ✅ Redirection vers:", location);
    }
    
    // Si c'est un callback et qu'il y a une erreur, logger plus de détails
    if (url.pathname.includes("/callback") && url.searchParams.get("error")) {
      console.error("[D-LOG] ❌ ERREUR DANS CALLBACK:");
      console.error("[D-LOG]   - Error:", url.searchParams.get("error"));
      console.error("[D-LOG]   - Error description:", url.searchParams.get("error_description"));
    }
    
    console.log("=========================================");
    return response;
  } catch (error) {
    console.error("=========================================");
    console.error("❌ [D-LOG] EXCEPTION DANS GET HANDLER");
    console.error("=========================================");
    console.error("[D-LOG] Erreur:", error);
    if (error instanceof Error) {
      console.error("[D-LOG] Message:", error.message);
      console.error("[D-LOG] Stack:", error.stack);
    }
    console.error("=========================================");
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  console.log("=========================================");
  console.log("🔍 [D-LOG] POST REQUEST - NEXTAUTH");
  console.log("=========================================");
  console.log("[D-LOG] URL complète:", request.url);
  console.log("[D-LOG] Pathname:", url.pathname);
  
  try {
    const response = await handler.POST(request as any);
    console.log("[D-LOG] ✅ POST Response status:", response.status);
    console.log("=========================================");
    return response;
  } catch (error) {
    console.error("=========================================");
    console.error("❌ [D-LOG] EXCEPTION DANS POST HANDLER");
    console.error("=========================================");
    console.error("[D-LOG] Erreur:", error);
    if (error instanceof Error) {
      console.error("[D-LOG] Message:", error.message);
      console.error("[D-LOG] Stack:", error.stack);
    }
    console.error("=========================================");
    throw error;
  }
}
