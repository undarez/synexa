import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import {
  createBudget,
  getUserBudgets,
  getAllBudgetSummaries,
} from "@/app/lib/finance/budgets";

/**
 * GET /api/finance/budgets
 * Récupérer tous les budgets de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const withSummary = searchParams.get("withSummary") === "true";

    if (withSummary) {
      const summaries = await getAllBudgetSummaries(user.id);
      return NextResponse.json(summaries);
    }

    const budgets = await getUserBudgets(user.id, activeOnly);
    return NextResponse.json(budgets);
  } catch (error) {
    console.error("Erreur lors de la récupération des budgets:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des budgets" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/budgets
 * Créer un nouveau budget
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    const body = await request.json();
    const { title, category, amount, currency, period, startDate, endDate, alertThreshold } =
      body;

    if (!title || !category || !amount) {
      return NextResponse.json(
        { error: "Titre, catégorie et montant sont requis" },
        { status: 400 }
      );
    }

    const budget = await createBudget({
      userId: user.id,
      title,
      category,
      amount: parseFloat(amount),
      currency,
      period,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      alertThreshold: alertThreshold ? parseFloat(alertThreshold) : undefined,
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du budget:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du budget" },
      { status: 500 }
    );
  }
}

