import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { toggleDevice } from "@/app/lib/services/ewelink";

/**
 * POST /api/smart-home/devices/[deviceId]/toggle
 * Active ou désactive un appareil
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await requireUser();
    const { deviceId } = await params;

    await toggleDevice(user.id, deviceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Smart Home API] Erreur toggle:", error);
    return NextResponse.json(
      { error: "Erreur lors du changement d'état" },
      { status: 500 }
    );
  }
}




