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
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("🔐 [NEXTAUTH] signIn callback:", {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider,
      });
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
