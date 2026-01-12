import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
import { getGoogleCalendarToken } from "@/app/lib/google-calendar";
import { watchGoogleCalendar } from "@/app/lib/calendar/google";
import { supabase } from "@/app/lib/supabase/client";
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
    // TODO: Récupérer le token depuis Supabase Auth une fois implémenté
    const hasGoogleToken = await getGoogleCalendarToken(user.id);
    if (!hasGoogleToken) {
      return NextResponse.json(
        { error: "Aucun compte Google connecté" },
        { status: 400 }
      );
    }

    // Pour l'instant, on utilise getGoogleCalendarToken qui gère les tokens
    // TODO: Récupérer access_token, refresh_token, expires_at depuis Supabase Auth
    const account = {
      access_token: null, // Sera géré par getGoogleCalendarToken
      refresh_token: null,
      expires_at: null,
    };

    // Vérifier si un channel existe déjà pour cet utilisateur et ce calendrier
    const { data: existingChannel } = await supabase
      .from('CalendarChannel')
      .select('*')
      .eq('userId', user.id)
      .eq('calendarId', calendarId)
      .single();

    type CalendarChannelData = { id: string; channelId: string; expiration: string; [key: string]: unknown };
    const typedExistingChannel = existingChannel as CalendarChannelData | null;

    // Si un channel existe et n'est pas expiré, le renouveler si nécessaire
    if (typedExistingChannel && new Date(typedExistingChannel.expiration) > new Date()) {
      // Le channel est encore valide, on peut le réutiliser
      return NextResponse.json({
        message: "Channel déjà actif",
        channel: {
          id: typedExistingChannel.id,
          channelId: typedExistingChannel.channelId,
          expiration: typedExistingChannel.expiration,
        },
      });
    }

    // Supprimer les anciens channels expirés pour cet utilisateur
    await supabase
      .from('CalendarChannel')
      .delete()
      .eq('userId', user.id)
      .eq('calendarId', calendarId)
      .lt('expiration', new Date().toISOString());

    // Créer un nouveau channel
    const channelId = randomUUID();
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const webhookUrl = `${baseUrl}/api/calendar/webhook`;

    // Vérifier si on est en développement (HTTP) - Google nécessite HTTPS pour les webhooks
    const isDevelopment = baseUrl.startsWith("http://");
    
    if (isDevelopment) {
      // En développement, on ne peut pas initialiser les webhooks (Google nécessite HTTPS)
      // On retourne un message informatif
      return NextResponse.json(
        {
          message: "Les webhooks ne sont pas disponibles en développement local (HTTPS requis)",
          warning: "Les webhooks Google Calendar nécessitent HTTPS. En production, ils seront automatiquement activés.",
          development: true,
        },
        { status: 200 } // 200 car ce n'est pas vraiment une erreur, juste une limitation
      );
    }

    // En production (HTTPS), initialiser les webhooks
    try {
      // TODO: Récupérer les tokens depuis Supabase Auth
      // Pour l'instant, on utilise getGoogleCalendarToken qui gère les tokens
      const watchResponse = await watchGoogleCalendar(
        {
          accessToken: account.access_token || "", // Sera géré par getGoogleCalendarToken
          refreshToken: account.refresh_token || "",
          expiryDate: account.expires_at || undefined,
        },
        {
          calendarId,
          webhookUrl,
          channelId,
        }
      );

      // Calculer la date d'expiration (7 jours max selon Google, mais on met 6 jours pour être sûr)
      const expiration = addDays(new Date(), 6);

      const now = new Date().toISOString();

      // Enregistrer le channel dans la base de données
      const { data: channel, error: channelError } = await supabase
        .from('CalendarChannel')
        .insert({
          userId: user.id,
          channelId,
          resourceId: watchResponse.resourceId || "",
          calendarId,
          expiration: expiration.toISOString(),
          createdAt: now,
          updatedAt: now,
        } as any)
        .select()
        .single();

      if (channelError || !channel) {
        throw new Error(`Erreur lors de la création du channel: ${channelError?.message}`);
      }

      const typedChannel = channel as CalendarChannelData;

      return NextResponse.json({
        message: "Watch initialisé avec succès",
        channel: {
          id: typedChannel.id,
          channelId: typedChannel.channelId,
          expiration: typedChannel.expiration,
        },
      });
    } catch (watchError: any) {
      // Gérer spécifiquement l'erreur HTTPS
      if (watchError?.message?.includes("HTTPS") || watchError?.code === 400) {
        return NextResponse.json(
          {
            message: "Les webhooks nécessitent HTTPS",
            error: "Google Calendar nécessite HTTPS pour les webhooks. Assurez-vous que NEXTAUTH_URL utilise HTTPS.",
            development: baseUrl.includes("localhost"),
          },
          { status: 400 }
        );
      }
      throw watchError; // Relancer les autres erreurs
    }
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

    const { data: channels, error } = await supabase
      .from('CalendarChannel')
      .select('*')
      .eq('userId', user.id)
      .gt('expiration', new Date().toISOString()) // Seulement les channels non expirés
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('[GET /calendar/watch] Erreur Supabase:', error);
    }

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





