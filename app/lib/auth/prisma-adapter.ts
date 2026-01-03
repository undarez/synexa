/**
 * Adaptateur Prisma pour NextAuth
 * Version simplifiée - utilise directement PrismaAdapter
 */

import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/app/lib/prisma";

// Utiliser directement l'adaptateur Prisma standard
export const customPrismaAdapter = PrismaAdapter(prisma);
