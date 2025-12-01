import prisma from "@/app/lib/prisma";

export interface CreateIncomeInput {
  title: string;
  amount: number;
  currency?: string;
  frequency?: string;
  startDate?: Date | string;
  endDate?: Date | string | null;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateIncomeInput {
  title?: string;
  amount?: number;
  currency?: string;
  frequency?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Crée un nouveau revenu (salaire)
 */
export async function createIncome(userId: string, input: CreateIncomeInput) {
  const income = await prisma.income.create({
    data: {
      userId,
      title: input.title,
      amount: input.amount,
      currency: input.currency || "EUR",
      frequency: input.frequency || "MONTHLY",
      startDate: input.startDate ? (typeof input.startDate === "string" ? new Date(input.startDate) : input.startDate) : null,
      endDate: input.endDate ? (typeof input.endDate === "string" ? new Date(input.endDate) : input.endDate) : null,
      isActive: input.isActive !== undefined ? input.isActive : true,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null,
    },
  });

  return income;
}

/**
 * Met à jour un revenu
 */
export async function updateIncome(userId: string, incomeId: string, input: UpdateIncomeInput) {
  const existingIncome = await prisma.income.findFirst({
    where: { id: incomeId, userId },
  });

  if (!existingIncome) {
    throw new Error("Revenu non trouvé");
  }

  const updateData: any = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.amount !== undefined) updateData.amount = input.amount;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.frequency !== undefined) updateData.frequency = input.frequency;
  if (input.startDate !== undefined) {
    updateData.startDate = input.startDate === null ? null : (typeof input.startDate === "string" ? new Date(input.startDate) : input.startDate);
  }
  if (input.endDate !== undefined) {
    updateData.endDate = input.endDate === null ? null : (typeof input.endDate === "string" ? new Date(input.endDate) : input.endDate);
  }
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (input.metadata !== undefined) {
    updateData.metadata = input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null;
  }

  const income = await prisma.income.update({
    where: { id: incomeId },
    data: updateData,
  });

  return income;
}

/**
 * Récupère tous les revenus d'un utilisateur
 */
export async function getIncomes(userId: string, options?: { activeOnly?: boolean }) {
  const where: any = { userId };

  if (options?.activeOnly) {
    where.isActive = true;
  }

  const incomes = await prisma.income.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return incomes;
}

/**
 * Récupère un revenu par ID
 */
export async function getIncomeById(userId: string, incomeId: string) {
  const income = await prisma.income.findFirst({
    where: { id: incomeId, userId },
  });

  return income;
}

/**
 * Supprime un revenu
 */
export async function deleteIncome(userId: string, incomeId: string) {
  const income = await prisma.income.findFirst({
    where: { id: incomeId, userId },
  });

  if (!income) {
    throw new Error("Revenu non trouvé");
  }

  await prisma.income.delete({
    where: { id: incomeId },
  });

  return true;
}

/**
 * Calcule le revenu mensuel total
 */
export async function getMonthlyIncome(userId: string, month?: number, year?: number) {
  const now = new Date();
  const targetMonth = month || now.getMonth() + 1;
  const targetYear = year || now.getFullYear();

  const activeIncomes = await prisma.income.findMany({
    where: {
      userId,
      isActive: true,
    },
  });

  let totalMonthly = 0;

  for (const income of activeIncomes) {
    if (income.frequency === "MONTHLY") {
      totalMonthly += income.amount;
    } else if (income.frequency === "WEEKLY") {
      totalMonthly += income.amount * 4.33; // Approximation
    } else if (income.frequency === "YEARLY") {
      totalMonthly += income.amount / 12;
    } else if (income.frequency === "ONE_TIME") {
      // Vérifier si le revenu unique est dans ce mois
      if (income.startDate) {
        const incomeDate = new Date(income.startDate);
        if (incomeDate.getMonth() + 1 === targetMonth && incomeDate.getFullYear() === targetYear) {
          totalMonthly += income.amount;
        }
      }
    }
  }

  return totalMonthly;
}


