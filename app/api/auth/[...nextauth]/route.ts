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
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async signIn({ user, account }) {
      console.log("[NextAuth SignIn] Tentative de connexion:", { 
        userId: user?.id, 
        email: user?.email, 
        provider: account?.provider 
      });
      
      // Si c'est un provider OAuth (Google, Facebook)
      if (account?.provider === "google" || account?.provider === "facebook") {
        try {
          // Vérifie si un utilisateur existe déjà avec cet email
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email || undefined },
          });

          // Si l'utilisateur existe mais n'a pas de compte OAuth lié, on lie le compte
          if (existingUser && account) {
            const existingAccount = await prisma.account.findUnique({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
            });

            // Si le compte OAuth n'existe pas encore, on le crée et on le lie
            if (!existingAccount) {
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state,
                },
              });
              console.log("[NextAuth SignIn] Compte OAuth lié à l'utilisateur existant");
            } else {
              // Mettre à jour le compte existant avec les nouveaux tokens et scopes
              await prisma.account.update({
                where: {
                  provider_providerAccountId: {
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                  },
                },
                data: {
                  refresh_token: account.refresh_token || existingAccount.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope || existingAccount.scope, // Mettre à jour les scopes
                  id_token: account.id_token,
                  session_state: account.session_state,
                },
              });
              console.log("[NextAuth SignIn] Compte OAuth mis à jour");
            }
          } else if (!existingUser) {
            // Si l'utilisateur n'existe pas, l'adapter Prisma le créera automatiquement
            console.log("[NextAuth SignIn] Nouvel utilisateur OAuth, création par l'adapter");
          }
          
          // Toujours autoriser la connexion OAuth
          console.log("[NextAuth SignIn] Connexion OAuth autorisée");
          return true;
        } catch (error) {
          console.error("[NextAuth SignIn] Erreur lors de la connexion OAuth:", error);
          // En cas d'erreur, on autorise quand même la connexion (l'adapter gérera)
          return true;
        }
      }
      
      // Pour les autres cas (credentials, etc.), on laisse NextAuth gérer
      console.log("[NextAuth SignIn] Connexion autorisée (credentials)");
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Priorité : baseUrl (fourni par NextAuth) > NEXTAUTH_URL > localhost
      let finalBaseUrl: string = baseUrl || "";
      if (!finalBaseUrl) {
        const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
        if (nextAuthUrl) {
          finalBaseUrl = nextAuthUrl;
        }
      }
      if (!finalBaseUrl) {
        finalBaseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
      }
      // Enlever le slash final s'il existe
      finalBaseUrl = finalBaseUrl.replace(/\/$/, '');
      
      console.log("[NextAuth Redirect] URL reçue:", url);
      console.log("[NextAuth Redirect] BaseUrl (fourni):", baseUrl);
      console.log("[NextAuth Redirect] NEXTAUTH_URL (env):", process.env.NEXTAUTH_URL);
      console.log("[NextAuth Redirect] VERCEL_URL (env):", process.env.VERCEL_URL);
      console.log("[NextAuth Redirect] BaseUrl final utilisé:", finalBaseUrl);
      
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
        console.log("[NextAuth Redirect] Redirection vers /dashboard (route invalide ou page de connexion)");
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
