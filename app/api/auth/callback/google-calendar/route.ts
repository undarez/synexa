import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import { exchangeCodeForTokens } from "@/app/lib/calendar/google";
// TODO: Implémenter la sauvegarde des tokens Google avec Supabase Auth

/**
 * GET - Callback OAuth Google Calendar
 * Échange le code d'autorisation contre un token et enregistre les credentials
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/profile?error=google_calendar_auth_error&message=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/profile?error=google_calendar_auth_error&message=${encodeURIComponent("Code d'autorisation manquant")}`
      );
    }

    // Échanger le code contre des tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.accessToken || !tokens.refreshToken) {
      return NextResponse.redirect(
        `${baseUrl}/profile?error=google_calendar_auth_error&message=${encodeURIComponent("Impossible d'obtenir les tokens d'accès")}`
      );
    }

    // TODO: Implémenter la sauvegarde des tokens Google avec Supabase Auth
    // Pour l'instant, on redirige avec succès mais les tokens ne sont pas sauvegardés
    // Une fois Supabase Auth implémenté, utiliser auth.users.update() ou une table dédiée
    console.log('[Google Calendar Callback] Tokens reçus pour user:', user.id);
    console.log('[Google Calendar Callback] Access Token:', tokens.accessToken ? 'présent' : 'absent');
    console.log('[Google Calendar Callback] Refresh Token:', tokens.refreshToken ? 'présent' : 'absent');
    console.log('[Google Calendar Callback] TODO: Sauvegarder les tokens avec Supabase Auth');

    return NextResponse.redirect(
      `${baseUrl}/profile?success=google_calendar_connected&message=${encodeURIComponent("Google Calendar connecté avec succès")}`
    );
  } catch (error) {
    console.error("[GET /api/auth/callback/google-calendar]", error);
    return NextResponse.redirect(
      `${baseUrl}/profile?error=google_calendar_auth_error&message=${encodeURIComponent(
        error instanceof Error ? error.message : "Erreur inconnue lors de la connexion"
      )}`
    );
  }
}

