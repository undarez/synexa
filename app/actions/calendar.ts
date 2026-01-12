"use server";

/**
 * Server Actions pour Google Calendar
 * SÉCURISÉ: Les tokens sont récupérés uniquement côté serveur
 */

import { getGoogleCalendarEvents, hasGoogleCalendarAccess } from "@/app/lib/auth/google-calendar";
import { requireUser } from "@/app/lib/auth/server";

/**
 * Récupère les événements Google Calendar (Server Action)
 * ⚠️ SÉCURISÉ: Ne jamais appeler cette fonction depuis un Client Component
 * Utiliser uniquement depuis un Server Component ou un formulaire avec action
 */
export async function fetchCalendarEvents(
  calendarId: string = "primary",
  maxResults: number = 10
) {
  try {
    // Vérifier l'authentification
    await requireUser();

    // Vérifier l'accès Google Calendar
    const hasAccess = await hasGoogleCalendarAccess();
    if (!hasAccess) {
      return { 
        success: false, 
        error: "Accès Google Calendar non disponible. Veuillez vous reconnecter avec Google." 
      };
    }

    // Récupérer les événements (token récupéré côté serveur automatiquement)
    const events = await getGoogleCalendarEvents(calendarId, maxResults);
    
    return { success: true, events };
  } catch (error) {
    console.error("[fetchCalendarEvents] Erreur:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur inconnue lors de la récupération des événements" 
    };
  }
}

/**
 * Vérifie si l'utilisateur a accès à Google Calendar (Server Action)
 */
export async function checkGoogleCalendarAccess() {
  try {
    await requireUser();
    const hasAccess = await hasGoogleCalendarAccess();
    return { hasAccess };
  } catch (error) {
    return { hasAccess: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
  }
}
