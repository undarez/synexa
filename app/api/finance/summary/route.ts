import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { getMonthlyIncome } from "@/app/lib/finance/income";
import { getMonthlyExpenses } from "@/app/lib/finance/expenses";

/**
 * GET /api/finance/summary
 * Récupère un résumé financier pour le mois en cours
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [monthlyIncome, monthlyExpenses] = await Promise.all([
      getMonthlyIncome(user.id, year, month),
      getMonthlyExpenses(user.id, year, month),
    ]);

    return NextResponse.json({
      monthlyIncome: monthlyIncome || 0,
      monthlyExpenses: monthlyExpenses || 0,
      balance: (monthlyIncome || 0) - (monthlyExpenses || 0),
      year,
      month,
    });
  } catch (error) {
    console.error("[Finance Summary API] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du résumé" },
      { status: 500 }
    );
  }
}





