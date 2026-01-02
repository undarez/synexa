import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import {
  updateSecurityDeviceStatus,
  toggleSecurityDeviceArm,
  toggleSecurityDevice,
  testSecurityDeviceConnection,
} from "@/app/lib/services/security-devices";
import prisma from "@/app/lib/prisma";

/**
 * PATCH - Met à jour un appareil de sécurité
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  try {
    const user = await requireUser();
    const body = await request.json();

    // Vérifier que l'appareil appartient à l'utilisateur
    const device = await prisma.securityDevice.findUnique({
      where: { id: params.deviceId },
    });

    if (!device || device.userId !== user.id) {
      return NextResponse.json(
        { error: "Appareil non trouvé" },
        { status: 404 }
      );
    }

    let updatedDevice;

    if (body.status) {
      updatedDevice = await updateSecurityDeviceStatus(
        params.deviceId,
        body.status
      );
    } else if (body.isArmed !== undefined) {
      updatedDevice = await toggleSecurityDeviceArm(
        params.deviceId,
        body.isArmed
      );
    } else if (body.isEnabled !== undefined) {
      updatedDevice = await toggleSecurityDevice(
        params.deviceId,
        body.isEnabled
      );
    } else {
      // Mise à jour générale
      updatedDevice = await prisma.securityDevice.update({
        where: { id: params.deviceId },
        data: body,
      });
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
  { params }: { params: { deviceId: string } }
) {
  try {
    const user = await requireUser();

    const device = await prisma.securityDevice.findUnique({
      where: { id: params.deviceId },
    });

    if (!device || device.userId !== user.id) {
      return NextResponse.json(
        { error: "Appareil non trouvé" },
        { status: 404 }
      );
    }

    await prisma.securityDevice.delete({
      where: { id: params.deviceId },
    });

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
  { params }: { params: { deviceId: string } }
) {
  try {
    const user = await requireUser();

    const device = await prisma.securityDevice.findUnique({
      where: { id: params.deviceId },
    });

    if (!device || device.userId !== user.id) {
      return NextResponse.json(
        { error: "Appareil non trouvé" },
        { status: 404 }
      );
    }

    const result = await testSecurityDeviceConnection(params.deviceId);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}


