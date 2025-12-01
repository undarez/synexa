import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import {
  getIncomeById,
  updateIncome,
  deleteIncome,
} from "@/app/lib/finance/income";

/**
 * GET - Récupère un revenu par ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ incomeId: string }> }
) {
  try {
    const user = await requireUser();
    const { incomeId } = await params;

    const income = await getIncomeById(user.id, incomeId);

    if (!income) {
      return NextResponse.json({ error: "Revenu non trouvé" }, { status: 404 });
    }

    return NextResponse.json(income);
  } catch (error) {
    console.error("[GET /api/finance/income/[incomeId]]", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du revenu" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Met à jour un revenu
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ incomeId: string }> }
) {
  try {
    const user = await requireUser();
    const { incomeId } = await params;
    const body = await request.json();

    const income = await updateIncome(user.id, incomeId, body);

    return NextResponse.json(income);
  } catch (error) {
    console.error("[PUT /api/finance/income/[incomeId]]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la mise à jour du revenu" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Supprime un revenu
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ incomeId: string }> }
) {
  try {
    const user = await requireUser();
    const { incomeId } = await params;

    await deleteIncome(user.id, incomeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/finance/income/[incomeId]]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la suppression du revenu" },
      { status: 500 }
    );
  }
}


