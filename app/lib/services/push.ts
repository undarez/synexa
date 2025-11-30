import webpush from "web-push";
import prisma from "@/app/lib/prisma";

// Configuration VAPID (à générer une fois)
// Pour générer les clés : npx web-push generate-vapid-keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:contact@synexa.app";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

interface PushNotificationOptions {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  url?: string;
}

/**
 * Envoie une notification push à tous les appareils de l'utilisateur
 */
export async function sendPushNotification({
  userId,
  title,
  body,
  icon = "/icon-192x192.png",
  badge = "/badge-72x72.png",
  data,
  url,
}: PushNotificationOptions): Promise<{ success: boolean; error?: string; sent: number }> {
  try {
    // Récupérer toutes les subscriptions push de l'utilisateur
    // Note: Il faudra ajouter une table PushSubscription dans Prisma
    // Pour l'instant, on utilise une table temporaire ou on simule
    
    // Si pas de clés VAPID, on simule en développement
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log(`[Push] Simulation - Envoi à ${userId}`);
      console.log(`[Push] Titre: ${title}`);
      console.log(`[Push] Message: ${body}`);
      return { success: true, sent: 0 };
    }

    // Récupérer les subscriptions depuis la base de données
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      console.log(`[Push] Aucune subscription pour l'utilisateur ${userId}`);
      return { success: true, sent: 0 };
    }

    let sent = 0;
    const errors: string[] = [];

    for (const subscription of subscriptions) {
      try {
        const payload = JSON.stringify({
          title,
          body,
          icon,
          badge,
          data: data || { url },
        });

        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        );
        sent++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
        errors.push(errorMessage);
        console.error(`[Push] Erreur pour subscription ${subscription.id}:`, errorMessage);
        
        // Si la subscription est invalide, la supprimer
        if (errorMessage.includes("410") || errorMessage.includes("expired") || errorMessage.includes("Gone")) {
          await prisma.pushSubscription.delete({
            where: { id: subscription.id },
          });
        }
      }
    }

    if (sent === 0 && errors.length > 0) {
      return { success: false, error: errors.join(", "), sent: 0 };
    }

    return { success: true, sent };
  } catch (error) {
    console.error("[Push] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      sent: 0,
    };
  }
}

/**
 * Retourne la clé publique VAPID pour le client
 */
export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

