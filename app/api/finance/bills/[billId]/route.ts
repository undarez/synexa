import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import {
  getBillById,
  updateBill,
  deleteBill,
  markBillAsPaid,
} from "@/app/lib/finance/bills";

/**
 * GET - Récupère une facture par ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const user = await requireUser();
    const { billId } = await params;

    const bill = await getBillById(user.id, billId);

    if (!bill) {
      return NextResponse.json({ error: "Facture non trouvée" }, { status: 404 });
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error("[GET /api/finance/bills/[billId]]", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la facture" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Met à jour une facture
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const user = await requireUser();
    const { billId } = await params;
    const body = await request.json();

    const bill = await updateBill(user.id, billId, body);

    return NextResponse.json(bill);
  } catch (error) {
    console.error("[PUT /api/finance/bills/[billId]]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la mise à jour de la facture" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Supprime une facture
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const user = await requireUser();
    const { billId } = await params;

    await deleteBill(user.id, billId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/finance/bills/[billId]]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la suppression de la facture" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Marque une facture comme payée
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const user = await requireUser();
    const { billId } = await params;
    const body = await request.json();

    const paidDate = body.paidDate ? new Date(body.paidDate) : undefined;
    const bill = await markBillAsPaid(user.id, billId, paidDate);

    return NextResponse.json(bill);
  } catch (error) {
    console.error("[PATCH /api/finance/bills/[billId]]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors du paiement de la facture" },
      { status: 500 }
    );
  }
}

