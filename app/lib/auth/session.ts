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
 * Crée l'utilisateur dans la base de données s'il n'existe pas encore
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return null;
    }

    const userId = session.user.id;

    // Vérifier que l'utilisateur existe dans la base de données
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true },
    });

    // Si l'utilisateur n'existe pas, le créer depuis la session
    if (!user && session.user) {
      try {
        user = await prisma.user.create({
          data: {
            id: userId,
            name: session.user.name || null,
            email: session.user.email || null,
            image: session.user.image || null,
          },
          select: { id: true, name: true, email: true, image: true },
        });
        console.log("[getCurrentUser] Utilisateur créé automatiquement:", userId);
      } catch (error: any) {
        // Si l'erreur est due à un email déjà existant, essayer de récupérer l'utilisateur
        if (error?.code === "P2002" && session.user.email) {
          user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, name: true, email: true, image: true },
          });
        } else {
          console.error("[getCurrentUser] Erreur lors de la création:", error);
          // Retourner les données de session même si la création échoue
          return {
            id: userId,
            name: session.user.name || null,
            email: session.user.email || null,
            image: session.user.image || null,
          };
        }
      }
    }

    if (!user) {
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

