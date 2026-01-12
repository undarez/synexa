import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import { connectDevice, type DiscoveredDevice } from "@/app/lib/devices/discovery";
import { supabase } from "@/app/lib/supabase/client";
import { DeviceType } from "@/app/lib/supabase/types";

/**
 * Connecte un device découvert et l'ajoute à la base de données
 * POST /api/devices/connect
 * Body: { device: DiscoveredDevice, credentials?: Record<string, unknown> }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    if (!body.device) {
      return NextResponse.json(
        { error: "Le champ 'device' est requis" },
        { status: 400 }
      );
    }

    const discoveredDevice = body.device as DiscoveredDevice;
    const credentials = body.credentials || {};

    // Connecter le device
    const connectionResult = await connectDevice(discoveredDevice, credentials);

    if (!connectionResult.success) {
      return NextResponse.json(
        { error: connectionResult.error || "Erreur de connexion" },
        { status: 400 }
      );
    }

    const connectedDevice = connectionResult.device!;

    const now = new Date().toISOString();
    
    // Vérifier si le device existe déjà
    type ExistingDevice = { id: string };
    const { data: existingDevice } = await supabase
      .from('Device')
      .select('*')
      .eq('provider', connectedDevice.provider)
      .eq('externalId', connectedDevice.id)
      .single();

    const typedExistingDevice = existingDevice as ExistingDevice | null;

    if (typedExistingDevice) {
      // Mettre à jour le device existant
      const { data: updated, error: updateError } = await supabase
        .from('Device')
        // @ts-ignore - Supabase infère 'never' mais les données sont valides
        .update({
          name: connectedDevice.name,
          type: connectedDevice.type,
          capabilities: {
            actions: connectedDevice.capabilities,
            ...connectedDevice.metadata,
          },
          metadata: connectedDevice.metadata,
          lastSeenAt: now,
          updatedAt: now,
        } as any)
        .eq('id', typedExistingDevice.id)
        .select()
        .single();

      if (updateError || !updated) {
        console.error('[POST /devices/connect] Erreur mise à jour:', updateError);
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour du device', details: updateError?.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        device: updated,
        message: "Device mis à jour",
      });
    }

    // Créer un nouveau device
    // @ts-ignore - Supabase infère 'never' mais les données sont valides
    const { data: device, error: createError } = await supabase
      .from('Device')
      .insert({
        userId: user.id,
        name: connectedDevice.name,
        room: null,
        provider: connectedDevice.provider,
        externalId: connectedDevice.id,
        type: connectedDevice.type,
        capabilities: {
          actions: connectedDevice.capabilities,
          connectionType: connectedDevice.connectionType,
          ...connectedDevice.metadata,
        },
        metadata: connectedDevice.metadata,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      } as any)
      .select()
      .single();

    if (createError || !device) {
      console.error('[POST /devices/connect] Erreur création:', createError);
      return NextResponse.json(
        { error: 'Erreur lors de la création du device', details: createError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      device,
      message: "Device connecté et ajouté",
    });
  } catch (error) {
    console.error("[POST /api/devices/connect]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 400 }
    );
  }
}








