import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import prisma from "@/app/lib/prisma";
import { getDefaultWidgets } from "@/app/lib/dashboard/widgets";

/**
 * GET /api/dashboard/widgets
 * Récupère les widgets configurés pour l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    const widgets = await prisma.dashboardWidget.findMany({
      where: { userId: user.id },
      orderBy: { position: "asc" },
    });

    // Si aucun widget, créer les widgets par défaut
    if (widgets.length === 0) {
      const defaultWidgets = getDefaultWidgets();
      const createdWidgets = await Promise.all(
        defaultWidgets.map((widget) =>
          prisma.dashboardWidget.create({
            data: {
              userId: user.id,
              widgetType: widget.widgetType,
              position: widget.position,
              column: widget.column,
              row: widget.row,
              size: widget.size,
              visible: widget.visible ?? true, // S'assurer que visible est true par défaut
              config: widget.config || {},
            },
          })
        )
      );
      return NextResponse.json({ widgets: createdWidgets });
    }
    
    // S'assurer que tous les widgets par défaut existent (pour les utilisateurs existants)
    const defaultWidgets = getDefaultWidgets();
    const existingWidgetTypes = new Set(widgets.map(w => w.widgetType));
    const missingWidgets = defaultWidgets.filter(w => !existingWidgetTypes.has(w.widgetType));
    
    if (missingWidgets.length > 0) {
      const createdWidgets = await Promise.all(
        missingWidgets.map((widget) =>
          prisma.dashboardWidget.create({
            data: {
              userId: user.id,
              widgetType: widget.widgetType,
              position: widget.position,
              column: widget.column,
              row: widget.row,
              size: widget.size,
              visible: widget.visible ?? true,
              config: widget.config || {},
            },
          })
        )
      );
      widgets.push(...createdWidgets);
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
    const body = await request.json();
    const { widgetType, position, column, row, size, visible, config } = body;

    if (!widgetType) {
      return NextResponse.json(
        { error: "widgetType est requis" },
        { status: 400 }
      );
    }

    const widget = await prisma.dashboardWidget.upsert({
      where: {
        userId_widgetType: {
          userId: user.id,
          widgetType,
        },
      },
      update: {
        position: position ?? undefined,
        column: column ?? undefined,
        row: row ?? undefined,
        size: size ?? undefined,
        visible: visible ?? undefined,
        config: config ?? undefined,
      },
      create: {
        userId: user.id,
        widgetType,
        position: position ?? 0,
        column: column ?? 1,
        row: row ?? 1,
        size: size ?? "medium",
        visible: visible ?? true,
        config: config || {},
      },
    });

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
    const body = await request.json();
    const { widgets } = body;

    if (!Array.isArray(widgets)) {
      return NextResponse.json(
        { error: "widgets doit être un tableau" },
        { status: 400 }
      );
    }

    const updatedWidgets = await Promise.all(
      widgets.map((widget: any) =>
        prisma.dashboardWidget.update({
          where: {
            userId_widgetType: {
              userId: user.id,
              widgetType: widget.widgetType,
            },
          },
          data: {
            position: widget.position,
            column: widget.column,
            row: widget.row,
            size: widget.size,
            visible: widget.visible,
            config: widget.config || {},
          },
        })
      )
    );

    return NextResponse.json({ widgets: updatedWidgets });
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
    const searchParams = request.nextUrl.searchParams;
    const widgetType = searchParams.get("widgetType");

    if (!widgetType) {
      return NextResponse.json(
        { error: "widgetType est requis" },
        { status: 400 }
      );
    }

    await prisma.dashboardWidget.delete({
      where: {
        userId_widgetType: {
          userId: user.id,
          widgetType,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Dashboard Widgets API] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du widget" },
      { status: 500 }
    );
  }
}





