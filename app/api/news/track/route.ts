import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { trackNewsActivity } from "@/app/lib/services/news-personalization";
import type { NewsArticle } from "@/app/lib/services/news";

/**
 * POST - Track une activité de consultation d'actualités
 * Body: { article: NewsArticle }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const article = body.article as NewsArticle;

    if (!article) {
      return NextResponse.json(
        { error: "Article requis" },
        { status: 400 }
      );
    }

    await trackNewsActivity(user.id, article);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/news/track]", error);
    return NextResponse.json(
      { error: "Erreur lors du tracking" },
      { status: 500 }
    );
  }
}

