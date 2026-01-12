import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";
import type { NewsArticle } from "@/app/lib/services/news";

/**
 * GET - Récupère les articles favoris de l'utilisateur
 */
export async function GET() {
  try {
    const user = await requireUser();
    
    const { data: favorites, error } = await supabase
      .from('FavoriteArticle')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('[GET /api/favorites/articles] Erreur Supabase:', error);
      return NextResponse.json({ favorites: [] });
    }

    return NextResponse.json({ favorites: favorites || [] });
  } catch (error) {
    console.error("[GET /api/favorites/articles]", error);
    // En cas d'erreur, retourner un tableau vide plutôt qu'une erreur 500
    return NextResponse.json({ favorites: [] });
  }
}

/**
 * POST - Ajoute un article aux favoris
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const article = body.article as NewsArticle;

    if (!article || !article.url) {
      return NextResponse.json(
        { error: "Article invalide" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    
    const { data: favorite, error } = await supabase
      .from('FavoriteArticle')
      // @ts-expect-error - Le type Database.Update est any, mais TypeScript ne l'infère pas correctement
      .upsert({
        userId: user.id,
        title: article.title,
        description: article.description || null,
        url: article.url,
        source: article.source,
        imageUrl: article.imageUrl || null,
        publishedAt: new Date(article.publishedAt).toISOString(),
        category: article.category || null,
        metadata: article as any,
        updatedAt: now,
      }, {
        onConflict: 'userId,url',
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/favorites/articles] Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'ajout du favori', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ favorite, added: true });
  } catch (error) {
    console.error("[POST /api/favorites/articles]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Supprime un article des favoris
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL requise" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('FavoriteArticle')
      .delete()
      .eq('userId', user.id)
      .eq('url', url);

    if (error) {
      console.error('[DELETE /api/favorites/articles] Erreur Supabase:', error);
      // Considérer comme déjà supprimé en cas d'erreur
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/favorites/articles]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

