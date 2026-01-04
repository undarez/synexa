import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/app/lib/prisma";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export class UnauthorizedError extends Error {
  status = 401;

  constructor(message = "Non autorisé") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class UserNotFoundError extends Error {
  status = 404;

  constructor(message = "Utilisateur introuvable") {
    super(message);
    this.name = "UserNotFoundError";
  }
}

/**
 * Récupère l'utilisateur actuel depuis la session
 * Avec la stratégie "database", PrismaAdapter gère automatiquement les utilisateurs
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return null;
    }

    const userId = session.user.id;

    // Avec strategy: "database", l'utilisateur est toujours dans la DB (géré par PrismaAdapter)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true },
    });

    if (!user) {
      console.warn("[getCurrentUser] Utilisateur non trouvé dans la DB:", userId);
      // Fallback: retourner les données de session
      return {
        id: userId,
        name: session.user.name || null,
        email: session.user.email || null,
        image: session.user.image || null,
      };
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    };
  } catch (error) {
    console.error("[getCurrentUser] Erreur:", error);
    return null;
  }
}

/**
 * Exige qu'un utilisateur soit connecté et existe dans la DB
 * Lance une exception si l'utilisateur n'est pas valide
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  
  if (!user?.id) {
    throw new UnauthorizedError("Vous devez être connecté pour accéder à cette ressource");
  }

  return user;
}

/**
 * Vérifie que l'utilisateur existe dans la base de données
 * Lance une exception si l'utilisateur n'existe pas
 */
export async function verifyUserExists(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new UserNotFoundError("L'utilisateur n'existe pas dans la base de données");
  }
}

