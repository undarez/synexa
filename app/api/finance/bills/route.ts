import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import {
  createBill,
  getBills,
  getFinancialSummary,
  getUpcomingBills,
  getOverdueBills,
  updateBillsStatus,
} from "@/app/lib/finance/bills";
import { BillStatus, BillCategory } from "@prisma/client";

/**
 * GET - Récupère les factures de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") as BillStatus | null;
    const category = searchParams.get("category") as BillCategory | null;
    const includePaid = searchParams.get("includePaid") === "true";
    const upcoming = searchParams.get("upcoming") === "true";
    const overdue = searchParams.get("overdue") === "true";
    const summary = searchParams.get("summary") === "true";
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;

    // Résumé financier
    if (summary) {
      const financialSummary = await getFinancialSummary(user.id, month, year);
      return NextResponse.json(financialSummary);
    }

    // Factures à venir
    if (upcoming) {
      const days = searchParams.get("days") ? parseInt(searchParams.get("days")!) : 7;
      const bills = await getUpcomingBills(user.id, days);
      return NextResponse.json(bills);
    }

    // Factures en retard
    if (overdue) {
      const bills = await getOverdueBills(user.id);
      return NextResponse.json(bills);
    }

    // Liste normale
    const bills = await getBills(user.id, {
      status: status || undefined,
      category: category || undefined,
      includePaid,
    });

    return NextResponse.json(bills);
  } catch (error) {
    console.error("[GET /api/finance/bills]", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des factures" },
      { status: 500 }
    );
  }
}

/**
 * POST - Crée une nouvelle facture
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
      dueDate,
      provider,
      reference,
      reminderDays,
      isRecurring,
      recurrenceRule,
      metadata,
    } = body;

    if (!title || !amount || !dueDate) {
      return NextResponse.json(
        { error: "Titre, montant et date d'échéance sont requis" },
        { status: 400 }
      );
    }

    const bill = await createBill(user.id, {
      title,
      description,
      category,
      amount: parseFloat(amount),
      currency,
      dueDate,
      provider,
      reference,
      reminderDays,
      isRecurring,
      recurrenceRule,
      metadata,
    });

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error("[POST /api/finance/bills]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la création de la facture" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Met à jour le statut des factures (tâche de maintenance)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    
    // Mettre à jour le statut des factures en retard
    await updateBillsStatus(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/finance/bills]", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des factures" },
      { status: 500 }
    );
  }
}


