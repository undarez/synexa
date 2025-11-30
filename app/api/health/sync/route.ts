import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import {
  syncAllHealthSources,
  syncAppleHealth,
  syncFitbit,
  syncWithings,
  syncGoogleFit,
  getHealthSyncConfig,
  setHealthSyncConfig,
} from "@/app/lib/health/sync";

/**
 * GET - Synchronise toutes les sources configurées
 * Query: provider (optionnel, pour synchroniser une source spécifique)
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
      // Synchroniser une source spécifique
      const config = await getHealthSyncConfig(user.id, provider);
      if (!config || !config.enabled) {
        return NextResponse.json(
          { error: `Source ${provider} non configurée ou désactivée` },
          { status: 400 }
        );
      }

      let result;
      switch (provider) {
        case "apple_health":
          result = await syncAppleHealth(user.id, config);
          break;
        case "fitbit":
          result = await syncFitbit(user.id, config);
          break;
        case "withings":
          result = await syncWithings(user.id, config);
          break;
        case "google_fit":
          result = await syncGoogleFit(user.id, config);
          break;
        default:
          return NextResponse.json({ error: "Provider invalide" }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        provider,
        ...result,
      });
    }

    // Synchroniser toutes les sources
    const result = await syncAllHealthSources(user.id);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[GET /api/health/sync]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Configure une source de synchronisation
 * Body: { provider, enabled, accessToken?, refreshToken?, userId?, metadata? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const { provider, enabled, accessToken, refreshToken, userId, metadata } = body;

    if (!provider || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "provider et enabled sont requis" },
        { status: 400 }
      );
    }

    const validProviders = ["apple_health", "fitbit", "withings", "google_fit"];
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ error: "Provider invalide" }, { status: 400 });
    }

    const config = {
      provider: provider as "apple_health" | "fitbit" | "withings" | "google_fit",
      enabled,
      accessToken,
      refreshToken,
      userId,
      metadata,
      lastSyncAt: undefined,
    };

    await setHealthSyncConfig(user.id, config);

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error("[POST /api/health/sync]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}

