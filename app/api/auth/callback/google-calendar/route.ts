import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { exchangeCodeForTokens } from "@/app/lib/calendar/google";
import prisma from "@/app/lib/prisma";

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

    // Vérifier si l'utilisateur a déjà un compte Google
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: "google",
      },
    });

    if (existingAccount) {
      // Mettre à jour le compte existant avec les nouveaux tokens
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: tokens.expiryDate ? Math.floor(tokens.expiryDate / 1000) : null,
          scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
        },
      });
    } else {
      // Créer un nouveau compte Google
      await prisma.account.create({
        data: {
          userId: user.id,
          type: "oauth",
          provider: "google",
          providerAccountId: user.email || `google_${user.id}`, // Utiliser l'email comme ID si disponible
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: tokens.expiryDate ? Math.floor(tokens.expiryDate / 1000) : null,
          scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
          token_type: "Bearer",
        },
      });
    }

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

