import prisma from "@/app/lib/prisma";
import { BillCategory, BillStatus } from "@prisma/client";

export interface CreateBillInput {
  title: string;
  description?: string;
  category?: BillCategory;
  amount: number;
  currency?: string;
  dueDate: Date | string;
  provider?: string;
  reference?: string;
  reminderDays?: number;
  isRecurring?: boolean;
  recurrenceRule?: string;
  metadata?: Record<string, any>;
}

export interface UpdateBillInput {
  title?: string;
  description?: string;
  category?: BillCategory;
  amount?: number;
  currency?: string;
  dueDate?: Date | string;
  paidDate?: Date | string | null;
  status?: BillStatus;
  provider?: string;
  reference?: string;
  reminderDays?: number;
  isRecurring?: boolean;
  recurrenceRule?: string;
  metadata?: Record<string, any>;
}

/**
 * Crée une nouvelle facture
 */
export async function createBill(userId: string, input: CreateBillInput) {
  const dueDate = typeof input.dueDate === "string" ? new Date(input.dueDate) : input.dueDate;
  
  // Déterminer le statut initial
  let status: BillStatus = BillStatus.PENDING;
  if (dueDate < new Date()) {
    status = BillStatus.OVERDUE;
  }

  // Catégorisation automatique basée sur le titre et le provider
  const category = input.category || categorizeBill(input.title, input.provider);

  const bill = await prisma.bill.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      category,
      amount: input.amount,
      currency: input.currency || "EUR",
      dueDate,
      provider: input.provider,
      reference: input.reference,
      reminderDays: input.reminderDays || 3,
      isRecurring: input.isRecurring || false,
      recurrenceRule: input.recurrenceRule,
      status,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null,
    },
  });

  return bill;
}

/**
 * Met à jour une facture
 */
export async function updateBill(userId: string, billId: string, input: UpdateBillInput) {
  // Vérifier que la facture appartient à l'utilisateur
  const existingBill = await prisma.bill.findFirst({
    where: { id: billId, userId },
  });

  if (!existingBill) {
    throw new Error("Facture non trouvée");
  }

  const updateData: any = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.amount !== undefined) updateData.amount = input.amount;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.dueDate !== undefined) {
    updateData.dueDate = typeof input.dueDate === "string" ? new Date(input.dueDate) : input.dueDate;
  }
  if (input.paidDate !== undefined) {
    updateData.paidDate = input.paidDate === null ? null : (typeof input.paidDate === "string" ? new Date(input.paidDate) : input.paidDate);
  }
  if (input.status !== undefined) updateData.status = input.status;
  if (input.provider !== undefined) updateData.provider = input.provider;
  if (input.reference !== undefined) updateData.reference = input.reference;
  if (input.reminderDays !== undefined) updateData.reminderDays = input.reminderDays;
  if (input.isRecurring !== undefined) updateData.isRecurring = input.isRecurring;
  if (input.recurrenceRule !== undefined) updateData.recurrenceRule = input.recurrenceRule;
  if (input.metadata !== undefined) {
    updateData.metadata = input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null;
  }

  // Mettre à jour le statut automatiquement si nécessaire
  if (updateData.dueDate && !updateData.status) {
    const dueDate = typeof updateData.dueDate === "string" ? new Date(updateData.dueDate) : updateData.dueDate;
    if (dueDate < new Date() && existingBill.status === BillStatus.PENDING) {
      updateData.status = BillStatus.OVERDUE;
    }
  }

  // Si la facture est marquée comme payée, mettre à jour la date de paiement
  if (updateData.status === BillStatus.PAID && !updateData.paidDate) {
    updateData.paidDate = new Date();
  }

  const bill = await prisma.bill.update({
    where: { id: billId },
    data: updateData,
  });

  return bill;
}

/**
 * Récupère toutes les factures d'un utilisateur
 */
export async function getBills(
  userId: string,
  options?: {
    status?: BillStatus;
    category?: BillCategory;
    includePaid?: boolean;
    limit?: number;
    offset?: number;
  }
) {
  const where: any = { userId };

  if (options?.status) {
    where.status = options.status;
  } else if (!options?.includePaid) {
    where.status = { not: BillStatus.PAID };
  }

  if (options?.category) {
    where.category = options.category;
  }

  const bills = await prisma.bill.findMany({
    where,
    orderBy: { dueDate: "asc" },
    take: options?.limit,
    skip: options?.offset,
  });

  return bills;
}

/**
 * Récupère une facture par ID
 */
export async function getBillById(userId: string, billId: string) {
  const bill = await prisma.bill.findFirst({
    where: { id: billId, userId },
  });

  return bill;
}

/**
 * Supprime une facture
 */
export async function deleteBill(userId: string, billId: string) {
  const bill = await prisma.bill.findFirst({
    where: { id: billId, userId },
  });

  if (!bill) {
    throw new Error("Facture non trouvée");
  }

  await prisma.bill.delete({
    where: { id: billId },
  });

  return true;
}

/**
 * Marque une facture comme payée
 */
export async function markBillAsPaid(userId: string, billId: string, paidDate?: Date) {
  return updateBill(userId, billId, {
    status: BillStatus.PAID,
    paidDate: paidDate || new Date(),
  });
}

/**
 * Récupère les factures à venir (dans les X jours)
 */
export async function getUpcomingBills(userId: string, days: number = 7) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  const bills = await prisma.bill.findMany({
    where: {
      userId,
      status: { in: [BillStatus.PENDING, BillStatus.OVERDUE] },
      dueDate: {
        gte: today,
        lte: futureDate,
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return bills;
}

/**
 * Récupère les factures en retard
 */
export async function getOverdueBills(userId: string) {
  const today = new Date();

  const bills = await prisma.bill.findMany({
    where: {
      userId,
      status: BillStatus.OVERDUE,
      dueDate: { lt: today },
    },
    orderBy: { dueDate: "asc" },
  });

  return bills;
}

/**
 * Récupère un résumé financier
 */
export async function getFinancialSummary(userId: string, month?: number, year?: number) {
  const now = new Date();
  const startDate = month && year 
    ? new Date(year, month - 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = month && year
    ? new Date(year, month, 0)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [totalPending, totalPaid, totalOverdue, billsByCategory] = await Promise.all([
    prisma.bill.aggregate({
      where: {
        userId,
        status: BillStatus.PENDING,
        dueDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    }),
    prisma.bill.aggregate({
      where: {
        userId,
        status: BillStatus.PAID,
        paidDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    }),
    prisma.bill.aggregate({
      where: {
        userId,
        status: BillStatus.OVERDUE,
      },
      _sum: { amount: true },
    }),
    prisma.bill.groupBy({
      by: ["category"],
      where: {
        userId,
        status: { in: [BillStatus.PENDING, BillStatus.OVERDUE] },
        dueDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    totalPending: totalPending._sum.amount || 0,
    totalPaid: totalPaid._sum.amount || 0,
    totalOverdue: totalOverdue._sum.amount || 0,
    byCategory: billsByCategory.map((item) => ({
      category: item.category,
      total: item._sum.amount || 0,
      count: item._count,
    })),
  };
}

/**
 * Catégorise automatiquement une facture basée sur le titre et le provider
 */
function categorizeBill(title: string, provider?: string): BillCategory {
  const lowerTitle = title.toLowerCase();
  const lowerProvider = provider?.toLowerCase() || "";

  // Utilities
  if (
    lowerTitle.includes("edf") ||
    lowerTitle.includes("électricité") ||
    lowerTitle.includes("gaz") ||
    lowerTitle.includes("eau") ||
    lowerTitle.includes("eau") ||
    lowerProvider.includes("edf") ||
    lowerProvider.includes("engie") ||
    lowerProvider.includes("total")
  ) {
    return BillCategory.UTILITIES;
  }

  // Internet
  if (
    lowerTitle.includes("internet") ||
    lowerTitle.includes("téléphone") ||
    lowerTitle.includes("mobile") ||
    lowerProvider.includes("orange") ||
    lowerProvider.includes("sfr") ||
    lowerProvider.includes("bouygues") ||
    lowerProvider.includes("free")
  ) {
    return BillCategory.INTERNET;
  }

  // Insurance
  if (
    lowerTitle.includes("assurance") ||
    lowerTitle.includes("mutuelle") ||
    lowerProvider.includes("maif") ||
    lowerProvider.includes("macif") ||
    lowerProvider.includes("axa")
  ) {
    return BillCategory.INSURANCE;
  }

  // Subscription
  if (
    lowerTitle.includes("netflix") ||
    lowerTitle.includes("spotify") ||
    lowerTitle.includes("amazon prime") ||
    lowerTitle.includes("abonnement") ||
    lowerProvider.includes("netflix") ||
    lowerProvider.includes("spotify")
  ) {
    return BillCategory.SUBSCRIPTION;
  }

  // Rent
  if (
    lowerTitle.includes("loyer") ||
    lowerTitle.includes("rent") ||
    lowerProvider.includes("loyer")
  ) {
    return BillCategory.RENT;
  }

  // Taxes
  if (
    lowerTitle.includes("impôt") ||
    lowerTitle.includes("taxe") ||
    lowerTitle.includes("tax")
  ) {
    return BillCategory.TAXES;
  }

  // Health
  if (
    lowerTitle.includes("santé") ||
    lowerTitle.includes("médecin") ||
    lowerTitle.includes("pharmacie")
  ) {
    return BillCategory.HEALTH;
  }

  // Transport
  if (
    lowerTitle.includes("transport") ||
    lowerTitle.includes("carburant") ||
    lowerTitle.includes("essence")
  ) {
    return BillCategory.TRANSPORT;
  }

  // Education
  if (
    lowerTitle.includes("école") ||
    lowerTitle.includes("université") ||
    lowerTitle.includes("formation")
  ) {
    return BillCategory.EDUCATION;
  }

  return BillCategory.OTHER;
}

/**
 * Met à jour automatiquement le statut des factures (appelé périodiquement)
 */
export async function updateBillsStatus(userId?: string) {
  const today = new Date();
  const where: any = {
    status: { in: [BillStatus.PENDING, BillStatus.OVERDUE] },
    dueDate: { lt: today },
  };

  if (userId) {
    where.userId = userId;
  }

  await prisma.bill.updateMany({
    where,
    data: {
      status: BillStatus.OVERDUE,
    },
  });
}

