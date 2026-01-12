import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";

/**
 * POST /api/smart-home/auth
 * Configure les credentials eWeLink pour l'utilisateur
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { email, password, appId, appSecret, region = "eu" } = body;

    if (!email || !password || !appId || !appSecret) {
      return NextResponse.json(
        { error: "Email, password, appId et appSecret sont requis" },
        { status: 400 }
      );
    }

    // Authentifier avec eWeLink
    const authResponse = await fetch(
      `https://${region}-api.coolkit.cc:8080/api/user/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appid: appId,
          appsecret: appSecret,
          email,
          password,
        }),
      }
    );

    if (!authResponse.ok) {
      const errorData = await authResponse.json();
      return NextResponse.json(
        { error: errorData.error || "Erreur d'authentification eWeLink" },
        { status: authResponse.status }
      );
    }

    const authData = await authResponse.json();

    // Calculer la date d'expiration (généralement 30 jours)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const now = new Date().toISOString();
    
    // Sauvegarder les credentials
    const { data: credentials, error: upsertError } = await supabase
      .from('EWeLinkCredentials')
      // @ts-expect-error - Le type Database.Update est any, mais TypeScript ne l'infère pas correctement
      .upsert({
        userId: user.id,
        accessToken: authData.at,
        refreshToken: authData.rt || null,
        expiresAt: expiresAt.toISOString(),
        region,
        appId: appId || null,
        updatedAt: now,
      }, {
        onConflict: 'userId',
      })
      .select()
      .single();

    if (upsertError || !credentials) {
      console.error('[POST /smart-home/auth] Erreur upsert:', upsertError);
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde des credentials', details: upsertError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Credentials eWeLink configurés avec succès",
      region: credentials.region,
    });
  } catch (error: any) {
    console.error("[Smart Home Auth] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la configuration" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/smart-home/auth
 * Vérifie si les credentials sont configurés
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    const { data: credentials, error: fetchError } = await supabase
      .from('EWeLinkCredentials')
      .select('id, region, expiresAt, createdAt')
      .eq('userId', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[GET /smart-home/auth] Erreur:', fetchError);
    }

    if (!credentials) {
      return NextResponse.json({ configured: false });
    }

    // Vérifier si le token est expiré
    const isExpired = credentials.expiresAt
      ? new Date(credentials.expiresAt) < new Date()
      : false;

    return NextResponse.json({
      configured: true,
      region: credentials.region,
      expired: isExpired,
    });
  } catch (error: any) {
    console.error("[Smart Home Auth] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/smart-home/auth
 * Supprime les credentials eWeLink
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();

    const { error: deleteError } = await supabase
      .from('EWeLinkCredentials')
      .delete()
      .eq('userId', user.id);

    if (deleteError) {
      console.error('[DELETE /smart-home/auth] Erreur:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Credentials eWeLink supprimés",
    });
  } catch (error: any) {
    console.error("[Smart Home Auth] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}




