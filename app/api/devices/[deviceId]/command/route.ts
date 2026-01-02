import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { dispatchDeviceCommand } from "@/app/lib/routines/transport";
import prisma from "@/app/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await requireUser();
    const { deviceId } = await params;
    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId: user.id },
    });
    if (!device) {
      return NextResponse.json({ error: "Appareil introuvable" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      payload?: Record<string, unknown>;
    };

    const response = await dispatchDeviceCommand(device.id, {
      action: body.action,
      payload: body.payload,
    });

    return NextResponse.json({ command: response }, { status: 202 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[POST /devices/:id/command]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

