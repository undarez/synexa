import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/app/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },
};

const handler = NextAuth(authOptions);

export async function GET(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> | { nextauth: string[] } }
) {
  const params = await Promise.resolve(context.params);
  
  // Adapter la requête pour NextAuth en ajoutant query.nextauth
  const adaptedReq = Object.assign(req, {
    query: { nextauth: params.nextauth },
  });
  
  return handler(adaptedReq as any);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> | { nextauth: string[] } }
) {
  const params = await Promise.resolve(context.params);
  
  // Adapter la requête pour NextAuth en ajoutant query.nextauth
  const adaptedReq = Object.assign(req, {
    query: { nextauth: params.nextauth },
  });
  
  return handler(adaptedReq as any);
}
