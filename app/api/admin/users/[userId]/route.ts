import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/admin";
import prisma from "@/app/lib/prisma";

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
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: error instanceof Error && error.message.includes("Accès refusé") ? 403 : 500 }
    );
  }
}

