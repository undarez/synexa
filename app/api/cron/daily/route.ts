/**
 * Endpoint cron quotidien combiné
 * Exécute toutes les tâches automatiques en une seule fois
 * Compatible avec le plan Hobby Vercel (1 cron job par jour max)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { decryptSiceaData } from "@/app/lib/encryption/sicea-encryption";
import { scrapeSiceaConsumption } from "@/app/lib/services/sicea-scraper";
import { syncAllHealthSources } from "@/app/lib/health/sync";
import { sendReminderNotification } from "@/app/lib/reminders/notifications";
import { ReminderStatus } from "@prisma/client";
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
      const activeCredentials = await prisma.siceaCredentials.findMany({
        where: { isActive: true, consentGiven: true },
        include: { user: { select: { id: true } } },
      });

      let siceaProcessed = 0;
      for (const credentials of activeCredentials) {
        try {
          const decrypted = decryptSiceaData({
            username: credentials.username,
            password: credentials.password,
            contractNumber: credentials.contractNumber,
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
              // Sauvegarder les données
              for (const consumption of scrapeResult.data) {
                await prisma.energyConsumption.upsert({
                  where: {
                    userId_date: {
                      userId: credentials.userId,
                      date: new Date(consumption.date),
                    },
                  },
                  update: {
                    value: consumption.consumption,
                    cost: consumption.cost,
                    peakHours: consumption.peakHours,
                    offPeakHours: consumption.offPeakHours,
                    source: "sicea",
                    metadata: {
                      maxPower: consumption.maxPower,
                      halfHourlyData: consumption.halfHourlyData,
                    },
                  },
                  create: {
                    userId: credentials.userId,
                    date: new Date(consumption.date),
                    value: consumption.consumption,
                    cost: consumption.cost,
                    peakHours: consumption.peakHours,
                    offPeakHours: consumption.offPeakHours,
                    source: "sicea",
                    metadata: {
                      maxPower: consumption.maxPower,
                      halfHourlyData: consumption.halfHourlyData,
                    },
                  },
                });
              }

              await prisma.siceaCredentials.update({
                where: { id: credentials.id },
                data: {
                  lastScrapedAt: new Date(),
                  lastError: null,
                },
              });

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
        totalCredentials: activeCredentials.length,
      };
    } catch (error) {
      results.sicea = {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }

    // 2. Sync santé (une fois par jour)
    try {
      const users = await prisma.user.findMany({
        where: {
          preferences: {
            some: {
              key: {
                in: [
                  "health_sync_apple_health",
                  "health_sync_fitbit",
                  "health_sync_withings",
                  "health_sync_google_fit",
                ],
              },
              value: {
                path: ["enabled"],
                equals: true,
              } as any,
            },
          },
        },
      });

      let healthProcessed = 0;
      for (const user of users) {
        try {
          await syncAllHealthSources(user.id);
          healthProcessed++;
        } catch (error) {
          logger.error("Erreur sync santé pour un utilisateur", error);
        }
      }

      results.health = {
        success: true,
        usersProcessed: healthProcessed,
        totalUsers: users.length,
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
      const pendingReminders = await prisma.reminder.findMany({
        where: {
          status: ReminderStatus.PENDING,
          scheduledFor: { lte: now },
        },
        include: {
          user: true,
          calendarEvent: true,
        },
      });

      let remindersSent = 0;
      for (const reminder of pendingReminders) {
        try {
          await sendReminderNotification(reminder);
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: {
              status: ReminderStatus.SENT,
              sentAt: new Date(),
            },
          });
          remindersSent++;
        } catch (error) {
          logger.error("Erreur envoi rappel", error);
        }
      }

      results.reminders = {
        success: true,
        processed: remindersSent,
        total: pendingReminders.length,
      };
    } catch (error) {
      results.reminders = {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }

    // 4. Sync calendrier Google (une fois par jour)
    try {
      const usersWithGoogle = await prisma.user.findMany({
        where: {
          accounts: {
            some: {
              provider: "google",
              access_token: { not: null },
            },
          },
        },
        select: { id: true },
      });

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
            for (const event of events) {
              const internalEvent = convertGoogleEventToInternal(event, user.id);
              if (internalEvent.externalId) {
                // Chercher si l'événement existe déjà
                const existing = await prisma.calendarEvent.findFirst({
                  where: {
                    userId: user.id,
                    externalId: internalEvent.externalId,
                  },
                });

                if (existing) {
                  // Mettre à jour
                  await prisma.calendarEvent.update({
                    where: { id: existing.id },
                    data: {
                      title: internalEvent.title,
                      description: internalEvent.description,
                      location: internalEvent.location,
                      start: internalEvent.start,
                      end: internalEvent.end,
                      allDay: internalEvent.allDay,
                      metadata: internalEvent.metadata,
                    },
                  });
                } else {
                  // Créer
                  await prisma.calendarEvent.create({
                    data: {
                      ...internalEvent,
                      externalId: internalEvent.externalId,
                    },
                  });
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

