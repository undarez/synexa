import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import {
  fetchGoogleCalendarEvents,
  convertGoogleEventToInternal,
  getGoogleCalendarToken,
} from "@/app/lib/google-calendar";
import { addDays } from "date-fns";

/**
 * Route API pour la synchronisation automatique des événements Google Calendar
 * Peut être appelée par un cron job ou un service externe
 * 
 * Utilisation avec Vercel Cron:
 * Dans vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/calendar/auto-sync",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier la clé secrète pour la sécurité (optionnel)
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;
    
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupérer tous les utilisateurs avec un compte Google connecté
    const usersWithGoogle = await prisma.user.findMany({
      where: {
        accounts: {
          some: {
            provider: "google",
            access_token: { not: null },
          },
        },
      },
      select: {
        id: true,
      },
    });

    const results = [];

    for (const user of usersWithGoogle) {
      try {
        const hasGoogleToken = await getGoogleCalendarToken(user.id);
        if (!hasGoogleToken) {
          continue;
        }

        // Synchroniser les 30 prochains jours
        const timeMin = new Date().toISOString();
        const timeMax = addDays(new Date(), 30).toISOString();

        const googleEvents = await fetchGoogleCalendarEvents(user.id, {
          timeMin,
          timeMax,
          maxResults: 250,
        });

        let synced = 0;
        let updated = 0;
        let errors = 0;

        for (const googleEvent of googleEvents) {
          try {
            if (!googleEvent.id) continue;

            const eventData = convertGoogleEventToInternal(googleEvent, user.id);

            const existingEvent = await prisma.calendarEvent.findFirst({
              where: {
                userId: user.id,
                externalId: googleEvent.id,
                source: "GOOGLE",
              },
            });

            if (existingEvent) {
              // Mettre à jour l'événement existant
              await prisma.calendarEvent.update({
                where: { id: existingEvent.id },
                data: {
                  title: eventData.title,
                  description: eventData.description,
                  location: eventData.location,
                  start: eventData.start,
                  end: eventData.end,
                  allDay: eventData.allDay,
                  reminders: eventData.reminders as any,
                  metadata: eventData.metadata as any,
                },
              });
              updated++;
            } else {
              // Créer un nouvel événement
              await prisma.calendarEvent.create({
                data: eventData,
              });
              synced++;
            }
          } catch (error) {
            console.error(`[auto-sync] Erreur pour événement ${googleEvent.id}:`, error);
            errors++;
          }
        }

        results.push({
          userId: user.id,
          synced,
          updated,
          errors,
          total: googleEvents.length,
        });
      } catch (error) {
        console.error(`[auto-sync] Erreur pour utilisateur ${user.id}:`, error);
        results.push({
          userId: user.id,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      usersProcessed: results.length,
      results,
    });
  } catch (error) {
    console.error("[POST /calendar/auto-sync]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * GET pour tester la synchronisation manuellement
 */
export async function GET() {
  return NextResponse.json({
    message: "Utilisez POST pour déclencher la synchronisation automatique",
    usage: "POST /api/calendar/auto-sync",
    security: "Ajoutez un header Authorization: Bearer <CRON_SECRET> si CRON_SECRET est défini",
  });
}









