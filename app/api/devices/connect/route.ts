import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { connectDevice, type DiscoveredDevice } from "@/app/lib/devices/discovery";
import prisma from "@/app/lib/prisma";
import { DeviceType } from "@prisma/client";
import { toJsonInput } from "@/app/lib/prisma/json";

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

    // Vérifier si le device existe déjà
    const existingDevice = await prisma.device.findUnique({
      where: {
        provider_externalId: {
          provider: connectedDevice.provider,
          externalId: connectedDevice.id,
        },
      },
    });

    if (existingDevice) {
      // Mettre à jour le device existant
      const updated = await prisma.device.update({
        where: { id: existingDevice.id },
        data: {
          name: connectedDevice.name,
          type: connectedDevice.type,
          capabilities: toJsonInput({
            actions: connectedDevice.capabilities,
            ...connectedDevice.metadata,
          }),
          metadata: toJsonInput(connectedDevice.metadata),
          lastSeenAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        device: updated,
        message: "Device mis à jour",
      });
    }

    // Créer un nouveau device
    const device = await prisma.device.create({
      data: {
        userId: user.id,
        name: connectedDevice.name,
        room: null,
        provider: connectedDevice.provider,
        externalId: connectedDevice.id,
        type: connectedDevice.type,
        capabilities: toJsonInput({
          actions: connectedDevice.capabilities,
          connectionType: connectedDevice.connectionType,
          ...connectedDevice.metadata,
        }),
        metadata: toJsonInput(connectedDevice.metadata),
        lastSeenAt: new Date(),
      },
    });

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








