import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { searchStockSymbols } from "@/app/lib/services/stock-market";

/**
 * GET - Recherche de symboles boursiers
 */
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: "Query requise" },
        { status: 400 }
      );
    }

    const results = await searchStockSymbols(query.trim());

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[GET /api/stock-market/search]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}





