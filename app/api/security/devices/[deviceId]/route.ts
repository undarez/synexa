import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import {
  updateSecurityDeviceStatus,
  toggleSecurityDeviceArm,
  toggleSecurityDevice,
  testSecurityDeviceConnection,
} from "@/app/lib/services/security-devices";
import { supabase } from "@/app/lib/supabase/client";

/**
 * PATCH - Met à jour un appareil de sécurité
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await requireUser();
    const { deviceId } = await params;
    const body = await request.json();

    // Vérifier que l'appareil appartient à l'utilisateur
    const { data: device, error: deviceError } = await supabase
      .from('SecurityDevice')
      .select('*')
      .eq('id', deviceId)
      .single();

    if (!device || device.userId !== user.id) {
      return NextResponse.json(
        { error: "Appareil non trouvé" },
        { status: 404 }
      );
    }

    let updatedDevice;

    if (body.status) {
      updatedDevice = await updateSecurityDeviceStatus(
        deviceId,
        body.status
      );
    } else if (body.isArmed !== undefined) {
      updatedDevice = await toggleSecurityDeviceArm(
        deviceId,
        body.isArmed
      );
    } else if (body.isEnabled !== undefined) {
      updatedDevice = await toggleSecurityDevice(
        deviceId,
        body.isEnabled
      );
    } else {
      // Mise à jour générale
      const now = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase
        .from('SecurityDevice')
        .update({
          ...body,
          updatedAt: now,
        } as Record<string, any>)
        .eq('id', deviceId)
        .select()
        .single();

      if (updateError || !updated) {
        console.error('[PATCH /security/devices/:id] Erreur:', updateError);
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour', details: updateError?.message },
          { status: 500 }
        );
      }

      updatedDevice = updated;
    }

    return NextResponse.json({
      success: true,
      device: updatedDevice,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Supprime un appareil de sécurité
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await requireUser();
    const { deviceId } = await params;

    const { data: device, error: deviceError } = await supabase
      .from('SecurityDevice')
      .select('id, userId')
      .eq('id', deviceId)
      .single();

    if (deviceError || !device || device.userId !== user.id) {
      return NextResponse.json(
        { error: "Appareil non trouvé" },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from('SecurityDevice')
      .delete()
      .eq('id', deviceId);

    if (deleteError) {
      console.error('[DELETE /security/devices/:id] Erreur:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * POST - Teste la connexion à un appareil
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await requireUser();
    const { deviceId } = await params;

    const { data: device, error: deviceError } = await supabase
      .from('SecurityDevice')
      .select('*')
      .eq('id', deviceId)
      .single();

    if (!device || device.userId !== user.id) {
      return NextResponse.json(
        { error: "Appareil non trouvé" },
        { status: 404 }
      );
    }

    const result = await testSecurityDeviceConnection(deviceId);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}


