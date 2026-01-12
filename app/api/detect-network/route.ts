import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";

// API pour détecter les réseaux WiFi et Bluetooth
// Note: Les APIs Web pour WiFi/Bluetooth sont limitées dans les navigateurs
// Cette API simule la détection et peut être étendue avec des APIs natives

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    
    const { wifi, bluetooth } = body;

    const updateData: {
      wifiEnabled?: boolean;
      wifiSSID?: string | null;
      bluetoothEnabled?: boolean;
      bluetoothDeviceName?: string | null;
    } = {};

    // Mettre à jour les informations WiFi
    if (wifi !== undefined) {
      updateData.wifiEnabled = wifi.enabled || false;
      updateData.wifiSSID = wifi.ssid || null;
    }

    // Mettre à jour les informations Bluetooth
    if (bluetooth !== undefined) {
      updateData.bluetoothEnabled = bluetooth.enabled || false;
      updateData.bluetoothDeviceName = bluetooth.deviceName || null;
    }

    // Sauvegarder dans le profil
    const now = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from('User')
      // @ts-ignore - Supabase infère 'never' mais les données sont valides
      .update({
        ...updateData,
        updatedAt: now,
      } as any)
      .eq('id', user.id)
      .select('id, wifiEnabled, wifiSSID, bluetoothEnabled, bluetoothDeviceName')
      .single();

    if (error || !updated) {
      console.error('[POST /detect-network] Erreur:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour', details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      profile: updated 
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[POST /detect-network]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}









