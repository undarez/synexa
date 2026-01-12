import { NextRequest, NextResponse } from "next/server";
import { DeviceType } from "@/app/lib/supabase/types";
import { supabase } from "@/app/lib/supabase/client";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";

type DevicePayload = {
  name?: string;
  room?: string | null;
  type?: DeviceType;
  capabilities?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await requireUser();
    const { deviceId } = await params;
    const body = (await request.json()) as DevicePayload;

    type DeviceData = { id: string; [key: string]: unknown };
    const { data: device, error: fetchError } = await supabase
      .from('Device')
      .select('*')
      .eq('id', deviceId)
      .eq('userId', user.id)
      .single();

    if (fetchError || !device) {
      return NextResponse.json({ error: "Appareil introuvable" }, { status: 404 });
    }

    const typedDevice = device as DeviceData;

    const updateData: {
      name?: string;
      room?: string | null;
      type?: DeviceType;
      capabilities?: any;
      metadata?: any;
      updatedAt: string;
    } = {
      updatedAt: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.room !== undefined) updateData.room = body.room;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.capabilities !== undefined) {
      updateData.capabilities = body.capabilities;
    }
    if (body.metadata !== undefined) {
      updateData.metadata = body.metadata;
    }

    const { data: updated, error: updateError } = await supabase
      .from('Device')
      // @ts-ignore - Supabase infère 'never' mais les données sont valides
      .update(updateData as any)
      .eq('id', typedDevice.id)
      .eq('userId', user.id)
      .select()
      .single();

    if (updateError || !updated) {
      console.error('[PATCH /devices/:id] Erreur Supabase:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de l\'appareil', details: updateError?.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ device: updated });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[PATCH /devices/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await requireUser();
    const { deviceId } = await params;
    type DeviceData = { id: string };
    const { data: device, error: fetchError } = await supabase
      .from('Device')
      .select('id')
      .eq('id', deviceId)
      .eq('userId', user.id)
      .single();

    if (fetchError || !device) {
      return NextResponse.json({ error: "Appareil introuvable" }, { status: 404 });
    }

    const typedDevice = device as DeviceData;

    const { error: deleteError } = await supabase
      .from('Device')
      .delete()
      .eq('id', typedDevice.id)
      .eq('userId', user.id);

    if (deleteError) {
      console.error('[DELETE /devices/:id] Erreur Supabase:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de l\'appareil', details: deleteError.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[DELETE /devices/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

