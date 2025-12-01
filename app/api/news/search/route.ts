import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { searchNews, searchNewsByCategory, type NewsCategory } from "@/app/lib/services/news";
import { logger } from "@/app/lib/logger";

/**
 * GET - Recherche d'actualités
 * Query params:
 * - q: terme de recherche
 * - category: catégorie (general, technology, business, etc.)
 * - language: langue (fr par défaut)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") as NewsCategory | null;
    const language = searchParams.get("language") || "fr";

    logger.info("Recherche d'actualités", {
      userId: user.id,
      query,
      category: category || "none",
    });

    let result;
    if (category) {
      result = await searchNewsByCategory(category, language);
    } else {
      result = await searchNews(query, undefined, language);
    }

    logger.debug("Actualités trouvées", {
      userId: user.id,
      count: result.articles.length,
      sources: result.sources,
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



