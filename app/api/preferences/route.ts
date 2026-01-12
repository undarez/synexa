import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase/client";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";

export async function GET() {
  try {
    const user = await requireUser();
    
    const { data: preferences, error } = await supabase
      .from('Preference')
      .select('*')
      .eq('userId', user.id)
      .order('key', { ascending: true });

    if (error) {
      console.error('[GET /preferences] Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des préférences', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ preferences: preferences || [] });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /preferences]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      preferences?: Record<string, unknown>;
    };

    if (!body.preferences || typeof body.preferences !== "object") {
      return NextResponse.json(
        { error: "Payload 'preferences' manquant ou invalide" },
        { status: 400 }
      );
    }

    // Convertir les préférences en format Supabase (upsert)
    const now = new Date().toISOString();
    const preferencesToUpsert = Object.entries(body.preferences).map(([key, value]) => ({
      userId: user.id,
      key,
      value: value ?? null, // Supabase gère JSON automatiquement
      updatedAt: now,
    }));

    // Utiliser upsert avec onConflict pour gérer les mises à jour
    const { data: updated, error } = await supabase
      .from('Preference')
      // @ts-expect-error - Le type Database.Update est any, mais TypeScript ne l'infère pas correctement
      .upsert(preferencesToUpsert, {
        onConflict: 'userId,key',
      })
      .select();

    if (error) {
      console.error('[PATCH /preferences] Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des préférences', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ preferences: updated || [] });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[PATCH /preferences]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

