import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { searchNews, searchNewsByCategory, type NewsCategory } from "@/app/lib/services/news";
import { getPersonalizedNews } from "@/app/lib/services/news-personalization";
import { logger } from "@/app/lib/logger";

/**
 * GET - Recherche d'actualités (avec personnalisation optionnelle)
 * Query params:
 * - q: terme de recherche
 * - category: catégorie (general, technology, business, etc.)
 * - language: langue (fr par défaut)
 * - personalized: true pour activer la personnalisation (défaut: true)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") as NewsCategory | null;
    const language = searchParams.get("language") || "fr";
    const personalized = searchParams.get("personalized") !== "false"; // Par défaut activé

    logger.info("Recherche d'actualités", {
      userId: user.id,
      query,
      category: category || "none",
      personalized,
    });

    let result;
    
    if (personalized) {
      // Utiliser la personnalisation
      const personalizedResult = await getPersonalizedNews(user.id, query || undefined, category || undefined);
      result = {
        query: query || category || "general",
        articles: personalizedResult.articles,
        totalResults: personalizedResult.articles.length,
        sources: personalizedResult.sources,
        lastUpdate: new Date().toISOString(),
        personalization: personalizedResult.personalization,
      };
    } else {
      // Recherche standard sans personnalisation
      if (category) {
        result = await searchNewsByCategory(category, language);
      } else {
        result = await searchNews(query, undefined, language);
      }
    }

    logger.debug("Actualités trouvées", {
      userId: user.id,
      count: result.articles.length,
      sources: result.sources,
      personalized,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    logger.error("Erreur lors de la recherche d'actualités", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}





