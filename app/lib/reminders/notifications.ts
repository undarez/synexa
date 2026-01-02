import prisma from "@/app/lib/prisma";
import { ReminderType, ReminderStatus } from "@prisma/client";
import { sendEmail, formatReminderEmail } from "@/app/lib/services/email";
import { sendPushNotification as sendPush } from "@/app/lib/services/push";
import { sendSMS } from "@/app/lib/services/sms";

interface NotificationResult {
  success: boolean;
  error?: string;
  sentAt?: Date;
}

/**
 * Envoie une notification selon le type de rappel
 */
export async function sendReminderNotification(
  reminderId: string
): Promise<NotificationResult> {
  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    include: {
      user: true,
      calendarEvent: true,
    },
  });

  if (!reminder) {
    return { success: false, error: "Rappel introuvable" };
  }

  if (reminder.status !== ReminderStatus.PENDING) {
    return { success: false, error: "Rappel déjà traité" };
  }

  try {
    let result: NotificationResult;

    switch (reminder.reminderType) {
      case ReminderType.PUSH:
        result = await sendPushNotification(reminder);
        break;
      case ReminderType.EMAIL:
        result = await sendEmailNotification(reminder);
        break;
      case ReminderType.SMS:
        result = await sendSMSNotification(reminder);
        break;
      default:
        return { success: false, error: "Type de notification non supporté" };
    }

    // Mettre à jour le statut du rappel
    await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: result.success ? ReminderStatus.SENT : ReminderStatus.FAILED,
        sentAt: result.success ? new Date() : null,
      },
    });

    return result;
  } catch (error) {
    await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: ReminderStatus.FAILED,
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Envoie une notification push (Web Push API)
 */
async function sendPushNotification(reminder: any): Promise<NotificationResult> {
  try {
    // Construire le message
    let body = reminder.message || `Rappel: ${reminder.title}`;
    
    if (reminder.calendarEvent) {
      const event = reminder.calendarEvent;
      const eventDate = new Date(event.start).toLocaleString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      body += `\n\n📅 ${eventDate}`;
      if (event.location) {
        body += `\n📍 ${event.location}`;
      }
    }

    // Ajouter les infos trafic/météo si disponibles
    if (reminder.trafficInfo) {
      const traffic = reminder.trafficInfo as any;
      body += `\n\n🚗 Trajet: ${traffic.duration} min`;
      if (traffic.status === "heavy") {
        body += " ⚠️ Trafic dense";
      }
    }

    if (reminder.weatherInfo) {
      const weather = reminder.weatherInfo as any;
      body += `\n\n🌤️ ${weather.temperature}°C - ${weather.description}`;
    }

    const result = await sendPush({
      userId: reminder.userId,
      title: reminder.title,
      body,
      data: {
        reminderId: reminder.id,
        calendarEventId: reminder.calendarEventId,
        url: reminder.calendarEventId ? `/calendar?eventId=${reminder.calendarEventId}` : "/reminders",
      },
      url: reminder.calendarEventId ? `/calendar?eventId=${reminder.calendarEventId}` : "/reminders",
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Erreur lors de l'envoi de la notification push",
      };
    }

    return {
      success: true,
      sentAt: new Date(),
    };
  } catch (error) {
    console.error("[Push] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Envoie une notification par email
 */
async function sendEmailNotification(reminder: any): Promise<NotificationResult> {
  if (!reminder.user.email) {
    return { success: false, error: "Aucune adresse email pour l'utilisateur" };
  }

  try {
    const html = formatReminderEmail(reminder);
    const subject = `🔔 Rappel: ${reminder.title}`;

    const result = await sendEmail({
      to: reminder.user.email,
      subject,
      html,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Erreur lors de l'envoi de l'email",
      };
    }

    return {
      success: true,
      sentAt: new Date(),
    };
  } catch (error) {
    console.error("[Email] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Envoie une notification par SMS
 */
async function sendSMSNotification(reminder: any): Promise<NotificationResult> {
  // Récupérer le numéro de téléphone depuis les métadonnées ou le profil utilisateur
  const phoneNumber = (reminder.metadata as any)?.phoneNumber;
  
  if (!phoneNumber) {
    return { success: false, error: "Aucun numéro de téléphone configuré" };
  }

  try {
    // Construire le message SMS (limité à 160 caractères)
    let message = `${reminder.title}`;
    if (reminder.message) {
      message += `\n${reminder.message}`;
    }
    
    if (reminder.calendarEvent) {
      const event = reminder.calendarEvent;
      const eventDate = new Date(event.start).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      message += `\n📅 ${eventDate}`;
      if (event.location) {
        message += `\n📍 ${event.location}`;
      }
    }

    // Tronquer si trop long
    if (message.length > 160) {
      message = message.substring(0, 157) + "...";
    }

    const result = await sendSMS({
      to: phoneNumber,
      message,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Erreur lors de l'envoi du SMS",
      };
    }

    return {
      success: true,
      sentAt: new Date(),
    };
  } catch (error) {
    console.error("[SMS] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

// La fonction formatReminderEmail est maintenant dans app/lib/services/email.ts


