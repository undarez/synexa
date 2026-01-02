/**
 * Service pour récupérer les données boursières
 * Utilise des APIs gratuites pour les cotations
 */

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  exchange?: string;
  volume?: number;
  marketCap?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  timestamp: string;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  currency?: string;
}

/**
 * Recherche une cotation par symbole
 * Utilise Alpha Vantage (gratuit avec clé API) ou Yahoo Finance (gratuit sans clé)
 */
export async function searchStock(symbol: string): Promise<StockQuote | null> {
  try {
    // Essayer Alpha Vantage si disponible
    if (process.env.ALPHA_VANTAGE_API_KEY) {
      const quote = await searchStockAlphaVantage(symbol);
      if (quote) return quote;
    }

    // Fallback: Yahoo Finance (gratuit, sans clé)
    const quote = await searchStockYahooFinance(symbol);
    return quote;
  } catch (error) {
    console.error("[Stock Market] Erreur recherche:", error);
    return null;
  }
}

/**
 * Recherche via Alpha Vantage
 */
async function searchStockAlphaVantage(symbol: string): Promise<StockQuote | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const quote = data["Global Quote"];

    if (!quote || !quote["05. price"]) return null;

    return {
      symbol: quote["01. symbol"],
      name: quote["01. symbol"], // Alpha Vantage ne fournit pas le nom
      price: parseFloat(quote["05. price"]),
      change: parseFloat(quote["09. change"]),
      changePercent: parseFloat(quote["10. change percent"].replace("%", "")),
      currency: "USD", // À détecter selon le symbole
      exchange: quote["02. exchange"] || undefined,
      volume: parseInt(quote["06. volume"]) || undefined,
      high: parseFloat(quote["03. high"]) || undefined,
      low: parseFloat(quote["04. low"]) || undefined,
      open: parseFloat(quote["02. open"]) || undefined,
      previousClose: parseFloat(quote["08. previous close"]) || undefined,
      timestamp: quote["07. latest trading day"],
    };
  } catch (error) {
    console.warn("[Stock Market] Erreur Alpha Vantage:", error);
    return null;
  }
}

/**
 * Récupère le taux de change USD vers EUR en temps réel
 */
async function getUSDToEURRate(): Promise<number> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1m&range=1d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
        cache: 'no-store',
      }
    );

    if (response.ok) {
      const data = await response.json();
      const result = data.chart?.result?.[0];
      if (result?.meta?.regularMarketPrice) {
        // EURUSD=X donne le nombre d'USD pour 1 EUR, donc on inverse pour avoir EUR pour 1 USD
        return 1 / result.meta.regularMarketPrice;
      }
    }
  } catch (error) {
    console.warn("[Stock Market] Erreur récupération taux de change:", error);
  }
  // Taux de change par défaut si l'API échoue (environ 0.92 EUR pour 1 USD)
  return 0.92;
}

/**
 * Recherche via Yahoo Finance (gratuit, sans clé) - Version améliorée pour temps réel
 */
async function searchStockYahooFinance(symbol: string): Promise<StockQuote | null> {
  try {
    // Utiliser l'API Yahoo Finance avec intervalle 1m pour données plus récentes
    // et inclure les modules nécessaires pour avoir toutes les données
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d&includePrePost=true&events=div%7Csplit%7Cearn&corsDomain=finance.yahoo.com`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
        cache: 'no-store', // Pas de cache pour données en temps réel
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result || !result.meta) return null;

    const meta = result.meta;
    
    // Utiliser le prix en temps réel si disponible, sinon regularMarketPrice
    const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
    const previousClose = meta.previousClose || currentPrice;
    
    // Calculer la variation correcte
    const change = currentPrice - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    // Récupérer le timestamp réel (en secondes, convertir en millisecondes)
    const timestamp = meta.regularMarketTime 
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString();

    const currency = meta.currency || "USD";
    let price = currentPrice;
    let changeAmount = change;
    let finalCurrency = currency;
    let eurRate = 1;

    // Convertir USD vers EUR si nécessaire
    if (currency === "USD") {
      eurRate = await getUSDToEURRate();
      price = currentPrice * eurRate;
      changeAmount = change * eurRate;
      finalCurrency = "EUR";
    }

    return {
      symbol: meta.symbol,
      name: meta.longName || meta.shortName || meta.symbol,
      price: Math.round(price * 100) / 100, // Arrondir à 2 décimales
      change: Math.round(changeAmount * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      currency: finalCurrency,
      exchange: meta.exchangeName || undefined,
      volume: meta.regularMarketVolume || undefined,
      marketCap: meta.marketCap ? (currency === "USD" ? Math.round(meta.marketCap * eurRate) : meta.marketCap) : undefined,
      high: meta.regularMarketDayHigh ? Math.round((currency === "USD" ? meta.regularMarketDayHigh * eurRate : meta.regularMarketDayHigh) * 100) / 100 : undefined,
      low: meta.regularMarketDayLow ? Math.round((currency === "USD" ? meta.regularMarketDayLow * eurRate : meta.regularMarketDayLow) * 100) / 100 : undefined,
      open: meta.regularMarketOpen ? Math.round((currency === "USD" ? meta.regularMarketOpen * eurRate : meta.regularMarketOpen) * 100) / 100 : undefined,
      previousClose: previousClose ? Math.round((currency === "USD" ? previousClose * eurRate : previousClose) * 100) / 100 : undefined,
      timestamp: timestamp,
    };
  } catch (error) {
    console.warn("[Stock Market] Erreur Yahoo Finance:", error);
    return null;
  }
}

/**
 * Récupère plusieurs cotations en une fois
 */
export async function getMultipleStocks(symbols: string[]): Promise<StockQuote[]> {
  const quotes = await Promise.all(
    symbols.map(symbol => searchStock(symbol))
  );
  return quotes.filter((quote): quote is StockQuote => quote !== null);
}

/**
 * Recherche de symboles boursiers
 */
export async function searchStockSymbols(query: string): Promise<StockSearchResult[]> {
  try {
    // Utiliser Yahoo Finance pour la recherche
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const quotes = data.quotes || [];

    return quotes.slice(0, 10).map((quote: any) => ({
      symbol: quote.symbol,
      name: quote.longname || quote.shortname || quote.symbol,
      exchange: quote.exchange,
      currency: quote.quoteType === "EQUITY" ? "USD" : undefined,
    }));
  } catch (error) {
    console.warn("[Stock Market] Erreur recherche symboles:", error);
    return [];
  }
}


