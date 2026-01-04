import prisma from "@/app/lib/prisma";
import { ExpenseCategory, Budget } from "@prisma/client";

export interface CreateBudgetInput {
  userId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency?: string;
  period?: string;
  startDate?: Date;
  endDate?: Date;
  alertThreshold?: number;
}

export interface UpdateBudgetInput {
  title?: string;
  category?: ExpenseCategory;
  amount?: number;
  currency?: string;
  period?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  alertThreshold?: number;
}

/**
 * Créer un nouveau budget
 */
export async function createBudget(input: CreateBudgetInput) {
  return await prisma.budget.create({
    data: {
      userId: input.userId,
      title: input.title,
      category: input.category,
      amount: input.amount,
      currency: input.currency || "EUR",
      period: input.period || "MONTHLY",
      startDate: input.startDate || new Date(),
      endDate: input.endDate || null,
      alertThreshold: input.alertThreshold || 80,
      isActive: true,
    },
  });
}

/**
 * Récupérer tous les budgets d'un utilisateur
 */
export async function getUserBudgets(userId: string, activeOnly: boolean = false) {
  const where: any = { userId };
  if (activeOnly) {
    where.isActive = true;
  }

  return await prisma.budget.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Récupérer un budget par ID
 */
export async function getBudgetById(budgetId: string, userId: string) {
  return await prisma.budget.findFirst({
    where: {
      id: budgetId,
      userId,
    },
  });
}

/**
 * Mettre à jour un budget
 */
export async function updateBudget(
  budgetId: string,
  userId: string,
  input: UpdateBudgetInput
) {
  return await prisma.budget.updateMany({
    where: {
      id: budgetId,
      userId,
    },
    data: input,
  });
}

/**
 * Supprimer un budget
 */
export async function deleteBudget(budgetId: string, userId: string) {
  return await prisma.budget.deleteMany({
    where: {
      id: budgetId,
      userId,
    },
  });
}

/**
 * Calculer les dépenses pour un budget sur une période donnée
 */
export async function getBudgetExpenses(
  userId: string,
  category: ExpenseCategory,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      category,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  let total = 0;
  for (const expense of expenses) {
    if (expense.frequency === "ONE_TIME") {
      total += expense.amount;
    } else if (expense.frequency === "DAILY") {
      // Calculer le nombre de jours dans la période
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      total += expense.amount * days;
    } else if (expense.frequency === "WEEKLY") {
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeks = Math.ceil(days / 7);
      total += expense.amount * weeks;
    } else if (expense.frequency === "MONTHLY") {
      const months = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      total += expense.amount * months;
    }
  }

  return total;
}

/**
 * Obtenir le résumé d'un budget avec progression
 */
export async function getBudgetSummary(budgetId: string, userId: string) {
  const budget = await getBudgetById(budgetId, userId);
  if (!budget) return null;

  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (budget.period === "MONTHLY") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (budget.period === "WEEKLY") {
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startDate = new Date(now.setDate(diff));
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // YEARLY
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  }

  const spent = await getBudgetExpenses(userId, budget.category, startDate, endDate);
  const remaining = budget.amount - spent;
  const percentage = (spent / budget.amount) * 100;
  const isOverBudget = spent > budget.amount;
  const shouldAlert = budget.alertThreshold && percentage >= budget.alertThreshold;

  return {
    budget,
    spent,
    remaining,
    percentage: Math.min(percentage, 100),
    isOverBudget,
    shouldAlert,
    period: {
      startDate,
      endDate,
    },
  };
}

/**
 * Obtenir tous les budgets avec leurs résumés
 */
export async function getAllBudgetSummaries(userId: string) {
  const budgets = await getUserBudgets(userId, true);
  const summaries = await Promise.all(
    budgets.map((budget: Budget) => getBudgetSummary(budget.id, userId))
  );
  return summaries.filter((s) => s !== null);
}

