import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { getWidgetSuggestions } from "@/app/lib/dashboard/widget-suggestions";

/**
 * GET /api/dashboard/widgets/suggestions
 * Récupère les suggestions de widgets par Synexa
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    const suggestions = await getWidgetSuggestions(user.id);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("[Widget Suggestions API] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des suggestions" },
      { status: 500 }
    );
  }
}

