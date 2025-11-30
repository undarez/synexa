import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import {
  getExpenseById,
  updateExpense,
  deleteExpense,
} from "@/app/lib/finance/expenses";

/**
 * GET - Récupère une dépense par ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const user = await requireUser();
    const { expenseId } = await params;

    const expense = await getExpenseById(user.id, expenseId);

    if (!expense) {
      return NextResponse.json({ error: "Dépense non trouvée" }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error("[GET /api/finance/expenses/[expenseId]]", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la dépense" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Met à jour une dépense
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const user = await requireUser();
    const { expenseId } = await params;
    const body = await request.json();

    const expense = await updateExpense(user.id, expenseId, body);

    return NextResponse.json(expense);
  } catch (error) {
    console.error("[PUT /api/finance/expenses/[expenseId]]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la mise à jour de la dépense" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Supprime une dépense
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const user = await requireUser();
    const { expenseId } = await params;

    await deleteExpense(user.id, expenseId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/finance/expenses/[expenseId]]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la suppression de la dépense" },
      { status: 500 }
    );
  }
}

