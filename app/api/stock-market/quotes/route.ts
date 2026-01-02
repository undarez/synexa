import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { getMultipleStocks } from "@/app/lib/services/stock-market";

/**
 * GET - Récupère les cotations pour plusieurs symboles
 */
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const symbolsParam = searchParams.get("symbols");

    if (!symbolsParam) {
      return NextResponse.json(
        { error: "Symbols requis" },
        { status: 400 }
      );
    }

    const symbols = symbolsParam.split(",").map(s => s.trim()).filter(s => s);
    
    if (symbols.length === 0) {
      return NextResponse.json(
        { error: "Au moins un symbole requis" },
        { status: 400 }
      );
    }

    const quotes = await getMultipleStocks(symbols);

    return NextResponse.json(
      { quotes },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/stock-market/quotes]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}


