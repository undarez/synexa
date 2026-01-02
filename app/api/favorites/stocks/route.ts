import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";

/**
 * GET - Récupère les cotations favorites de l'utilisateur
 */
export async function GET() {
  try {
    const user = await requireUser();
    
    // Vérifier si la table existe, sinon retourner un tableau vide
    try {
      const favorites = await prisma.favoriteStock.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ favorites });
    } catch (dbError: any) {
      // Si la table n'existe pas encore, retourner un tableau vide
      if (dbError.message?.includes("does not exist") || 
          dbError.message?.includes("no such table") ||
          dbError.message?.includes("Cannot read properties of undefined")) {
        console.warn("[GET /api/favorites/stocks] Table FavoriteStock n'existe pas encore, retour vide");
        return NextResponse.json({ favorites: [] });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("[GET /api/favorites/stocks]", error);
    // En cas d'erreur, retourner un tableau vide plutôt qu'une erreur 500
    return NextResponse.json({ favorites: [] });
  }
}

/**
 * POST - Ajoute une cotation aux favoris
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { symbol, name, exchange, currency, metadata } = body;

    if (!symbol || !name) {
      return NextResponse.json(
        { error: "Symbol et name requis" },
        { status: 400 }
      );
    }

    try {
      const favorite = await prisma.favoriteStock.upsert({
        where: {
          userId_symbol: {
            userId: user.id,
            symbol: symbol,
          },
        },
        update: {
          name,
          exchange: exchange || null,
          currency: currency || null,
          metadata: metadata || null,
          updatedAt: new Date(),
        },
        create: {
          userId: user.id,
          symbol,
          name,
          exchange: exchange || null,
          currency: currency || null,
          metadata: metadata || null,
        },
      });

      return NextResponse.json({ favorite, added: true });
    } catch (dbError: any) {
      // Si la table n'existe pas encore, informer l'utilisateur
      if (dbError.message?.includes("does not exist") || 
          dbError.message?.includes("no such table") ||
          dbError.message?.includes("Cannot read properties of undefined")) {
        console.warn("[POST /api/favorites/stocks] Table FavoriteStock n'existe pas encore");
        return NextResponse.json(
          { error: "La fonctionnalité de favoris n'est pas encore disponible. Veuillez redémarrer le serveur après la migration de la base de données." },
          { status: 503 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error("[POST /api/favorites/stocks]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Supprime une cotation des favoris
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol requis" },
        { status: 400 }
      );
    }

    try {
      await prisma.favoriteStock.delete({
        where: {
          userId_symbol: {
            userId: user.id,
            symbol: symbol,
          },
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
    console.error("[DELETE /api/favorites/stocks]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

