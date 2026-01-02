import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import {
  addSecurityDevice,
  getSecurityDevices,
} from "@/app/lib/services/security-devices";

/**
 * GET - Récupère tous les appareils de sécurité
 */
export async function GET() {
  try {
    const user = await requireUser();
    const devices = await getSecurityDevices(user.id);

    return NextResponse.json({
      success: true,
      devices,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * POST - Ajoute un nouvel appareil de sécurité
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const device = await addSecurityDevice(user.id, body);

    return NextResponse.json({
      success: true,
      device,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}


