import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import {
  createExpense,
  getExpenses,
  getMonthlyExpenses,
  getExpensesByCategory,
} from "@/app/lib/finance/expenses";
import { ExpenseCategory, ExpenseFrequency } from "@prisma/client";

/**
 * GET - Récupère les dépenses de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category") as ExpenseCategory | null;
    const frequency = searchParams.get("frequency") as ExpenseFrequency | null;
    const monthly = searchParams.get("monthly") === "true";
    const byCategory = searchParams.get("byCategory") === "true";
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;

    if (monthly) {
      const total = await getMonthlyExpenses(user.id, month, year);
      return NextResponse.json({ total });
    }

    if (byCategory) {
      const summary = await getExpensesByCategory(user.id, month, year);
      return NextResponse.json(summary);
    }

    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;

    const expenses = await getExpenses(user.id, {
      category: category || undefined,
      frequency: frequency || undefined,
      startDate,
      endDate,
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("[GET /api/finance/expenses]", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des dépenses" },
      { status: 500 }
    );
  }
}

/**
 * POST - Crée une nouvelle dépense
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const {
      title,
      description,
      category,
      amount,
      currency,
      frequency,
      date,
      isRecurring,
      recurrenceRule,
      metadata,
    } = body;

    if (!title || !amount) {
      return NextResponse.json(
        { error: "Titre et montant sont requis" },
        { status: 400 }
      );
    }

    const expense = await createExpense(user.id, {
      title,
      description,
      category,
      amount: parseFloat(amount),
      currency,
      frequency,
      date,
      isRecurring,
      recurrenceRule,
      metadata,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("[POST /api/finance/expenses]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la création de la dépense" },
      { status: 500 }
    );
  }
}


