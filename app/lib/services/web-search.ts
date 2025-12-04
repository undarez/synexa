/**
 * Service de recherche web
 * Utilise DuckDuckGo pour des recherches gratuites
 */

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
  totalResults: number;
  searchTime?: number;
}

/**
 * Recherche web via DuckDuckGo (gratuit, sans clé)
 */
export async function searchWeb(query: string, maxResults: number = 10): Promise<WebSearchResponse> {
  try {
    // Utiliser l'API DuckDuckGo Instant Answer (gratuit)
    const instantAnswerUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    const instantResponse = await fetch(instantAnswerUrl);
    const instantData = await instantResponse.json();

    const results: WebSearchResult[] = [];

    // Ajouter la réponse instantanée si disponible
    if (instantData.AbstractText) {
      results.push({
        title: instantData.Heading || query,
        url: instantData.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        snippet: instantData.AbstractText,
        source: "DuckDuckGo Instant Answer",
      });
    }

    // Pour des résultats plus complets, utiliser une recherche web via proxy
    // Note: En production, vous pourriez utiliser une API comme SerpAPI, ScraperAPI, etc.
    // Pour l'instant, on utilise DuckDuckGo Instant Answer qui est gratuit

    // Si on a besoin de plus de résultats, on peut utiliser un service de scraping
    // Pour l'instant, on retourne les résultats disponibles

    return {
      query,
      results: results.slice(0, maxResults),
      totalResults: results.length,
    };
  } catch (error) {
    console.error("[Web Search] Erreur:", error);
    return {
      query,
      results: [],
      totalResults: 0,
    };
  }
}

/**
 * Recherche de prix pour un produit
 */
export async function searchPrice(productName: string): Promise<{
  product: string;
  prices: Array<{
    store: string;
    price: string;
    url: string;
  }>;
  averagePrice?: string;
}> {
  try {
    // Rechercher le produit
    const searchQuery = `prix ${productName} acheter`;
    const searchResults = await searchWeb(searchQuery, 5);

    // Extraire les prix des résultats
    const prices: Array<{ store: string; price: string; url: string }> = [];

    for (const result of searchResults.results) {
      // Essayer d'extraire un prix du snippet
      const priceMatch = result.snippet.match(/(\d+[.,]\d+)\s*€/);
      if (priceMatch) {
        prices.push({
          store: result.source || "Marchand",
          price: priceMatch[1] + " €",
          url: result.url,
        });
      }
    }

    // Calculer le prix moyen si possible
    let averagePrice: string | undefined;
    if (prices.length > 0) {
      const numericPrices = prices
        .map((p) => parseFloat(p.price.replace(",", ".").replace(" €", "")))
        .filter((p) => !isNaN(p));

      if (numericPrices.length > 0) {
        const sum = numericPrices.reduce((a, b) => a + b, 0);
        const avg = sum / numericPrices.length;
        averagePrice = `${avg.toFixed(2)} €`;
      }
    }

    return {
      product: productName,
      prices: prices.slice(0, 5),
      averagePrice,
    };
  } catch (error) {
    console.error("[Price Search] Erreur:", error);
    return {
      product: productName,
      prices: [],
    };
  }
}

/**
 * Recherche de services (restaurants, professionnels, etc.)
 */
export async function searchServices(serviceQuery: string, location?: string): Promise<{
  query: string;
  location?: string;
  services: Array<{
    name: string;
    address?: string;
    phone?: string;
    rating?: number;
    url?: string;
  }>;
}> {
  try {
    // Construire la requête de recherche
    const searchQuery = location
      ? `${serviceQuery} ${location}`
      : serviceQuery;

    const searchResults = await searchWeb(searchQuery, 10);

    // Extraire les informations de service des résultats
    const services = searchResults.results.map((result) => {
      // Essayer d'extraire des informations structurées
      const addressMatch = result.snippet.match(/(\d+[^,]*,\s*[^,]+)/);
      const phoneMatch = result.snippet.match(/(0[1-9][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2})/);

      return {
        name: result.title,
        address: addressMatch ? addressMatch[1] : undefined,
        phone: phoneMatch ? phoneMatch[1] : undefined,
        rating: undefined, // À extraire si disponible
        url: result.url,
      };
    });

    return {
      query: serviceQuery,
      location,
      services: services.slice(0, 10),
    };
  } catch (error) {
    console.error("[Service Search] Erreur:", error);
    return {
      query: serviceQuery,
      location,
      services: [],
    };
  }
}







