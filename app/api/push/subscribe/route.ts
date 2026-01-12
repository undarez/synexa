import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";

/**
 * Enregistre une subscription push pour l'utilisateur
 * POST /api/push/subscribe
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const { endpoint, keys } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: "Subscription invalide" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    
    // Vérifier si la subscription existe déjà
    const { data: existing } = await supabase
      .from('PushSubscription')
      .select('id')
      .eq('endpoint', endpoint)
      .single();

    if (existing) {
      // Mettre à jour si elle existe déjà
      const { error: updateError } = await supabase
        .from('PushSubscription')
        .update({
          p256dh: keys.p256dh,
          auth: keys.auth,
          updatedAt: now,
        })
        .eq('endpoint', endpoint);

      if (updateError) {
        console.error('[POST /push/subscribe] Erreur mise à jour:', updateError);
      }
    } else {
      // Créer une nouvelle subscription
      const { error: createError } = await supabase
        .from('PushSubscription')
        .insert({
          userId: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          createdAt: now,
          updatedAt: now,
        });

      if (createError) {
        console.error('[POST /push/subscribe] Erreur création:', createError);
        return NextResponse.json(
          { error: 'Erreur lors de la création de la subscription', details: createError.message },
          { status: 500 }
        );
      }
    }

    console.log(`[Push] Subscription enregistrée pour ${user.email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Non autorisé")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[Push Subscribe] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * Supprime une subscription push
 * DELETE /api/push/subscribe
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint requis" },
        { status: 400 }
      );
    }

    // Supprimer la subscription de la base de données
    const { error } = await supabase
      .from('PushSubscription')
      .delete()
      .eq('userId', user.id)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('[DELETE /push/subscribe] Erreur:', error);
    }

    console.log(`[Push] Subscription supprimée pour ${user.email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Non autorisé")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[Push Unsubscribe] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

