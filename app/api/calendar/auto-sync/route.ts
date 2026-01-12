import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase/client";
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

    // TODO: Récupérer tous les utilisateurs avec un compte Google connecté (nécessitera Supabase Auth)
    // Pour l'instant, on récupère tous les utilisateurs et on vérifie le token
    const { data: allUsers, error: usersError } = await supabase
      .from('User')
      .select('id')
      .limit(1000); // Limite raisonnable

    if (usersError) {
      console.error("[auto-sync] Erreur récupération utilisateurs", usersError);
    }

    // Filtrer ceux qui ont un token Google valide
    type UserWithId = { id: string; [key: string]: unknown };
    const usersWithGoogle: UserWithId[] = [];
    for (const user of (allUsers || [])) {
      const typedUser = user as UserWithId;
      try {
        const hasToken = await getGoogleCalendarToken(typedUser.id);
        if (hasToken) {
          usersWithGoogle.push(typedUser);
        }
      } catch (error) {
        // Ignorer les erreurs de token
      }
    }

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

            const { data: existingEvent } = await supabase
              .from('CalendarEvent')
              .select('id')
              .eq('userId', user.id)
              .eq('externalId', googleEvent.id)
              .eq('source', 'GOOGLE')
              .single();

            const now = new Date().toISOString();

            type ExistingEvent = { id: string };
            const typedExistingEvent = existingEvent as ExistingEvent | null;
            if (typedExistingEvent) {
              // Mettre à jour l'événement existant
              // @ts-ignore - Supabase infère 'never' mais les données sont valides
              await supabase
                .from('CalendarEvent')
                // @ts-ignore
                .update({
                  title: eventData.title,
                  description: eventData.description || null,
                  location: eventData.location || null,
                  start: eventData.start.toISOString(),
                  end: eventData.end.toISOString(),
                  allDay: eventData.allDay,
                  reminders: eventData.reminders || null,
                  metadata: eventData.metadata || null,
                  updatedAt: now,
                } as any)
                .eq('id', typedExistingEvent.id);
              updated++;
            } else {
              // Créer un nouvel événement
              await supabase
                .from('CalendarEvent')
                .insert({
                  ...eventData,
                  start: eventData.start.toISOString(),
                  end: eventData.end.toISOString(),
                  reminders: eventData.reminders || null,
                  metadata: eventData.metadata || null,
                  createdAt: now,
                  updatedAt: now,
                } as any);
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









