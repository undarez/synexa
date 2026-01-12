/**
 * Endpoint cron quotidien combiné
 * Exécute toutes les tâches automatiques en une seule fois
 * Compatible avec le plan Hobby Vercel (1 cron job par jour max)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase/client";
import { decryptSiceaData } from "@/app/lib/encryption/sicea-encryption";
import { scrapeSiceaConsumption } from "@/app/lib/services/sicea-scraper";
import { syncAllHealthSources } from "@/app/lib/health/sync";
import { sendReminderNotification } from "@/app/lib/reminders/notifications";
import { ReminderStatus } from "@/app/lib/supabase/types";
import { logger } from "@/app/lib/logger";
import { subDays } from "date-fns";
import {
  fetchGoogleCalendarEvents,
  convertGoogleEventToInternal,
  getGoogleCalendarToken,
} from "@/app/lib/google-calendar";
import { addDays } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const startTime = Date.now();
    const results: Record<string, any> = {};

    logger.info("Démarrage cron quotidien combiné", {
      timestamp: new Date().toISOString(),
    });

    // 1. Scraping SICEA (une fois par jour)
    try {
      const { data: activeCredentials, error: credentialsError } = await supabase
        .from('SiceaCredentials')
        .select('*')
        .eq('isActive', true)
        .eq('consentGiven', true);

      if (credentialsError) {
        logger.error("Erreur récupération credentials SICEA", credentialsError);
      }

      type SiceaCredentialsData = { username: string; password: string; contractNumber: string | null; userId: string; id: string; [key: string]: unknown };
      let siceaProcessed = 0;
      for (const credentials of (activeCredentials || [])) {
        const typedCredentials = credentials as SiceaCredentialsData;
        try {
          const decrypted = decryptSiceaData({
            username: typedCredentials.username,
            password: typedCredentials.password,
            contractNumber: typedCredentials.contractNumber,
          });

          if (decrypted.username && decrypted.password) {
            const endDate = new Date();
            const startDate = subDays(endDate, 7);

            const scrapeResult = await scrapeSiceaConsumption(
              decrypted.username,
              decrypted.password,
              decrypted.contractNumber || undefined,
              startDate,
              endDate
            );

            if (scrapeResult.success && scrapeResult.data) {
              const now = new Date().toISOString();
              
              // Sauvegarder les données
              const consumptionsToUpsert = scrapeResult.data.map((consumption) => ({
                userId: typedCredentials.userId,
                date: new Date(consumption.date).toISOString(),
                value: consumption.consumption,
                cost: consumption.cost,
                peakHours: consumption.peakHours,
                offPeakHours: consumption.offPeakHours,
                source: "sicea",
                metadata: {
                  maxPower: consumption.maxPower,
                  halfHourlyData: consumption.halfHourlyData,
                },
                updatedAt: now,
              }));

              // @ts-ignore - Supabase infère 'never' mais les données sont valides
              await supabase
                .from('EnergyConsumption')
                .upsert(consumptionsToUpsert as any, {
                  onConflict: 'userId,date',
                });

              await supabase
                .from('SiceaCredentials')
                // @ts-ignore - Supabase infère 'never' mais les données sont valides
                .update({
                  lastScrapedAt: now,
                  lastError: null,
                  updatedAt: now,
                } as any)
                .eq('id', typedCredentials.id);

              siceaProcessed++;
            }
          }
        } catch (error) {
          logger.error("Erreur scraping SICEA pour un utilisateur", error);
        }
      }

      results.sicea = {
        success: true,
        usersProcessed: siceaProcessed,
        totalCredentials: activeCredentials?.length || 0,
      };
    } catch (error) {
      results.sicea = {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }

    // 2. Sync santé (une fois par jour)
    try {
      // Récupérer les utilisateurs avec préférences de sync santé
      const { data: healthPreferences, error: prefsError } = await supabase
        .from('Preference')
        .select('userId')
        .in('key', [
          "health_sync_apple_health",
          "health_sync_fitbit",
          "health_sync_withings",
          "health_sync_google_fit",
        ])
        .eq('value->>enabled', 'true');

      if (prefsError) {
        logger.error("Erreur récupération préférences santé", prefsError);
      }

      // Extraire les userId uniques
      const userIds = [...new Set((healthPreferences || []).map((p: any) => p.userId))];
      
      // Récupérer les utilisateurs
      const { data: users, error: usersError } = await supabase
        .from('User')
        .select('id')
        .in('id', userIds);

      if (usersError) {
        logger.error("Erreur récupération utilisateurs", usersError);
      }

      type UserWithId = { id: string; [key: string]: unknown };
      let healthProcessed = 0;
      for (const user of (users || [])) {
        const typedUser = user as UserWithId;
        try {
          await syncAllHealthSources(typedUser.id);
          healthProcessed++;
        } catch (error) {
          logger.error("Erreur sync santé pour un utilisateur", error);
        }
      }

      results.health = {
        success: true,
        usersProcessed: healthProcessed,
        totalUsers: users?.length || 0,
      };
    } catch (error) {
      results.health = {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }

    // 3. Traitement des rappels (une fois par jour)
    try {
      const now = new Date();
      const { data: pendingReminders, error: remindersError } = await supabase
        .from('Reminder')
        .select(`
          *,
          user:User(*),
          calendarEvent:CalendarEvent(*)
        `)
        .eq('status', ReminderStatus.PENDING)
        .lte('scheduledFor', now.toISOString());

      if (remindersError) {
        logger.error("Erreur récupération rappels", remindersError);
      }

      type ReminderData = { id: string; [key: string]: unknown };
      let remindersSent = 0;
      for (const reminder of (pendingReminders || [])) {
        const typedReminder = reminder as ReminderData;
        try {
          await sendReminderNotification(typedReminder.id);
          await supabase
            .from('Reminder')
            // @ts-ignore - Supabase infère 'never' mais les données sont valides
            .update({
              status: ReminderStatus.SENT,
              sentAt: now.toISOString(),
              updatedAt: now.toISOString(),
            } as any)
            .eq('id', typedReminder.id);
          remindersSent++;
        } catch (error) {
          logger.error("Erreur envoi rappel", error);
        }
      }

      results.reminders = {
        success: true,
        processed: remindersSent,
        total: pendingReminders?.length || 0,
      };
    } catch (error) {
      results.reminders = {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }

    // 4. Sync calendrier Google (une fois par jour)
    try {
      // TODO: Récupérer les utilisateurs avec compte Google (nécessitera Supabase Auth)
      // Pour l'instant, on récupère tous les utilisateurs et on vérifie le token
      const { data: allUsers, error: usersError } = await supabase
        .from('User')
        .select('id')
        .limit(1000); // Limite raisonnable

      if (usersError) {
        logger.error("Erreur récupération utilisateurs", usersError);
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

      let calendarProcessed = 0;
      for (const user of usersWithGoogle) {
        try {
          const token = await getGoogleCalendarToken(user.id);
          if (token) {
            const startDate = new Date();
            const endDate = addDays(startDate, 30);

            const events = await fetchGoogleCalendarEvents(user.id, {
              timeMin: startDate.toISOString(),
              timeMax: endDate.toISOString(),
              maxResults: 250,
            });

            // Sauvegarder les événements
            const now = new Date().toISOString();
            for (const event of events) {
              const internalEvent = convertGoogleEventToInternal(event, user.id);
              if (internalEvent.externalId) {
                // Chercher si l'événement existe déjà
                type ExistingEvent = { id: string };
                const { data: existing } = await supabase
                  .from('CalendarEvent')
                  .select('id')
                  .eq('userId', user.id)
                  .eq('externalId', internalEvent.externalId)
                  .single();

                const typedExisting = existing as ExistingEvent | null;
                if (typedExisting) {
                  // Mettre à jour
                  await supabase
                    .from('CalendarEvent')
                    // @ts-ignore - Supabase infère 'never' mais les données sont valides
                    .update({
                      title: internalEvent.title,
                      description: internalEvent.description || null,
                      location: internalEvent.location || null,
                      start: internalEvent.start.toISOString(),
                      end: internalEvent.end.toISOString(),
                      allDay: internalEvent.allDay,
                      metadata: internalEvent.metadata || null,
                      updatedAt: now,
                    } as any)
                    .eq('id', typedExisting.id);
                } else {
                  // Créer
                  // @ts-ignore - Supabase infère 'never' mais les données sont valides
                  await supabase
                    .from('CalendarEvent')
                    .insert({
                      ...internalEvent,
                      externalId: internalEvent.externalId,
                      start: internalEvent.start.toISOString(),
                      end: internalEvent.end.toISOString(),
                      reminders: internalEvent.reminders || null,
                      metadata: internalEvent.metadata || null,
                      createdAt: now,
                      updatedAt: now,
                    } as any);
                }
              }
            }

            calendarProcessed++;
          }
        } catch (error) {
          logger.error("Erreur sync calendrier pour un utilisateur", error);
        }
      }

      results.calendar = {
        success: true,
        usersProcessed: calendarProcessed,
        totalUsers: usersWithGoogle.length,
      };
    } catch (error) {
      results.calendar = {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }

    const duration = Date.now() - startTime;

    logger.info("Cron quotidien terminé", {
      duration: `${duration}ms`,
      results,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      results,
    });
  } catch (error) {
    logger.error("Erreur cron quotidien combiné", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}

