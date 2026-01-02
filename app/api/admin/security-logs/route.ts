import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/admin";
import prisma from "@/app/lib/prisma";

/**
 * GET - Récupère les logs de sécurité (admin uniquement)
 */
export async function GET() {
  try {
    await requireAdmin();

    const logs = await prisma.securityLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // Limiter à 100 derniers logs
      select: {
        id: true,
        eventType: true,
        severity: true,
        details: true,
        createdAt: true,
        userId: true,
      },
    });

    return NextResponse.json({
      logs: logs.map((log) => ({
        ...log,
        timestamp: log.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: error instanceof Error && error.message.includes("Accès refusé") ? 403 : 500 }
    );
  }
}

