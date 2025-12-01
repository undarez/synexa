import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import {
  createHealthMetric,
  getHealthMetrics,
  getHealthMetricsSummary,
} from "@/app/lib/health/metrics";
import { HealthMetricType } from "@prisma/client";

/**
 * GET - Récupère les métriques de santé
 * Query: type, startDate, endDate, summary (bool)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);

    const summary = searchParams.get("summary") === "true";
    if (summary) {
      const days = parseInt(searchParams.get("days") || "30", 10);
      const summaries = await getHealthMetricsSummary(user.id, days);
      return NextResponse.json({ success: true, summaries });
    }

    const type = searchParams.get("type") as HealthMetricType | null;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined;

    const metrics = await getHealthMetrics(user.id, {
      type: type || undefined,
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json({ success: true, metrics });
  } catch (error) {
    console.error("[GET /api/health/metrics]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Crée une nouvelle métrique de santé
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const { type, value, unit, source, recordedAt, metadata } = body;

    if (!type || value === undefined) {
      return NextResponse.json(
        { error: "type et value sont requis" },
        { status: 400 }
      );
    }

    const metric = await createHealthMetric(user.id, {
      type: type as HealthMetricType,
      value: parseFloat(value),
      unit,
      source: source || "manual",
      recordedAt: recordedAt ? new Date(recordedAt) : undefined,
      metadata,
    });

    return NextResponse.json({ success: true, metric }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/health/metrics]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}


