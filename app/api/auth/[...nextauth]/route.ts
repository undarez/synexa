import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { customPrismaAdapter } from "@/app/lib/auth/prisma-adapter";
import prisma from "@/app/lib/prisma";
import bcrypt from "bcrypt";

// Log pour déboguer la configuration Google
const googleClientId = process.env.GOOGLE_CLIENT_ID?.replace(/^["']|["']$/g, '') || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.replace(/^["']|["']$/g, '') || '';
const nextAuthUrl = process.env.NEXTAUTH_URL?.trim() || '';
console.log("[NextAuth Config] GOOGLE_CLIENT_ID:", googleClientId ? `✅ Configuré (${googleClientId.substring(0, 20)}...)` : "❌ Non configuré");
console.log("[NextAuth Config] GOOGLE_CLIENT_SECRET:", googleClientSecret ? "✅ Configuré" : "❌ Non configuré");
console.log("[NextAuth Config] NEXTAUTH_URL:", nextAuthUrl || "❌ Non configuré");
console.log("[NextAuth Config] NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? "✅ Configuré" : "❌ Non configuré");
console.log("[NextAuth Config] NODE_ENV:", process.env.NODE_ENV);

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
          console.warn("[NextAuth Config] ⚠️ Google Provider non configuré - GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET manquant");
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
  url: process.env.NEXTAUTH_URL, // IMPORTANT : NextAuth utilise cette URL pour générer les callbacks
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async signIn({ user, account }) {
      console.log("[NextAuth SignIn] Tentative de connexion:", { 
        userId: user?.id, 
        email: user?.email, 
        name: user?.name,
        provider: account?.provider 
      });
      
      // Pour OAuth, on laisse toujours l'adapter Prisma créer/gérer l'utilisateur
      // On ne fait que logger pour le débogage
      if (account?.provider === "google" || account?.provider === "facebook") {
        console.log("[NextAuth SignIn] Connexion OAuth détectée, autorisation de la connexion");
        console.log("[NextAuth SignIn] L'adapter Prisma va créer/mettre à jour l'utilisateur automatiquement");
        // Toujours autoriser - l'adapter Prisma gère la création/mise à jour
        return true;
      }
      
      // Pour les autres cas (credentials, etc.), on laisse NextAuth gérer
      console.log("[NextAuth SignIn] Connexion autorisée (credentials)");
      return true;
    },
    async redirect({ url, baseUrl }) {
      // NextAuth fournit baseUrl basé sur NEXTAUTH_URL - on l'utilise directement
      // Enlever le slash final s'il existe
      const finalBaseUrl = baseUrl.replace(/\/$/, '');
      
      console.log("[NextAuth Redirect] URL reçue:", url);
      console.log("[NextAuth Redirect] BaseUrl (NextAuth):", baseUrl);
      console.log("[NextAuth Redirect] NEXTAUTH_URL (env):", process.env.NEXTAUTH_URL);
      
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
        console.log("[NextAuth Redirect] Redirection vers /dashboard");
        return `${finalBaseUrl}/dashboard`;
      }
      
      // Sinon, utiliser l'URL demandée
      console.log("[NextAuth Redirect] Redirection vers:", path);
      const redirectUrl = url.startsWith("/") ? `${finalBaseUrl}${url}` : url;
      return redirectUrl;
    },
    async jwt({ token, user, account }) {
      // Lors de la première connexion, stocker l'ID utilisateur dans le token
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        console.log("[NextAuth JWT] Utilisateur reçu:", { id: user.id, email: user.email });
      }
      
      // Si c'est une connexion OAuth et qu'on n'a pas encore l'ID utilisateur, le récupérer depuis la DB
      if (account && (!token.sub || !token.email)) {
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
            console.log("[NextAuth JWT] Utilisateur récupéré depuis DB:", { id: accountRecord.user.id, email: accountRecord.user.email });
          }
        } catch (error) {
          console.error("[NextAuth JWT] Erreur récupération utilisateur:", error);
        }
      }
      
      // Si c'est une connexion OAuth, mettre à jour les informations
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      
      console.log("[NextAuth JWT] Token mis à jour:", { sub: token.sub, email: token.email });
      return token;
    },
    async session({ session, token }) {
      // Ajouter l'ID utilisateur à la session
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      
      // Si on n'a pas l'ID utilisateur, essayer de le récupérer depuis la DB
      if (session.user && !session.user.id && token.email) {
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
            console.log("[NextAuth Session] Utilisateur récupéré depuis DB pour session:", { id: dbUser.id, email: dbUser.email });
          }
        } catch (error) {
          console.error("[NextAuth Session] Erreur récupération utilisateur:", error);
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
      
      console.log("[NextAuth Session] Session créée:", { userId: session.user.id, email: session.user.email });
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
