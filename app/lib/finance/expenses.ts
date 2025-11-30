import prisma from "@/app/lib/prisma";
import { ExpenseCategory, ExpenseFrequency } from "@prisma/client";

export interface CreateExpenseInput {
  title: string;
  description?: string;
  category?: ExpenseCategory;
  amount: number;
  currency?: string;
  frequency?: ExpenseFrequency;
  date?: Date | string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  metadata?: Record<string, any>;
}

export interface UpdateExpenseInput {
  title?: string;
  description?: string;
  category?: ExpenseCategory;
  amount?: number;
  currency?: string;
  frequency?: ExpenseFrequency;
  date?: Date | string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  metadata?: Record<string, any>;
}

/**
 * Crée une nouvelle dépense
 */
export async function createExpense(userId: string, input: CreateExpenseInput) {
  const date = input.date ? (typeof input.date === "string" ? new Date(input.date) : input.date) : new Date();
  
  // Catégorisation automatique
  const category = input.category || categorizeExpense(input.title);

  const expense = await prisma.expense.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      category,
      amount: input.amount,
      currency: input.currency || "EUR",
      frequency: input.frequency || ExpenseFrequency.ONE_TIME,
      date,
      isRecurring: input.isRecurring || false,
      recurrenceRule: input.recurrenceRule,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null,
    },
  });

  return expense;
}

/**
 * Met à jour une dépense
 */
export async function updateExpense(userId: string, expenseId: string, input: UpdateExpenseInput) {
  const existingExpense = await prisma.expense.findFirst({
    where: { id: expenseId, userId },
  });

  if (!existingExpense) {
    throw new Error("Dépense non trouvée");
  }

  const updateData: any = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.amount !== undefined) updateData.amount = input.amount;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.frequency !== undefined) updateData.frequency = input.frequency;
  if (input.date !== undefined) {
    updateData.date = typeof input.date === "string" ? new Date(input.date) : input.date;
  }
  if (input.isRecurring !== undefined) updateData.isRecurring = input.isRecurring;
  if (input.recurrenceRule !== undefined) updateData.recurrenceRule = input.recurrenceRule;
  if (input.metadata !== undefined) {
    updateData.metadata = input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null;
  }

  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: updateData,
  });

  return expense;
}

/**
 * Récupère toutes les dépenses d'un utilisateur
 */
export async function getExpenses(
  userId: string,
  options?: {
    category?: ExpenseCategory;
    frequency?: ExpenseFrequency;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
) {
  const where: any = { userId };

  if (options?.category) {
    where.category = options.category;
  }

  if (options?.frequency) {
    where.frequency = options.frequency;
  }

  if (options?.startDate || options?.endDate) {
    where.date = {};
    if (options.startDate) where.date.gte = options.startDate;
    if (options.endDate) where.date.lte = options.endDate;
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
    take: options?.limit,
    skip: options?.offset,
  });

  return expenses;
}

/**
 * Récupère une dépense par ID
 */
export async function getExpenseById(userId: string, expenseId: string) {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, userId },
  });

  return expense;
}

/**
 * Supprime une dépense
 */
export async function deleteExpense(userId: string, expenseId: string) {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, userId },
  });

  if (!expense) {
    throw new Error("Dépense non trouvée");
  }

  await prisma.expense.delete({
    where: { id: expenseId },
  });

  return true;
}

/**
 * Calcule les dépenses mensuelles totales
 */
export async function getMonthlyExpenses(userId: string, month?: number, year?: number) {
  const now = new Date();
  const startDate = month && year 
    ? new Date(year, month - 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = month && year
    ? new Date(year, month, 0, 23, 59, 59, 999)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Récupérer toutes les dépenses du mois (non récurrentes)
  const monthlyExpenses = await prisma.expense.findMany({
    where: {
      userId,
      isRecurring: false,
      date: { gte: startDate, lte: endDate },
    },
  });

  // Récupérer les dépenses récurrentes actives
  const recurringExpenses = await prisma.expense.findMany({
    where: {
      userId,
      isRecurring: true,
      frequency: { in: [ExpenseFrequency.DAILY, ExpenseFrequency.WEEKLY, ExpenseFrequency.MONTHLY] },
    },
  });

  let total = 0;

  // Ajouter toutes les dépenses non récurrentes du mois
  for (const expense of monthlyExpenses) {
    total += expense.amount;
  }

  // Ajouter les dépenses récurrentes (calculées pour le mois)
  for (const expense of recurringExpenses) {
    if (expense.frequency === ExpenseFrequency.DAILY) {
      const daysInMonth = endDate.getDate();
      total += expense.amount * daysInMonth;
    } else if (expense.frequency === ExpenseFrequency.WEEKLY) {
      // Calculer le nombre de semaines dans le mois
      const weeksInMonth = Math.ceil(endDate.getDate() / 7);
      total += expense.amount * weeksInMonth;
    } else if (expense.frequency === ExpenseFrequency.MONTHLY) {
      total += expense.amount;
    }
  }

  return total;
}

/**
 * Récupère un résumé des dépenses par catégorie
 */
export async function getExpensesByCategory(userId: string, month?: number, year?: number) {
  const now = new Date();
  const startDate = month && year 
    ? new Date(year, month - 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = month && year
    ? new Date(year, month, 0)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const expenses = await prisma.expense.groupBy({
    by: ["category"],
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
    _count: true,
  });

  return expenses.map((item) => ({
    category: item.category,
    total: item._sum.amount || 0,
    count: item._count,
  }));
}

/**
 * Catégorise automatiquement une dépense
 */
function categorizeExpense(title: string): ExpenseCategory {
  const lowerTitle = title.toLowerCase();

  if (
    lowerTitle.includes("restaurant") ||
    lowerTitle.includes("repas") ||
    lowerTitle.includes("food") ||
    lowerTitle.includes("supermarché") ||
    lowerTitle.includes("courses") ||
    lowerTitle.includes("alimentation")
  ) {
    return ExpenseCategory.FOOD;
  }

  if (
    lowerTitle.includes("transport") ||
    lowerTitle.includes("carburant") ||
    lowerTitle.includes("essence") ||
    lowerTitle.includes("metro") ||
    lowerTitle.includes("bus") ||
    lowerTitle.includes("train")
  ) {
    return ExpenseCategory.TRANSPORT;
  }

  if (
    lowerTitle.includes("shopping") ||
    lowerTitle.includes("achat") ||
    lowerTitle.includes("magasin")
  ) {
    return ExpenseCategory.SHOPPING;
  }

  if (
    lowerTitle.includes("cinema") ||
    lowerTitle.includes("loisir") ||
    lowerTitle.includes("sortie") ||
    lowerTitle.includes("concert") ||
    lowerTitle.includes("spectacle")
  ) {
    return ExpenseCategory.ENTERTAINMENT;
  }

  if (
    lowerTitle.includes("pharmacie") ||
    lowerTitle.includes("médecin") ||
    lowerTitle.includes("santé") ||
    lowerTitle.includes("mutuelle")
  ) {
    return ExpenseCategory.HEALTH;
  }

  if (
    lowerTitle.includes("formation") ||
    lowerTitle.includes("cours") ||
    lowerTitle.includes("école") ||
    lowerTitle.includes("université")
  ) {
    return ExpenseCategory.EDUCATION;
  }

  if (
    lowerTitle.includes("vêtement") ||
    lowerTitle.includes("habillement") ||
    lowerTitle.includes("vetement")
  ) {
    return ExpenseCategory.CLOTHING;
  }

  if (
    lowerTitle.includes("maison") ||
    lowerTitle.includes("décoration") ||
    lowerTitle.includes("ameublement")
  ) {
    return ExpenseCategory.HOME;
  }

  if (
    lowerTitle.includes("coiffeur") ||
    lowerTitle.includes("soin") ||
    lowerTitle.includes("beauté")
  ) {
    return ExpenseCategory.PERSONAL;
  }

  return ExpenseCategory.OTHER;
}

