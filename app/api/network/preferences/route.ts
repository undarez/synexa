import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";

/**
 * POST - Met à jour les préférences réseau de l'utilisateur
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const updateData: {
      wifiEnabled?: boolean;
      mobileDataEnabled?: boolean;
      wifiSSID?: string | null;
      updatedAt: string;
    } = {
      updatedAt: new Date().toISOString(),
    };
    
    if (body.wifiEnabled !== undefined) updateData.wifiEnabled = body.wifiEnabled;
    if (body.mobileDataEnabled !== undefined) updateData.mobileDataEnabled = body.mobileDataEnabled;
    if (body.wifiSSID !== undefined) updateData.wifiSSID = body.wifiSSID || null;

    const { error } = await supabase
      .from('User')
      .update(updateData as Record<string, any>)
      .eq('id', user.id);

    if (error) {
      console.error('[POST /network/preferences] Erreur:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * GET - Récupère les préférences réseau de l'utilisateur
 */
export async function GET() {
  try {
    const user = await requireUser();

    const { data: userData, error } = await supabase
      .from('User')
      .select('wifiEnabled, wifiSSID, mobileDataEnabled')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('[GET /network/preferences] Erreur:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: userData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}


