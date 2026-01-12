import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/mock";
import { supabase } from "@/app/lib/supabase/client";
import { getDefaultWidgets, type WidgetConfig } from "@/app/lib/dashboard/widgets";

/**
 * GET /api/dashboard/widgets
 * Récupère les widgets configurés pour l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const userId = user.id;

    // Récupérer les widgets avec Supabase
    const { data: widgets, error } = await supabase
      .from('DashboardWidget')
      .select('*')
      .eq('userId', userId)
      .order('position', { ascending: true });

    if (error) {
      console.error("[Dashboard Widgets] Erreur Supabase:", error);
      // Retourner des widgets par défaut si Supabase échoue
      const defaultWidgets = getDefaultWidgets();
      return NextResponse.json({ widgets: defaultWidgets });
    }

    // Si aucun widget, retourner les widgets par défaut
    if (!widgets || widgets.length === 0) {
      const defaultWidgets = getDefaultWidgets();
      // Créer les widgets par défaut dans Supabase
      const now = new Date().toISOString();
      const widgetsToCreate = defaultWidgets.map((widget: WidgetConfig) => ({
        id: crypto.randomUUID(),
        userId,
        widgetType: widget.widgetType,
        position: widget.position,
        column: widget.column,
        row: widget.row,
        size: widget.size,
        visible: widget.visible ?? true,
        config: widget.config || {},
        createdAt: now,
        updatedAt: now,
      }));

      // @ts-ignore - Supabase infère 'never' mais les données sont valides
      const { data: createdWidgets, error: createError } = await supabase
        .from('DashboardWidget')
        .insert(widgetsToCreate as any)
        .select();

      if (createError) {
        console.error("[Dashboard Widgets] Erreur création widgets par défaut:", createError);
        return NextResponse.json({ widgets: defaultWidgets });
      }

      return NextResponse.json({ widgets: createdWidgets || defaultWidgets });
    }

    // Vérifier si des widgets par défaut manquent
    const defaultWidgets = getDefaultWidgets();
    const existingWidgetTypes = new Set(widgets.map((w: any) => w.widgetType));
    const missingWidgets = defaultWidgets.filter((w: WidgetConfig) => !existingWidgetTypes.has(w.widgetType));

    if (missingWidgets.length > 0) {
      // Créer les widgets manquants
      const now = new Date().toISOString();
      const widgetsToCreate = missingWidgets.map((widget: WidgetConfig) => ({
        id: crypto.randomUUID(),
        userId,
        widgetType: widget.widgetType,
        position: widget.position,
        column: widget.column,
        row: widget.row,
        size: widget.size,
        visible: widget.visible ?? true,
        config: widget.config || {},
        createdAt: now,
        updatedAt: now,
      }));

      // @ts-ignore - Supabase infère 'never' mais les données sont valides
      const { data: newWidgets, error: newWidgetsError } = await supabase
        .from('DashboardWidget')
        .insert(widgetsToCreate as any)
        .select();

      if (!newWidgetsError && newWidgets) {
        widgets.push(...newWidgets);
      }
    }

    return NextResponse.json({ widgets });
  } catch (error) {
    console.error("[Dashboard Widgets API] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des widgets" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/widgets
 * Crée ou met à jour un widget
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const userId = user.id;
    const body = await request.json();
    const { widgetType, position, column, row, size, visible, config } = body;

    if (!widgetType) {
      return NextResponse.json(
        { error: "widgetType est requis" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    
    // Vérifier si le widget existe déjà
    type ExistingWidget = { id: string };
    const { data: existingWidget } = await supabase
      .from('DashboardWidget')
      .select('id')
      .eq('userId', userId)
      .eq('widgetType', widgetType)
      .single();
    
    const typedExistingWidget = existingWidget as ExistingWidget | null;
    
    // Utiliser upsert pour créer ou mettre à jour
    // @ts-ignore - Supabase infère 'never' mais les données sont valides
    const { data: widget, error } = await supabase
      .from('DashboardWidget')
      .upsert({
        id: typedExistingWidget?.id || crypto.randomUUID(),
        userId,
        widgetType,
        position: position ?? 0,
        column: column ?? 1,
        row: row ?? 1,
        size: size ?? "medium",
        visible: visible ?? true,
        config: config || {},
        createdAt: typedExistingWidget?.id ? undefined : now,
        updatedAt: now,
      } as any, {
        onConflict: 'userId,widgetType',
      })
      .select()
      .single();

    if (error || !widget) {
      console.error('[POST /dashboard/widgets] Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde du widget', details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ widget });
  } catch (error) {
    console.error("[Dashboard Widgets API] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde du widget" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/dashboard/widgets
 * Met à jour plusieurs widgets (pour réorganiser)
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser();
    const userId = user.id;
    const body = await request.json();
    const { widgets } = body;

    if (!Array.isArray(widgets)) {
      return NextResponse.json(
        { error: "widgets doit être un tableau" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    
    // Récupérer les IDs existants pour chaque widget
    const widgetTypes = widgets.map((w: any) => w.widgetType);
    const { data: existingWidgets } = await supabase
      .from('DashboardWidget')
      .select('id, widgetType')
      .eq('userId', userId)
      .in('widgetType', widgetTypes);
    
    const existingWidgetMap = new Map(
      (existingWidgets || []).map((w: any) => [w.widgetType, w.id])
    );
    
    // Mettre à jour tous les widgets
    const widgetsToUpdate = widgets.map((widget: any) => ({
      id: widget.id || existingWidgetMap.get(widget.widgetType) || crypto.randomUUID(),
      userId,
      widgetType: widget.widgetType,
      position: widget.position,
      column: widget.column,
      row: widget.row,
      size: widget.size,
      visible: widget.visible,
      config: widget.config || {},
      createdAt: (widget.id || existingWidgetMap.has(widget.widgetType)) ? undefined : now,
      updatedAt: now,
    }));

    // @ts-ignore - Supabase infère 'never' mais les données sont valides
    const { data: updatedWidgets, error } = await supabase
      .from('DashboardWidget')
      .upsert(widgetsToUpdate as any, {
        onConflict: 'userId,widgetType',
      })
      .select();

    if (error) {
      console.error('[PUT /dashboard/widgets] Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des widgets', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ widgets: updatedWidgets || widgets });
  } catch (error) {
    console.error("[Dashboard Widgets API] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des widgets" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dashboard/widgets
 * Supprime un widget
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    const userId = user.id;
    const searchParams = request.nextUrl.searchParams;
    const widgetType = searchParams.get("widgetType");

    if (!widgetType) {
      return NextResponse.json(
        { error: "widgetType est requis" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('DashboardWidget')
      .delete()
      .eq('userId', userId)
      .eq('widgetType', widgetType);

    if (error) {
      console.error('[DELETE /dashboard/widgets] Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du widget', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Dashboard Widgets API] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du widget" },
      { status: 500 }
    );
  }
}





