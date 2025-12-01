import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { discoverHueBridges } from "@/app/lib/domotique/hue";

/**
 * GET - Découvre les ponts Hue sur le réseau
 */
export async function GET(request: NextRequest) {
  try {
    await requireUser();

    const bridges = await discoverHueBridges();

    return NextResponse.json({
      success: true,
      bridges,
    });
  } catch (error) {
    console.error("[GET /api/domotique/hue/discover]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors de la découverte",
      },
      { status: 500 }
    );
  }
}


