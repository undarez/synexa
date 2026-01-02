import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";
import type { NewsArticle } from "@/app/lib/services/news";

/**
 * GET - Récupère les articles favoris de l'utilisateur
 */
export async function GET() {
  try {
    const user = await requireUser();
    
    // Vérifier si la table existe, sinon retourner un tableau vide
    try {
      const favorites = await prisma.favoriteArticle.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ favorites });
    } catch (dbError: any) {
      // Si la table n'existe pas encore, retourner un tableau vide
      if (dbError.message?.includes("does not exist") || 
          dbError.message?.includes("no such table") ||
          dbError.message?.includes("Cannot read properties of undefined")) {
        console.warn("[GET /api/favorites/articles] Table FavoriteArticle n'existe pas encore, retour vide");
        return NextResponse.json({ favorites: [] });
      }
      throw dbError;
    }
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

    try {
      const favorite = await prisma.favoriteArticle.upsert({
        where: {
          userId_url: {
            userId: user.id,
            url: article.url,
          },
        },
        update: {
          updatedAt: new Date(),
        },
        create: {
          userId: user.id,
          title: article.title,
          description: article.description || null,
          url: article.url,
          source: article.source,
          imageUrl: article.imageUrl || null,
          publishedAt: new Date(article.publishedAt),
          category: article.category || null,
          metadata: article as any,
        },
      });

      return NextResponse.json({ favorite, added: true });
    } catch (dbError: any) {
      // Si la table n'existe pas encore, informer l'utilisateur
      if (dbError.message?.includes("does not exist") || 
          dbError.message?.includes("no such table") ||
          dbError.message?.includes("Cannot read properties of undefined")) {
        console.warn("[POST /api/favorites/articles] Table FavoriteArticle n'existe pas encore");
        return NextResponse.json(
          { error: "La fonctionnalité de favoris n'est pas encore disponible. Veuillez redémarrer le serveur après la migration de la base de données." },
          { status: 503 }
        );
      }
      throw dbError;
    }
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

    try {
      await prisma.favoriteArticle.deleteMany({
        where: {
          userId: user.id,
          url: url,
        },
      });

      return NextResponse.json({ deleted: true });
    } catch (dbError: any) {
      // Si la table n'existe pas encore, considérer comme déjà supprimé
      if (dbError.message?.includes("does not exist") || 
          dbError.message?.includes("no such table") ||
          dbError.message?.includes("Cannot read properties of undefined")) {
        return NextResponse.json({ deleted: true });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("[DELETE /api/favorites/articles]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

