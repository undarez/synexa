import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";

/**
 * POST - Met à jour les préférences réseau de l'utilisateur
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const updateData: any = {};
    if (body.wifiEnabled !== undefined) updateData.wifiEnabled = body.wifiEnabled;
    if (body.mobileDataEnabled !== undefined) updateData.mobileDataEnabled = body.mobileDataEnabled;
    if (body.wifiSSID !== undefined) updateData.wifiSSID = body.wifiSSID;

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
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
 * GET - Récupère les préférences réseau de l'utilisateur
 */
export async function GET() {
  try {
    const user = await requireUser();

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        wifiEnabled: true,
        wifiSSID: true,
        mobileDataEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      preferences: userData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}


