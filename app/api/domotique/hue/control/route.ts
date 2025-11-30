import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { controlHueLight, controlHueGroup, convertToHueCommand } from "@/app/lib/domotique/hue";
import prisma from "@/app/lib/prisma";

/**
 * POST - Contrôle une lumière ou un groupe Hue
 * Body: { deviceId, action, payload }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const { deviceId, action, payload } = body;

    if (!deviceId || !action) {
      return NextResponse.json(
        { error: "deviceId et action sont requis" },
        { status: 400 }
      );
    }

    // Récupérer le device depuis la base
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        userId: user.id,
        provider: "hue",
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Device introuvable" },
        { status: 404 }
      );
    }

    const metadata = device.metadata as any;
    const bridgeIp = metadata?.bridgeIp;
    const username = metadata?.username;
    const hueId = metadata?.hueId; // ID de la lumière dans Hue
    const isGroup = metadata?.isGroup || false;

    if (!bridgeIp || !username || !hueId) {
      return NextResponse.json(
        { error: "Configuration Hue incomplète pour ce device" },
        { status: 400 }
      );
    }

    // Convertir la commande générique en commande Hue
    const hueCommand = convertToHueCommand(action, payload);

    // Exécuter la commande
    let success: boolean;
    if (isGroup) {
      success = await controlHueGroup(bridgeIp, username, hueId, hueCommand);
    } else {
      success = await controlHueLight(bridgeIp, username, hueId, hueCommand);
    }

    // Mettre à jour lastSeenAt
    await prisma.device.update({
      where: { id: deviceId },
      data: { lastSeenAt: new Date() },
    });

    return NextResponse.json({
      success,
      message: "Commande exécutée avec succès",
    });
  } catch (error) {
    console.error("[POST /api/domotique/hue/control]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors du contrôle",
      },
      { status: 500 }
    );
  }
}

