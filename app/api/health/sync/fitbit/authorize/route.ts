import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { getFitbitAuthUrl } from "@/app/lib/health/fitbit-oauth";

/**
 * GET - Redirige vers l'autorisation Fitbit
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    // Configuration Fitbit (à mettre dans .env)
    const config = {
      clientId: process.env.FITBIT_CLIENT_ID || "",
      clientSecret: process.env.FITBIT_CLIENT_SECRET || "",
      redirectUri: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/health/sync/fitbit/callback`,
    };

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    if (!config.clientId || !config.clientSecret) {
      return NextResponse.redirect(
        `${baseUrl}/profile?error=fitbit_config_error&message=${encodeURIComponent(
          "Configuration Fitbit manquante. Veuillez configurer FITBIT_CLIENT_ID et FITBIT_CLIENT_SECRET dans .env"
        )}`
      );
    }

    // Générer l'URL d'autorisation avec un state unique
    const state = `${user.id}_${Date.now()}`;
    const authUrl = getFitbitAuthUrl(config, state);

    // Rediriger vers Fitbit
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("[GET /api/health/sync/fitbit/authorize]", error);
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${baseUrl}/profile?error=fitbit_auth_error&message=${encodeURIComponent(
        error instanceof Error ? error.message : "Erreur inconnue"
      )}`
    );
  }
}

