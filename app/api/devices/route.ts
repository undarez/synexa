import { NextRequest, NextResponse } from "next/server";
import { DeviceType } from "@prisma/client";
import prisma from "@/app/lib/prisma";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { toJsonInput } from "@/app/lib/prisma/json";

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
    const devices = await prisma.device.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ devices });
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

    const device = await prisma.device.create({
      data: {
        userId: user.id,
        name: body.name,
        room: body.room ?? null,
        provider: body.provider,
        externalId: body.externalId,
        type: body.type ?? DeviceType.OTHER,
        capabilities: toJsonInput(body.capabilities),
        metadata: toJsonInput(body.metadata),
      },
    });

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

