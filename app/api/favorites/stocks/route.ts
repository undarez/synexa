import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";

/**
 * GET - Récupère les cotations favorites de l'utilisateur
 */
export async function GET() {
  try {
    const user = await requireUser();
    
    const { data: favorites, error } = await supabase
      .from('FavoriteStock')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('[GET /api/favorites/stocks] Erreur Supabase:', error);
      return NextResponse.json({ favorites: [] });
    }

    return NextResponse.json({ favorites: favorites || [] });
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

    const now = new Date().toISOString();
    
    const { data: favorite, error } = await supabase
      .from('FavoriteStock')
      // @ts-expect-error - Le type Database.Update est any, mais TypeScript ne l'infère pas correctement
      .upsert({
        userId: user.id,
        symbol,
        name,
        exchange: exchange || null,
        currency: currency || null,
        metadata: metadata || null,
        updatedAt: now,
      }, {
        onConflict: 'userId,symbol',
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/favorites/stocks] Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'ajout du favori', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ favorite, added: true });
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

    const { error } = await supabase
      .from('FavoriteStock')
      .delete()
      .eq('userId', user.id)
      .eq('symbol', symbol);

    if (error) {
      console.error('[DELETE /api/favorites/stocks] Erreur Supabase:', error);
      // Considérer comme déjà supprimé en cas d'erreur
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/favorites/stocks]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

