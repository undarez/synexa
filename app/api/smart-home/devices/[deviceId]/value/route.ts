import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { updateDeviceValue } from "@/app/lib/services/ewelink";

/**
 * POST /api/smart-home/devices/[deviceId]/value
 * Met à jour la valeur d'un appareil (intensité, température, etc.)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await requireUser();
    const { deviceId } = await params;
    const body = await request.json();
    const { value } = body;

    if (typeof value !== "number") {
      return NextResponse.json(
        { error: "La valeur doit être un nombre" },
        { status: 400 }
      );
    }

    await updateDeviceValue(user.id, deviceId, value);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Smart Home API] Erreur update value:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}




