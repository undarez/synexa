import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { executeRoutine } from "@/app/lib/services/ewelink";

/**
 * POST /api/smart-home/routines/[routineId]/execute
 * Exécute une routine
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ routineId: string }> }
) {
  try {
    const user = await requireUser();
    const { routineId } = await params;

    await executeRoutine(user.id, routineId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Smart Home API] Erreur execute routine:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'exécution de la routine" },
      { status: 500 }
    );
  }
}




