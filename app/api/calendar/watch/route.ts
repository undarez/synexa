import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { getGoogleCalendarToken } from "@/app/lib/google-calendar";
import { watchGoogleCalendar } from "@/app/lib/calendar/google";
import prisma from "@/app/lib/prisma";
import { addDays } from "date-fns";
import { randomUUID } from "crypto";

/**
 * Initialise un watch (webhook) pour Google Calendar
 * POST /api/calendar/watch
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const calendarId = body.calendarId || "primary";

    // Vérifier que l'utilisateur a un compte Google connecté
    const account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: "google",
      },
      select: {
        access_token: true,
        refresh_token: true,
        expires_at: true,
      },
    });

    if (!account?.access_token || !account?.refresh_token) {
      return NextResponse.json(
        { error: "Aucun compte Google connecté" },
        { status: 400 }
      );
    }

    // Vérifier si un channel existe déjà pour cet utilisateur et ce calendrier
    const existingChannel = await prisma.calendarChannel.findFirst({
      where: {
        userId: user.id,
        calendarId,
      },
    });

    // Si un channel existe et n'est pas expiré, le renouveler si nécessaire
    if (existingChannel && existingChannel.expiration > new Date()) {
      // Le channel est encore valide, on peut le réutiliser
      return NextResponse.json({
        message: "Channel déjà actif",
        channel: {
          id: existingChannel.id,
          channelId: existingChannel.channelId,
          expiration: existingChannel.expiration,
        },
      });
    }

    // Supprimer les anciens channels expirés pour cet utilisateur
    await prisma.calendarChannel.deleteMany({
      where: {
        userId: user.id,
        calendarId,
        expiration: { lt: new Date() },
      },
    });

    // Créer un nouveau channel
    const channelId = randomUUID();
    const webhookUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/calendar/webhook`;

    // Appeler l'API Google pour créer le watch
    const watchResponse = await watchGoogleCalendar(
      {
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        expiryDate: account.expires_at,
      },
      {
        calendarId,
        webhookUrl,
        channelId,
      }
    );

    // Calculer la date d'expiration (7 jours max selon Google, mais on met 6 jours pour être sûr)
    const expiration = addDays(new Date(), 6);

    // Enregistrer le channel dans la base de données
    const channel = await prisma.calendarChannel.create({
      data: {
        userId: user.id,
        channelId,
        resourceId: watchResponse.resourceId || "",
        calendarId,
        expiration,
      },
    });

    return NextResponse.json({
      message: "Watch initialisé avec succès",
      channel: {
        id: channel.id,
        channelId: channel.channelId,
        expiration: channel.expiration,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[POST /calendar/watch]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'initialisation du watch",
      },
      { status: 400 }
    );
  }
}

/**
 * GET pour récupérer les channels actifs
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    const channels = await prisma.calendarChannel.findMany({
      where: {
        userId: user.id,
        expiration: { gt: new Date() }, // Seulement les channels non expirés
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ channels });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /calendar/watch]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}



