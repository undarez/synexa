import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { deleteHealthMetric } from "@/app/lib/health/metrics";

/**
 * DELETE - Supprime une métrique de santé
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ metricId: string }> }
) {
  try {
    const user = await requireUser();
    const { metricId } = await params;

    await deleteHealthMetric(metricId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/health/metrics/:id]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}

