

import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/app/lib/prisma";
import bcrypt from "bcrypt";

if (!process.env.DATABASE_URL) {
  console.error("❌ [NEXTAUTH] DATABASE_URL non configuré");
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/fitness.activity.read",
            "https://www.googleapis.com/auth/fitness.body.read",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),

    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID ?? "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
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

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

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
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  /**
   * ⚠️ IMPORTANT
   * On laisse NextAuth gérer les cookies par défaut
   * → plus fiable, moins d’erreurs
   */

  callbacks: {
    async signIn({ user, account }) {
      console.log("🔐 [NEXTAUTH] signIn callback:", {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider,
        hasAccessToken: !!account?.access_token,
        hasRefreshToken: !!account?.refresh_token,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      });

      if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL manquant");
        return false;
      }

      if (account?.provider === "google" && !account.access_token) {
        console.error("❌ Google access_token manquant");
        return false;
      }

      console.log("✅ [NEXTAUTH] signIn autorisé");
      return true;
    },

    async session({ session, user }) {
      console.log("👤 [NEXTAUTH] session callback:", {
        userId: user?.id,
        email: session.user?.email,
        hasUser: !!user,
        hasSession: !!session,
      });

      if (session.user && user) {
        session.user.id = user.id;
      } else {
        console.warn("⚠️ [NEXTAUTH] Session sans user - possible problème DB");
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      console.log("🔄 [NEXTAUTH] redirect callback:", { url, baseUrl });
      return `${baseUrl}/dashboard`;
    },
  },

  events: {
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
        providerAccountId: account.providerAccountId,
      });
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };


// import NextAuth, { type NextAuthOptions } from "next-auth";
// import GoogleProvider from "next-auth/providers/google";
// import FacebookProvider from "next-auth/providers/facebook";
// import CredentialsProvider from "next-auth/providers/credentials";
// import { PrismaAdapter } from "@next-auth/prisma-adapter";
// import prisma from "@/app/lib/prisma";
// import bcrypt from "bcrypt";

// // Vérifier que DATABASE_URL est configuré
// if (!process.env.DATABASE_URL) {
//   console.error("❌ [NEXTAUTH] DATABASE_URL n'est pas configuré!");
// }

// export const authOptions: NextAuthOptions = {
//   adapter: PrismaAdapter(prisma),
//   providers: [
//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//     }),
//     FacebookProvider({
//       clientId: process.env.FACEBOOK_CLIENT_ID!,
//       clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
//     }),
//     CredentialsProvider({
//       name: "Credentials",
//       credentials: {
//         email: { label: "Email", type: "email" },
//         password: { label: "Password", type: "password" },
//       },
//       async authorize(credentials) {
//         if (!credentials?.email || !credentials.password) {
//           return null;
//         }

//         const user = await prisma.user.findUnique({
//           where: { email: credentials.email },
//         });

//         if (!user || !user.password) {
//           return null;
//         }

//         const isValid = await bcrypt.compare(credentials.password, user.password);
//         if (!isValid) {
//           return null;
//         }

//         return {
//           id: user.id,
//           email: user.email,
//           name: user.name,
//           image: user.image,
//         };
//       },
//     }),
//   ],
//   pages: {
//     signIn: "/auth/signin",
//   },
//   session: {
//     // Stratégie "database" recommandée avec PrismaAdapter selon la documentation officielle
//     // Les sessions sont stockées dans Supabase (PostgreSQL)
//     strategy: "database",
//     maxAge: 30 * 24 * 60 * 60, // 30 jours
//     updateAge: 24 * 60 * 60, // Mettre à jour la session toutes les 24h
//   },
//   cookies: {
//     sessionToken: {
//       name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
//       options: {
//         httpOnly: true,
//         sameSite: "lax",
//         path: "/",
//         secure: process.env.NODE_ENV === "production",
//       },
//     },
//     callbackUrl: {
//       name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.callback-url`,
//       options: {
//         httpOnly: true,
//         sameSite: "lax",
//         path: "/",
//         secure: process.env.NODE_ENV === "production",
//       },
//     },
//     csrfToken: {
//       name: `${process.env.NODE_ENV === "production" ? "__Host-" : ""}next-auth.csrf-token`,
//       options: {
//         httpOnly: true,
//         sameSite: "lax",
//         path: "/",
//         secure: process.env.NODE_ENV === "production",
//       },
//     },
//   },
//   callbacks: {
//     async signIn({ user, account, profile }) {
//       console.log("🔐 [NEXTAUTH] signIn callback:", {
//         userId: user?.id,
//         email: user?.email,
//         provider: account?.provider,
//         hasAccessToken: !!account?.access_token,
//         hasDatabaseUrl: !!process.env.DATABASE_URL,
//       });
      
//       // Vérifier que DATABASE_URL est configuré
//       if (!process.env.DATABASE_URL) {
//         console.error("❌ [NEXTAUTH] DATABASE_URL manquant - impossible de créer la session");
//         return false;
//       }
      
//       // Vérifier que l'authentification Google a réussi
//       if (account?.provider === "google") {
//         if (!account.access_token) {
//           console.error("❌ [NEXTAUTH] Google access_token manquant");
//           return false;
//         }
//         console.log("✅ [NEXTAUTH] Google signIn autorisé");
//       }
      
//       return true;
//     },
//     // Avec strategy: "database", le callback session reçoit { session, user } au lieu de { session, token }
//     // Le callback jwt n'est pas utilisé avec la stratégie database
//     async session({ session, user }) {
//       console.log("👤 [NEXTAUTH] session callback (database):", {
//         userId: user?.id,
//         sessionUser: session.user?.email,
//         hasUser: !!user,
//         hasSession: !!session,
//       });
      
//       // Avec la stratégie database, user est directement disponible depuis la DB
//       if (session.user && user) {
//         session.user.id = user.id;
//       } else if (session.user && !user) {
//         console.warn("⚠️ [NEXTAUTH] Session sans user - possible problème de connexion DB");
//       }
      
//       return session;
//     },
//     async redirect({ url, baseUrl }) {
//       // Toujours rediriger vers /dashboard après authentification
//       if (url.includes("/auth/signin") || url.includes("/api/auth")) {
//         return `${baseUrl}/dashboard`;
//       }
//       if (url.startsWith("/")) {
//         return `${baseUrl}${url}`;
//       }
//       try {
//         const urlObj = new URL(url);
//         if (urlObj.origin === baseUrl) {
//           return url;
//         }
//       } catch (e) {
//         // URL invalide
//       }
//       return `${baseUrl}/dashboard`;
//     },
//   },
//   secret: process.env.NEXTAUTH_SECRET,
//   events: {
//     async signIn({ user, account, isNewUser }) {
//       console.log("📝 [NEXTAUTH] Event signIn:", {
//         userId: user?.id,
//         email: user?.email,
//         isNewUser,
//         provider: account?.provider,
//       });
//     },
//     async createUser({ user }) {
//       console.log("➕ [NEXTAUTH] Event createUser:", {
//         userId: user.id,
//         email: user.email,
//       });
//     },
//     async linkAccount({ user, account }) {
//       console.log("🔗 [NEXTAUTH] Event linkAccount:", {
//         userId: user.id,
//         provider: account.provider,
//       });
//     },
//     async session({ session, token }) {
//       console.log("📋 [NEXTAUTH] Event session:", {
//         userEmail: session.user?.email,
//         hasToken: !!token,
//       });
//     },
//     async signOut({ session, token }) {
//       console.log("🚪 [NEXTAUTH] Event signOut");
//     },
//   },
//   debug: process.env.NODE_ENV === "development",
// };

// const handler = NextAuth(authOptions);

// export { handler as GET, handler as POST };