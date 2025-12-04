import prisma from "@/app/lib/prisma";

export interface EWeLinkCredentials {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  region: string;
  appId: string | null;
}

/**
 * Récupère les credentials eWeLink de l'utilisateur
 */
export async function getEWeLinkCredentials(
  userId: string
): Promise<EWeLinkCredentials | null> {
  try {
    const credentials = await prisma.eWeLinkCredentials.findUnique({
      where: { userId },
    });

    if (!credentials) {
      return null;
    }

    // Vérifier si le token est expiré
    if (credentials.expiresAt && new Date(credentials.expiresAt) < new Date()) {
      // Essayer de rafraîchir le token
      if (credentials.refreshToken) {
        return await refreshEWeLinkToken(userId, credentials);
      }
      return null;
    }

    return {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: credentials.expiresAt,
      region: credentials.region,
      appId: credentials.appId,
    };
  } catch (error) {
    console.error("[eWeLink Auth] Erreur getCredentials:", error);
    return null;
  }
}

/**
 * Rafraîchit le token eWeLink
 */
async function refreshEWeLinkToken(
  userId: string,
  credentials: any
): Promise<EWeLinkCredentials | null> {
  try {
    // TODO: Implémenter le refresh token
    // L'API eWeLink peut nécessiter une nouvelle authentification
    // Pour l'instant, on retourne null et l'utilisateur devra se reconnecter
    
    console.log(`[eWeLink Auth] Token expiré pour l'utilisateur ${userId}`);
    return null;
  } catch (error) {
    console.error("[eWeLink Auth] Erreur refreshToken:", error);
    return null;
  }
}

/**
 * Construit l'URL de l'API eWeLink selon la région
 */
export function getEWeLinkApiUrl(region: string = "eu"): string {
  const regionMap: Record<string, string> = {
    eu: "eu-api.coolkit.cc:8080",
    us: "us-api.coolkit.cc:8080",
    cn: "cn-api.coolkit.cc:8080",
  };
  return `https://${regionMap[region] || regionMap.eu}`;
}




