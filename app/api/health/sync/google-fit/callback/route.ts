import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { exchangeGoogleFitCode } from "@/app/lib/health/google-fit-oauth";
import { setHealthSyncConfig } from "@/app/lib/health/sync";

/**
 * GET - Callback OAuth Google Fit
 * Échange le code d'autorisation contre un token et configure la synchronisation
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/profile?error=google_fit_auth_error&message=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/profile?error=google_fit_auth_error&message=${encodeURIComponent("Code d'autorisation manquant")}`
      );
    }

    // Configuration Google (utilise les mêmes credentials que Google Calendar)
    const config = {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectUri: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/health/sync/google-fit/callback`,
    };

    if (!config.clientId || !config.clientSecret) {
      return NextResponse.redirect(
        `${baseUrl}/profile?error=google_fit_config_error&message=${encodeURIComponent("Configuration Google manquante")}`
      );
    }

    // Échanger le code contre un token
    const tokenData = await exchangeGoogleFitCode(code, config);

    // Enregistrer la configuration
    await setHealthSyncConfig(user.id, {
      provider: "google_fit",
      enabled: true,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      lastSyncAt: undefined,
      metadata: {
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type,
      },
    });

    // Rediriger vers le profil avec succès
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${baseUrl}/profile?success=google_fit_connected&message=${encodeURIComponent("Compte Google Fit connecté avec succès")}`
    );
  } catch (error) {
    console.error("[GET /api/health/sync/google-fit/callback]", error);
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${baseUrl}/profile?error=google_fit_auth_error&message=${encodeURIComponent(
        error instanceof Error ? error.message : "Erreur inconnue"
      )}`
    );
  }
}

