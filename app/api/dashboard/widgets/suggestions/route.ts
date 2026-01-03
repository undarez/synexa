import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getWidgetSuggestions } from "@/app/lib/dashboard/widget-suggestions";

/**
 * GET /api/dashboard/widgets/suggestions
 * Récupère les suggestions de widgets par Synexa
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const suggestions = await getWidgetSuggestions(session.user.id);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("[Widget Suggestions API] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des suggestions" },
      { status: 500 }
    );
  }
}





