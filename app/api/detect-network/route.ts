import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";

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
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        wifiEnabled: true,
        wifiSSID: true,
        bluetoothEnabled: true,
        bluetoothDeviceName: true,
      },
    });

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









