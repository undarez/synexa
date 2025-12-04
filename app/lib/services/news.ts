/**
 * Service de recherche d'actualités
 * Utilise plusieurs sources gratuites pour obtenir des actualités
 */

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  category?: string;
}

export interface NewsSearchResult {
  query: string;
  articles: NewsArticle[];
  totalResults: number;
  sources: string[];
  lastUpdate: string;
}

/**
 * Recherche des actualités sur un sujet donné
 * Utilise plusieurs sources gratuites
 */
export async function searchNews(
  query: string,
  category?: string,
  language: string = "fr"
): Promise<NewsSearchResult> {
  const articles: NewsArticle[] = [];
  const sources: string[] = [];

  try {
    // Essayer NewsAPI si disponible (gratuit avec limites)
    // Note: NewsAPI nécessite soit un query, soit des paramètres spécifiques
    // Si on a seulement une catégorie sans query, on saute NewsAPI
    if (process.env.NEWS_API_KEY && (query || (!category && !query))) {
      try {
        const newsApiResults = await searchNewsAPI(query || "news", category, language);
        articles.push(...newsApiResults.articles);
        sources.push(...newsApiResults.sources);
      } catch (error) {
        // Erreur silencieuse, on utilise les fallbacks
        if (!(error instanceof Error && error.message.includes("invalid request"))) {
          console.warn("[News] Erreur NewsAPI:", error);
        }
      }
    }

    // Utiliser Google News RSS (gratuit, sans clé)
    try {
      const googleNewsResults = await searchGoogleNewsRSS(query, language);
      articles.push(...googleNewsResults.articles);
      sources.push(...googleNewsResults.sources);
    } catch (error) {
      console.warn("[News] Erreur Google News RSS:", error);
    }

    // Utiliser RSS feeds français (gratuit)
    try {
      const rssResults = await searchRSSFeeds(query, category);
      articles.push(...rssResults.articles);
      sources.push(...rssResults.sources);
    } catch (error) {
      console.warn("[News] Erreur RSS:", error);
    }

    // Dédupliquer les articles (par URL)
    const uniqueArticles = deduplicateArticles(articles);

    // Trier par date (plus récent en premier)
    uniqueArticles.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return dateB - dateA;
    });

    return {
      query,
      articles: uniqueArticles.slice(0, 20), // Limiter à 20 articles
      totalResults: uniqueArticles.length,
      sources: [...new Set(sources)],
      lastUpdate: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[News] Erreur recherche:", error);
    // Retourner des résultats vides plutôt que d'échouer
    return {
      query,
      articles: [],
      totalResults: 0,
      sources: [],
      lastUpdate: new Date().toISOString(),
    };
  }
}

/**
 * Recherche via NewsAPI (nécessite une clé API gratuite)
 */
async function searchNewsAPI(
  query: string,
  category?: string,
  language: string = "fr"
): Promise<{ articles: NewsArticle[]; sources: string[] }> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    throw new Error("NEWS_API_KEY non configurée");
  }

  const params = new URLSearchParams({
    q: query,
    language,
    sortBy: "publishedAt",
    pageSize: "10",
  });

  if (category) {
    params.append("category", category);
  }

  const response = await fetch(
    `https://newsapi.org/v2/everything?${params.toString()}`,
    {
      headers: {
        "X-API-Key": apiKey,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // NewsAPI retourne 400 si la requête est invalide (ex: query vide avec category)
    // On ignore silencieusement cette erreur et on utilise les fallbacks
    if (response.status === 400) {
      console.warn("[News] NewsAPI: Requête invalide, utilisation des fallbacks");
      throw new Error("NewsAPI invalid request");
    }
    throw new Error(`NewsAPI error: ${response.status} - ${errorData.message || ""}`);
  }

  const data = await response.json();

  // Fonction pour nettoyer le HTML de la description
  const cleanDescription = (html: string): string => {
    if (!html) return "";
    // Supprimer les balises HTML, notamment <a href="...">
    return html
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi, "$2") // Supprimer les liens mais garder le texte
      .replace(/<[^>]+>/g, "") // Supprimer toutes les autres balises HTML
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
  };

  return {
    articles: (data.articles || []).map((article: any) => ({
      title: article.title || "",
      description: cleanDescription(article.description || ""),
      url: article.url || "",
      source: article.source?.name || "NewsAPI",
      publishedAt: article.publishedAt || new Date().toISOString(),
      imageUrl: article.urlToImage,
      category: category || "general",
    })),
    sources: ["NewsAPI"],
  };
}

/**
 * Recherche via Google News RSS (gratuit, sans clé)
 */
async function searchGoogleNewsRSS(
  query: string,
  language: string = "fr"
): Promise<{ articles: NewsArticle[]; sources: string[] }> {
  // Google News RSS (gratuit, sans clé)
  const encodedQuery = encodeURIComponent(query);
  const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=${language}&gl=FR&ceid=FR:${language}`;

  try {
    // Utiliser un proxy CORS ou parser côté serveur
    // Pour l'instant, on simule avec une recherche alternative
    const response = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`
    );

    if (!response.ok) {
      throw new Error(`RSS error: ${response.status}`);
    }

    const data = await response.json();

    // Fonction pour nettoyer le HTML de la description
    const cleanDescription = (html: string): string => {
      if (!html) return "";
      // Supprimer les balises HTML, notamment <a href="...">
      return html
        .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi, "$2") // Supprimer les liens mais garder le texte
        .replace(/<[^>]+>/g, "") // Supprimer toutes les autres balises HTML
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .trim();
    };

    return {
      articles: (data.items || []).slice(0, 10).map((item: any) => ({
        title: item.title || "",
        description: cleanDescription(item.description || item.content || ""),
        url: item.link || "",
        source: item.source || "Google News",
        publishedAt: item.pubDate || new Date().toISOString(),
        imageUrl: item.enclosure?.link,
      })),
      sources: ["Google News"],
    };
  } catch (error) {
    // Si RSS2JSON ne fonctionne pas, utiliser une recherche alternative
    return searchAlternativeNews(query, language);
  }
}

/**
 * Recherche alternative via RSS feeds français
 */
async function searchRSSFeeds(
  query: string,
  category?: string
): Promise<{ articles: NewsArticle[]; sources: string[] }> {
  const articles: NewsArticle[] = [];
  const sources: string[] = [];

  // RSS feeds français populaires
  const rssFeeds = [
    {
      url: "https://www.lemonde.fr/rss/une.xml",
      source: "Le Monde",
      category: "general",
    },
    {
      url: "https://www.lefigaro.fr/rss/figaro_actualites.xml",
      source: "Le Figaro",
      category: "general",
    },
    {
      url: "https://www.liberation.fr/rss/",
      source: "Libération",
      category: "general",
    },
  ];

  // Filtrer par catégorie si spécifiée
  const feedsToSearch = category
    ? rssFeeds.filter((feed) => feed.category === category)
    : rssFeeds;

  for (const feed of feedsToSearch.slice(0, 2)) {
    // Limiter à 2 feeds pour éviter trop de requêtes
    try {
      const response = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`
      );

      if (response.ok) {
        const data = await response.json();
        const feedArticles = (data.items || [])
          .filter((item: any) =>
            query
              ? item.title?.toLowerCase().includes(query.toLowerCase()) ||
                item.description?.toLowerCase().includes(query.toLowerCase())
              : true
          )
          .slice(0, 5)
          .map((item: any) => {
            // Fonction pour nettoyer le HTML de la description
            const cleanDescription = (html: string): string => {
              if (!html) return "";
              // Supprimer les balises HTML, notamment <a href="...">
              return html
                .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi, "$2") // Supprimer les liens mais garder le texte
                .replace(/<[^>]+>/g, "") // Supprimer toutes les autres balises HTML
                .replace(/&nbsp;/g, " ")
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .trim();
            };

            return {
              title: item.title || "",
              description: cleanDescription(item.description || ""),
              url: item.link || "",
              source: feed.source,
              publishedAt: item.pubDate || new Date().toISOString(),
              imageUrl: item.enclosure?.link,
              category: feed.category,
            };
          });

        articles.push(...feedArticles);
        sources.push(feed.source);
      }
    } catch (error) {
      console.warn(`[News] Erreur RSS feed ${feed.source}:`, error);
    }
  }

  return { articles, sources };
}

/**
 * Recherche alternative (fallback)
 */
async function searchAlternativeNews(
  query: string,
  language: string = "fr"
): Promise<{ articles: NewsArticle[]; sources: string[] }> {
  // Recherche via DuckDuckGo Instant Answer (gratuit, sans clé)
  // Ou utiliser une autre source gratuite

  // Pour l'instant, retourner des résultats basiques
  return {
    articles: [
      {
        title: `Actualités sur "${query}"`,
        description: `Recherche d'actualités sur le sujet "${query}". Configurez NEWS_API_KEY pour des résultats plus précis.`,
        url: `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=${language}`,
        source: "Google News",
        publishedAt: new Date().toISOString(),
        category: "general",
      },
    ],
    sources: ["Google News"],
  };
}

/**
 * Déduplique les articles par URL
 */
function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const url = article.url.toLowerCase();
    if (seen.has(url)) {
      return false;
    }
    seen.add(url);
    return true;
  });
}

/**
 * Catégories d'actualités supportées
 */
export const NEWS_CATEGORIES = [
  "general",
  "technology",
  "business",
  "health",
  "science",
  "sports",
  "entertainment",
  "politics",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

/**
 * Recherche par catégorie
 */
export async function searchNewsByCategory(
  category: NewsCategory,
  language: string = "fr"
): Promise<NewsSearchResult> {
  return searchNews("", category, language);
}

