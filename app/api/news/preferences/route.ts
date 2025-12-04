import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import {
  getUserNewsPreferences,
  saveNewsPreference,
  type NewsPreferences,
} from "@/app/lib/services/news-personalization";
import type { NewsCategory } from "@/app/lib/services/news";

/**
 * GET - Récupère les préférences d'actualités de l'utilisateur
 */
export async function GET() {
  try {
    const user = await requireUser();
    const preferences = await getUserNewsPreferences(user.id);
    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("[GET /api/news/preferences]", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des préférences" },
      { status: 500 }
    );
  }
}

/**
 * POST - Met à jour les préférences d'actualités
 * Body: { categories?, sources?, excludedKeywords?, language?, maxArticles? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    if (body.categories) {
      await saveNewsPreference(user.id, "categories", body.categories);
    }
    if (body.sources) {
      await saveNewsPreference(user.id, "sources", body.sources);
    }
    if (body.excludedKeywords) {
      await saveNewsPreference(user.id, "excluded_keywords", body.excludedKeywords);
    }
    if (body.language) {
      await saveNewsPreference(user.id, "language", body.language);
    }
    if (body.maxArticles) {
      await saveNewsPreference(user.id, "max_articles", body.maxArticles);
    }

    const updatedPreferences = await getUserNewsPreferences(user.id);
    return NextResponse.json({ preferences: updatedPreferences });
  } catch (error) {
    console.error("[POST /api/news/preferences]", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des préférences" },
      { status: 500 }
    );
  }
}

