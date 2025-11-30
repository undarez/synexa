import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Envoie un email via Resend
 * Gratuit jusqu'à 3000 emails/mois
 */
export async function sendEmail({ to, subject, html, from }: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Si pas de clé API, on simule en développement
    if (!process.env.RESEND_API_KEY) {
      console.log(`[Email] Simulation - Envoi à ${to}`);
      console.log(`[Email] Sujet: ${subject}`);
      console.log(`[Email] HTML: ${html.substring(0, 200)}...`);
      return { success: true };
    }

    const { data, error } = await resend.emails.send({
      from: from || process.env.RESEND_FROM_EMAIL || "Synexa <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("[Email] Erreur Resend:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Envoyé avec succès à ${to} (ID: ${data?.id})`);
    return { success: true };
  } catch (error) {
    console.error("[Email] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Formate un email de rappel avec les informations de trafic et météo
 */
export function formatReminderEmail(reminder: any): string {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .section { margin: 20px 0; padding: 15px; background: white; border-radius: 8px; }
        .title { font-size: 24px; margin: 0 0 10px 0; }
        .message { font-size: 16px; margin: 10px 0; }
        .info { margin: 10px 0; }
        .label { font-weight: bold; color: #6366f1; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="title">🔔 Rappel : ${reminder.title}</h1>
        </div>
        <div class="content">
  `;

  if (reminder.message) {
    html += `<div class="section"><p class="message">${reminder.message}</p></div>`;
  }

  if (reminder.calendarEvent) {
    const event = reminder.calendarEvent;
    const eventDate = new Date(event.start).toLocaleString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    html += `
      <div class="section">
        <h2>📅 Détails de l'événement</h2>
        <p class="info"><span class="label">Date :</span> ${eventDate}</p>
        ${event.location ? `<p class="info"><span class="label">Lieu :</span> ${event.location}</p>` : ""}
        ${event.description ? `<p class="info"><span class="label">Description :</span> ${event.description}</p>` : ""}
      </div>
    `;
  }

  if (reminder.trafficInfo) {
    const traffic = reminder.trafficInfo as any;
    html += `
      <div class="section">
        <h2>🚗 Informations trafic</h2>
        <p class="info"><span class="label">Temps de trajet estimé :</span> ${traffic.duration} minutes</p>
        ${traffic.distance ? `<p class="info"><span class="label">Distance :</span> ${traffic.distance} km</p>` : ""}
        ${traffic.status === "heavy" ? `<div class="warning"><strong>⚠️ Trafic dense - prévoyez plus de temps</strong></div>` : ""}
      </div>
    `;
  }

  if (reminder.weatherInfo) {
    const weather = reminder.weatherInfo as any;
    html += `
      <div class="section">
        <h2>🌤️ Météo</h2>
        <p class="info"><span class="label">Température :</span> ${weather.temperature}°C</p>
        <p class="info"><span class="label">Conditions :</span> ${weather.description}</p>
        ${weather.suggestion ? `<div class="warning">💡 ${weather.suggestion}</div>` : ""}
      </div>
    `;
  }

  html += `
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}



