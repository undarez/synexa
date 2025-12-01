import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import {
  createIncome,
  getIncomes,
  getMonthlyIncome,
} from "@/app/lib/finance/income";

/**
 * GET - Récupère les revenus de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);

    const activeOnly = searchParams.get("activeOnly") === "true";
    const monthly = searchParams.get("monthly") === "true";
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;

    if (monthly) {
      const total = await getMonthlyIncome(user.id, month, year);
      return NextResponse.json({ total });
    }

    const incomes = await getIncomes(user.id, { activeOnly });

    return NextResponse.json(incomes);
  } catch (error) {
    console.error("[GET /api/finance/income]", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des revenus" },
      { status: 500 }
    );
  }
}

/**
 * POST - Crée un nouveau revenu
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const {
      title,
      amount,
      currency,
      frequency,
      startDate,
      endDate,
      isActive,
      metadata,
    } = body;

    if (!title || !amount) {
      return NextResponse.json(
        { error: "Titre et montant sont requis" },
        { status: 400 }
      );
    }

    const income = await createIncome(user.id, {
      title,
      amount: parseFloat(amount),
      currency,
      frequency,
      startDate,
      endDate,
      isActive,
      metadata,
    });

    return NextResponse.json(income, { status: 201 });
  } catch (error) {
    console.error("[POST /api/finance/income]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la création du revenu" },
      { status: 500 }
    );
  }
}


