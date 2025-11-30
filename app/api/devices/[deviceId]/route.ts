import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { DeviceType } from "@prisma/client";
import prisma from "@/app/lib/prisma";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { toJsonInput } from "@/app/lib/prisma/json";

type DevicePayload = {
  name?: string;
  room?: string | null;
  type?: DeviceType;
  capabilities?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await requireUser();
    const { deviceId } = await params;
    const body = (await request.json()) as DevicePayload;

    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId: user.id },
    });
    if (!device) {
      return NextResponse.json({ error: "Appareil introuvable" }, { status: 404 });
    }

    const data: Prisma.DeviceUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.room !== undefined) data.room = body.room;
    if (body.type !== undefined) data.type = body.type;
    if (body.capabilities !== undefined) {
      data.capabilities = toJsonInput(body.capabilities);
    }
    if (body.metadata !== undefined) {
      data.metadata = toJsonInput(body.metadata);
    }

    const updated = await prisma.device.update({
      where: { id: device.id },
      data,
    });
    return NextResponse.json({ device: updated });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[PATCH /devices/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await requireUser();
    const { deviceId } = await params;
    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId: user.id },
    });
    if (!device) {
      return NextResponse.json({ error: "Appareil introuvable" }, { status: 404 });
    }

    await prisma.device.delete({ where: { id: device.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[DELETE /devices/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

