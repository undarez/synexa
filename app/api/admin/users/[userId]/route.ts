import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/admin";
import { supabase } from "@/app/lib/supabase/client";

/**
 * DELETE - Supprime un utilisateur (admin uniquement)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();

    const { userId } = await params;

    // Supprimer l'utilisateur et toutes ses données associées
    // Note: Supabase gère les cascades si configurées dans le schéma SQL
    const { error: deleteError } = await supabase
      .from('User')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('[DELETE /admin/users/:id] Erreur:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: error instanceof Error && error.message.includes("Accès refusé") ? 403 : 500 }
    );
  }
}

