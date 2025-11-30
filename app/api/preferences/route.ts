import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/app/lib/prisma";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { toJsonInput } from "@/app/lib/prisma/json";

export async function GET() {
  try {
    const user = await requireUser();
    const preferences = await prisma.preference.findMany({
      where: { userId: user.id },
      orderBy: { key: "asc" },
    });
    return NextResponse.json({ preferences });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /preferences]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      preferences?: Record<string, unknown>;
    };

    if (!body.preferences || typeof body.preferences !== "object") {
      return NextResponse.json(
        { error: "Payload 'preferences' manquant ou invalide" },
        { status: 400 }
      );
    }

    const operations = Object.entries(body.preferences).map(([key, value]) =>
      prisma.preference.upsert({
        where: { userId_key: { userId: user.id, key } },
        update: { value: toJsonInput(value) ?? Prisma.JsonNull },
        create: { userId: user.id, key, value: toJsonInput(value) ?? Prisma.JsonNull },
      })
    );

    const updated = await prisma.$transaction(operations);
    return NextResponse.json({ preferences: updated });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[PATCH /preferences]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

