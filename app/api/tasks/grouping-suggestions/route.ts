import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { getGroupingSuggestions } from "@/app/lib/tasks/grouping-suggestions";

/**
 * GET - Récupère les suggestions de regroupement intelligentes
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    
    const suggestions = await getGroupingSuggestions(user.id);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("[GET /api/tasks/grouping-suggestions]", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des suggestions" },
      { status: 500 }
    );
  }
}



