import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import {
  getBudgetById,
  updateBudget,
  deleteBudget,
  getBudgetSummary,
} from "@/app/lib/finance/budgets";

/**
 * GET /api/finance/budgets/[budgetId]
 * Récupérer un budget par ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  try {
    const user = await requireUser();

    const { budgetId } = await params;
    const { searchParams } = new URL(request.url);
    const withSummary = searchParams.get("withSummary") === "true";

    if (withSummary) {
      const summary = await getBudgetSummary(budgetId, user.id);
      if (!summary) {
        return NextResponse.json({ error: "Budget non trouvé" }, { status: 404 });
      }
      return NextResponse.json(summary);
    }

    const budget = await getBudgetById(budgetId, user.id);
    if (!budget) {
      return NextResponse.json({ error: "Budget non trouvé" }, { status: 404 });
    }

    return NextResponse.json(budget);
  } catch (error) {
    console.error("Erreur lors de la récupération du budget:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du budget" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/finance/budgets/[budgetId]
 * Mettre à jour un budget
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  try {
    const user = await requireUser();

    const { budgetId } = await params;
    const body = await request.json();

    const result = await updateBudget(budgetId, user.id, body);
    if (result.count === 0) {
      return NextResponse.json({ error: "Budget non trouvé" }, { status: 404 });
    }

    const updatedBudget = await getBudgetById(budgetId, user.id);
    return NextResponse.json(updatedBudget);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du budget:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du budget" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/budgets/[budgetId]
 * Supprimer un budget
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  try {
    const user = await requireUser();

    const { budgetId } = await params;
    const result = await deleteBudget(budgetId, user.id);
    if (result.count === 0) {
      return NextResponse.json({ error: "Budget non trouvé" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression du budget:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du budget" },
      { status: 500 }
    );
  }
}

