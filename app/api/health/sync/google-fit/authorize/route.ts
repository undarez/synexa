import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { getGoogleFitAuthUrl } from "@/app/lib/health/google-fit-oauth";

/**
 * GET - Redirige vers l'autorisation Google Fit
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    // Utiliser les mêmes credentials que Google Calendar
    const config = {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectUri: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/health/sync/google-fit/callback`,
    };

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    if (!config.clientId || !config.clientSecret) {
      return NextResponse.redirect(
        `${baseUrl}/profile?error=google_fit_config_error&message=${encodeURIComponent(
          "Configuration Google manquante. Veuillez configurer GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans .env"
        )}`
      );
    }

    // Générer l'URL d'autorisation avec un state unique
    const state = `${user.id}_${Date.now()}`;
    const authUrl = getGoogleFitAuthUrl(config, state);

    // Rediriger vers Google
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("[GET /api/health/sync/google-fit/authorize]", error);
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${baseUrl}/profile?error=google_fit_auth_error&message=${encodeURIComponent(
        error instanceof Error ? error.message : "Erreur inconnue"
      )}`
    );
  }
}

