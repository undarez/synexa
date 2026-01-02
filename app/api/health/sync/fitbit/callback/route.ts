import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { exchangeFitbitCode } from "@/app/lib/health/fitbit-oauth";
import { setHealthSyncConfig } from "@/app/lib/health/sync";

/**
 * GET - Callback OAuth Fitbit
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
        `${baseUrl}/profile?error=fitbit_auth_error&message=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/profile?error=fitbit_auth_error&message=${encodeURIComponent("Code d'autorisation manquant")}`
      );
    }

    // Configuration Fitbit (à mettre dans .env)
    const config = {
      clientId: process.env.FITBIT_CLIENT_ID || "",
      clientSecret: process.env.FITBIT_CLIENT_SECRET || "",
      redirectUri: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/health/sync/fitbit/callback`,
    };

    if (!config.clientId || !config.clientSecret) {
      return NextResponse.redirect(
        `${baseUrl}/profile?error=fitbit_config_error&message=${encodeURIComponent("Configuration Fitbit manquante")}`
      );
    }

    // Échanger le code contre un token
    const tokenData = await exchangeFitbitCode(code, config);

    // Enregistrer la configuration
    await setHealthSyncConfig(user.id, {
      provider: "fitbit",
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
    return NextResponse.redirect(
      `${baseUrl}/profile?success=fitbit_connected&message=${encodeURIComponent("Compte Fitbit connecté avec succès")}`
    );
  } catch (error) {
    console.error("[GET /api/health/sync/fitbit/callback]", error);
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${baseUrl}/profile?error=fitbit_auth_error&message=${encodeURIComponent(
        error instanceof Error ? error.message : "Erreur inconnue"
      )}`
    );
  }
}

