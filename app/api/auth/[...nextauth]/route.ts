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
    async redirect({ baseUrl }) {
      return `${baseUrl}/dashboard`;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

/**
 * Créer un wrapper de requête compatible avec NextAuth
 * NextAuth s'attend à req.query.nextauth qui n'existe pas en App Router
 */
function createNextAuthRequest(
  req: Request,
  params: { nextauth: string[] }
): any {
  return {
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body,
    query: {
      nextauth: params.nextauth,
    },
    cookies: {},
  };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> | { nextauth: string[] } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const adaptedReq = createNextAuthRequest(req, params);
    return await handler(adaptedReq);
  } catch (error) {
    console.error("❌ [NEXTAUTH] Erreur GET:", error);
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
  try {
    const params = await Promise.resolve(context.params);
    const adaptedReq = createNextAuthRequest(req, params);
    return await handler(adaptedReq);
  } catch (error) {
    console.error("❌ [NEXTAUTH] Erreur POST:", error);
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
