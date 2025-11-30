import { NextRequest, NextResponse } from "next/server";
import { syncAllHealthSources } from "@/app/lib/health/sync";
import prisma from "@/app/lib/prisma";

/**
 * POST - Synchronisation automatique (appelée par un cron job ou webhook)
 * Headers: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier le secret de cron (optionnel, pour sécuriser l'endpoint)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupérer tous les utilisateurs avec synchronisation activée
    const users = await prisma.user.findMany({
      where: {
        preferences: {
          some: {
            key: {
              in: ["health_sync_apple_health", "health_sync_fitbit", "health_sync_withings", "health_sync_google_fit"],
            },
            value: {
              path: ["enabled"],
              equals: true,
            },
          },
        },
      },
    });

    const results: Record<string, any> = {};

    for (const user of users) {
      try {
        const result = await syncAllHealthSources(user.id);
        results[user.id] = result;
      } catch (error) {
        results[user.id] = {
          error: error instanceof Error ? error.message : "Erreur inconnue",
        };
      }
    }

    return NextResponse.json({
      success: true,
      usersProcessed: users.length,
      results,
    });
  } catch (error) {
    console.error("[POST /api/health/sync/auto]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}

