import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";

/**
 * GET - Récupère les données de graphique pour un symbole
 */
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol");
    const range = searchParams.get("range") || "1d"; // 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    const interval = searchParams.get("interval") || "1d"; // 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol requis" },
        { status: 400 }
      );
    }

    // Utiliser Yahoo Finance pour récupérer les données de graphique
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erreur Yahoo Finance");
      }

      const data = await response.json();
      const result = data.chart?.result?.[0];

      if (!result || !result.timestamp || !result.indicators) {
        return NextResponse.json(
          { error: "Données de graphique non disponibles" },
          { status: 404 }
        );
      }

      const timestamps = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0] || {};
      const closes = quotes.close || [];
      const opens = quotes.open || [];
      const highs = quotes.high || [];
      const lows = quotes.low || [];
      const volumes = quotes.volume || [];

      // Construire les données du graphique
      const chartData = timestamps.map((timestamp: number, index: number) => ({
        time: new Date(timestamp * 1000).toISOString(),
        timestamp: timestamp * 1000,
        open: opens[index] || null,
        high: highs[index] || null,
        low: lows[index] || null,
        close: closes[index] || null,
        volume: volumes[index] || null,
      }));

      return NextResponse.json({
        symbol: result.meta?.symbol || symbol,
        currency: result.meta?.currency || "USD",
        chartData: chartData.filter((d: any) => d.close !== null), // Filtrer les valeurs nulles
      });
    } catch (error) {
      console.error("[GET /api/stock-market/chart] Erreur Yahoo Finance:", error);
      return NextResponse.json(
        { error: "Impossible de charger les données de graphique" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[GET /api/stock-market/chart]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}












