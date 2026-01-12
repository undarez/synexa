import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/admin";
import { supabase } from "@/app/lib/supabase/client";

/**
 * GET - Récupère les logs de sécurité (admin uniquement)
 */
export async function GET() {
  try {
    await requireAdmin();

    const { data: logs, error } = await supabase
      .from('SecurityLog')
      .select('id, eventType, severity, details, createdAt, userId')
      .order('createdAt', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[GET /admin/security-logs] Erreur:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des logs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      logs: (logs || []).map((log: any) => ({
        ...log,
        timestamp: log.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: error instanceof Error && error.message.includes("Accès refusé") ? 403 : 500 }
    );
  }
}

