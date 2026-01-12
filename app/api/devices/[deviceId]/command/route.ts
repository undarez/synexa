import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
import { dispatchDeviceCommand } from "@/app/lib/routines/transport";
import { supabase } from "@/app/lib/supabase/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await requireUser();
    const { deviceId } = await params;
    type DeviceData = { id: string; [key: string]: unknown };
    const { data: device, error: deviceError } = await supabase
      .from('Device')
      .select('*')
      .eq('id', deviceId)
      .eq('userId', user.id)
      .single();

    if (deviceError || !device) {
      return NextResponse.json({ error: "Appareil introuvable" }, { status: 404 });
    }

    const typedDevice = device as DeviceData;

    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      payload?: Record<string, unknown>;
    };

    const response = await dispatchDeviceCommand(typedDevice.id, {
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

