import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { ReminderStatus } from "@prisma/client";
import { sendReminderNotification } from "@/app/lib/reminders/notifications";
import {
  calculateNextRecurrence,
  parseRecurrenceRule,
} from "@/app/lib/reminders/recurrence";
import { logger } from "@/app/lib/logger";

/**
 * Traite les rappels en attente et les envoie
 * Cette route doit être appelée périodiquement (cron job)
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier la clé secrète pour la sécurité (optionnel)
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const now = new Date();

    logger.info("Traitement des rappels en attente", {
      timestamp: now.toISOString(),
    });

    // Récupérer tous les rappels en attente qui doivent être envoyés
    const pendingReminders = await prisma.reminder.findMany({
      where: {
        status: ReminderStatus.PENDING,
        scheduledFor: {
          lte: now, // scheduledFor <= now
        },
      },
      include: {
        user: true,
        calendarEvent: true,
      },
    });

    const results = [];

    for (const reminder of pendingReminders) {
      try {
        const result = await sendReminderNotification(reminder.id);
        
        // Si le rappel est récurrent, créer la prochaine occurrence
        if (reminder.isRecurring && reminder.recurrenceRule && result.success) {
          try {
            const rule = parseRecurrenceRule(reminder.recurrenceRule);
            if (rule) {
              const nextDate = calculateNextRecurrence(
                reminder.scheduledFor,
                rule
              );

              // Vérifier la date de fin de récurrence
              if (nextDate && (!reminder.recurrenceEnd || nextDate <= reminder.recurrenceEnd)) {
                await prisma.reminder.create({
                  data: {
                    userId: reminder.userId,
                    calendarEventId: reminder.calendarEventId,
                    title: reminder.title,
                    message: reminder.message,
                    reminderType: reminder.reminderType,
                    scheduledFor: nextDate,
                    includeTraffic: reminder.includeTraffic,
                    includeWeather: reminder.includeWeather,
                    isRecurring: true,
                    recurrenceRule: reminder.recurrenceRule,
                    recurrenceEnd: reminder.recurrenceEnd,
                    parentReminderId: reminder.parentReminderId || reminder.id,
                    status: ReminderStatus.PENDING,
                  },
                });
              }
            }
          } catch (recurrenceError) {
            logger.error(
              "Erreur lors de la création de la récurrence",
              recurrenceError,
              {
                reminderId: reminder.id,
                userId: reminder.userId,
              }
            );
          }
        }

        results.push({
          reminderId: reminder.id,
          title: reminder.title,
          type: reminder.reminderType,
          success: result.success,
          error: result.error,
        });
      } catch (error) {
        logger.error("Erreur lors du traitement du rappel", error, {
          reminderId: reminder.id,
          userId: reminder.userId,
        });
        results.push({
          reminderId: reminder.id,
          title: reminder.title,
          type: reminder.reminderType,
          success: false,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    logger.info("Traitement des rappels terminé", {
      total: results.length,
      success: successCount,
      failures: failureCount,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processed: results.length,
      results,
    });
  } catch (error) {
    logger.error("Erreur lors du traitement des rappels", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * GET pour tester manuellement
 */
export async function GET() {
  return NextResponse.json({
    message: "Utilisez POST pour traiter les rappels",
    usage: "POST /api/reminders/process",
    security: "Ajoutez un header Authorization: Bearer <CRON_SECRET> si CRON_SECRET est défini",
  });
}



