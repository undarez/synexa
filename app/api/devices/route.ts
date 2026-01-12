import { NextRequest, NextResponse } from "next/server";
import { DeviceType } from "@/app/lib/supabase/types";
import { supabase } from "@/app/lib/supabase/client";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";

type DevicePayload = {
  name?: string;
  room?: string | null;
  provider?: string;
  externalId?: string;
  type?: DeviceType;
  capabilities?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export async function GET() {
  try {
    const user = await requireUser();
    const { data: devices, error } = await supabase
      .from('Device')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('[GET /devices] Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des appareils', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ devices: devices || [] });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /devices]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as DevicePayload;

    if (!body.name || !body.provider || !body.externalId) {
      return NextResponse.json(
        { error: "Les champs 'name', 'provider' et 'externalId' sont requis" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    // @ts-ignore - Supabase infère 'never' mais les données sont valides
    const { data: device, error } = await supabase
      .from('Device')
      .insert({
        userId: user.id,
        name: body.name,
        room: body.room ?? null,
        provider: body.provider,
        externalId: body.externalId,
        type: body.type ?? DeviceType.OTHER,
        capabilities: body.capabilities ?? null,
        metadata: body.metadata ?? null,
        createdAt: now,
        updatedAt: now,
      } as any)
      .select()
      .single();

    if (error || !device) {
      console.error('[POST /devices] Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'appareil', details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ device }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[POST /devices]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

