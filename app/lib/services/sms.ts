/**
 * Service SMS
 * 
 * Pour un service réel, vous pouvez utiliser :
 * - Twilio (payant mais avec crédit gratuit)
 * - Vonage (anciennement Nexmo)
 * - AWS SNS
 * 
 * Pour l'instant, on simule l'envoi avec des logs détaillés
 */

interface SMSOptions {
  to: string;
  message: string;
}

/**
 * Envoie un SMS (simulation pour l'instant)
 * 
 * Pour activer un service réel, décommentez et configurez l'un des services ci-dessous
 */
export async function sendSMS({ to, message }: SMSOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Vérifier que le numéro est valide
    const phoneNumber = to.replace(/\s/g, "");
    if (!phoneNumber.match(/^\+?[1-9]\d{1,14}$/)) {
      return { success: false, error: "Numéro de téléphone invalide" };
    }

    // SIMULATION - À remplacer par un vrai service
    console.log(`[SMS] Simulation - Envoi à ${phoneNumber}`);
    console.log(`[SMS] Message: ${message}`);
    console.log(`[SMS] Longueur: ${message.length} caractères`);

    // TODO: Implémenter avec un service réel
    // Exemple avec Twilio (nécessite TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN):
    /*
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });

      console.log(`[SMS] Envoyé avec succès (SID: ${result.sid})`);
      return { success: true };
    }
    */

    // Pour l'instant, on simule un succès
    return { success: true };
  } catch (error) {
    console.error("[SMS] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Vérifie si le service SMS est configuré
 */
export function isSMSConfigured(): boolean {
  // Pour l'instant, toujours false car on simule
  // Retourner true si TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN sont définis
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}



