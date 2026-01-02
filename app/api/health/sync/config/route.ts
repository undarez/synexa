import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { getHealthSyncConfig } from "@/app/lib/health/sync";

/**
 * GET - Récupère les configurations de synchronisation
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") as
      | "apple_health"
      | "fitbit"
      | "withings"
      | "google_fit"
      | null;

    if (provider) {
      const config = await getHealthSyncConfig(user.id, provider);
      return NextResponse.json({
        success: true,
        config: config || null,
      });
    }

    // Récupérer toutes les configurations
    const [appleHealth, fitbit, withings, googleFit] = await Promise.all([
      getHealthSyncConfig(user.id, "apple_health"),
      getHealthSyncConfig(user.id, "fitbit"),
      getHealthSyncConfig(user.id, "withings"),
      getHealthSyncConfig(user.id, "google_fit"),
    ]);

    return NextResponse.json({
      success: true,
      configs: {
        apple_health: appleHealth,
        fitbit,
        withings,
        google_fit: googleFit,
      },
    });
  } catch (error) {
    console.error("[GET /api/health/sync/config]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}

