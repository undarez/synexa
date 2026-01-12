import { supabase } from "@/app/lib/supabase/client";
import { ExpenseCategory, ExpenseFrequency } from "@/app/lib/supabase/types";

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

  const now = new Date().toISOString();
  const { data: expense, error } = await supabase
    .from('Expense')
    .insert({
      userId,
      title: input.title,
      description: input.description || null,
      category,
      amount: input.amount,
      currency: input.currency || "EUR",
      frequency: input.frequency || ExpenseFrequency.ONE_TIME,
      date: date.toISOString(),
      isRecurring: input.isRecurring || false,
      recurrenceRule: input.recurrenceRule || null,
      metadata: input.metadata || null,
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single();

  if (error || !expense) {
    throw new Error(`Erreur lors de la création de la dépense: ${error?.message}`);
  }

  return expense;
}

/**
 * Met à jour une dépense
 */
export async function updateExpense(userId: string, expenseId: string, input: UpdateExpenseInput) {
  const { data: existingExpense, error: fetchError } = await supabase
    .from('Expense')
    .select('*')
    .eq('id', expenseId)
    .eq('userId', userId)
    .single();

  if (fetchError || !existingExpense) {
    throw new Error("Dépense non trouvée");
  }

  const updateData: {
    title?: string;
    description?: string | null;
    category?: ExpenseCategory;
    amount?: number;
    currency?: string;
    frequency?: ExpenseFrequency;
    date?: string;
    isRecurring?: boolean;
    recurrenceRule?: string | null;
    metadata?: any;
    updatedAt: string;
  } = {
    updatedAt: new Date().toISOString(),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.amount !== undefined) updateData.amount = input.amount;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.frequency !== undefined) updateData.frequency = input.frequency;
  if (input.date !== undefined) {
    updateData.date = typeof input.date === "string" ? new Date(input.date).toISOString() : input.date.toISOString();
  }
  if (input.isRecurring !== undefined) updateData.isRecurring = input.isRecurring;
  if (input.recurrenceRule !== undefined) updateData.recurrenceRule = input.recurrenceRule;
  if (input.metadata !== undefined) {
    updateData.metadata = input.metadata || null;
  }

  const { data: expense, error: updateError } = await supabase
    .from('Expense')
    // @ts-expect-error - Le type Database.Update est any, mais TypeScript ne l'infère pas correctement
    .update(updateData)
    .eq('id', expenseId)
    .eq('userId', userId)
    .select()
    .single();

  if (updateError || !expense) {
    throw new Error(`Erreur lors de la mise à jour de la dépense: ${updateError?.message}`);
  }

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
  let query = supabase
    .from('Expense')
    .select('*')
    .eq('userId', userId);

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  if (options?.frequency) {
    query = query.eq('frequency', options.frequency);
  }

  if (options?.startDate) {
    query = query.gte('date', options.startDate.toISOString());
  }
  if (options?.endDate) {
    query = query.lte('date', options.endDate.toISOString());
  }

  query = query.order('date', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  }

  const { data: expenses, error } = await query;

  if (error) {
    throw new Error(`Erreur lors de la récupération des dépenses: ${error.message}`);
  }

  return expenses || [];
}

/**
 * Récupère une dépense par ID
 */
export async function getExpenseById(userId: string, expenseId: string) {
  const { data: expense, error } = await supabase
    .from('Expense')
    .select('*')
    .eq('id', expenseId)
    .eq('userId', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Erreur lors de la récupération de la dépense: ${error.message}`);
  }

  return expense || null;
}

/**
 * Supprime une dépense
 */
export async function deleteExpense(userId: string, expenseId: string) {
  const { data: expense, error: fetchError } = await supabase
    .from('Expense')
    .select('id')
    .eq('id', expenseId)
    .eq('userId', userId)
    .single();

  if (fetchError || !expense) {
    throw new Error("Dépense non trouvée");
  }

  const { error: deleteError } = await supabase
    .from('Expense')
    .delete()
    .eq('id', expenseId)
    .eq('userId', userId);

  if (deleteError) {
    throw new Error(`Erreur lors de la suppression de la dépense: ${deleteError.message}`);
  }

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
  const { data: monthlyExpenses, error: monthlyError } = await supabase
    .from('Expense')
    .select('*')
    .eq('userId', userId)
    .eq('isRecurring', false)
    .gte('date', startDate.toISOString())
    .lte('date', endDate.toISOString());

  if (monthlyError) {
    throw new Error(`Erreur lors de la récupération des dépenses mensuelles: ${monthlyError.message}`);
  }

  // Récupérer les dépenses récurrentes actives
  const { data: recurringExpenses, error: recurringError } = await supabase
    .from('Expense')
    .select('*')
    .eq('userId', userId)
    .eq('isRecurring', true)
    .in('frequency', [ExpenseFrequency.DAILY, ExpenseFrequency.WEEKLY, ExpenseFrequency.MONTHLY]);

  if (recurringError) {
    throw new Error(`Erreur lors de la récupération des dépenses récurrentes: ${recurringError.message}`);
  }

  let total = 0;

  // Ajouter toutes les dépenses non récurrentes du mois
  for (const expense of (monthlyExpenses || [])) {
    total += expense.amount || 0;
  }

  // Ajouter les dépenses récurrentes (calculées pour le mois)
  for (const expense of (recurringExpenses || [])) {
    if (expense.frequency === ExpenseFrequency.DAILY) {
      const daysInMonth = endDate.getDate();
      total += (expense.amount || 0) * daysInMonth;
    } else if (expense.frequency === ExpenseFrequency.WEEKLY) {
      // Calculer le nombre de semaines dans le mois
      const weeksInMonth = Math.ceil(endDate.getDate() / 7);
      total += (expense.amount || 0) * weeksInMonth;
    } else if (expense.frequency === ExpenseFrequency.MONTHLY) {
      total += expense.amount || 0;
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

  // Récupérer toutes les dépenses de la période
  const { data: expenses, error } = await supabase
    .from('Expense')
    .select('*')
    .eq('userId', userId)
    .gte('date', startDate.toISOString())
    .lte('date', endDate.toISOString());

  if (error) {
    throw new Error(`Erreur lors de la récupération des dépenses: ${error.message}`);
  }

  // Grouper par catégorie manuellement (Supabase ne supporte pas groupBy directement)
  const categoryMap = new Map<string, { total: number; count: number }>();
  (expenses || []).forEach((expense: any) => {
    const category = expense.category || ExpenseCategory.OTHER;
    const existing = categoryMap.get(category) || { total: 0, count: 0 };
    categoryMap.set(category, {
      total: existing.total + (expense.amount || 0),
      count: existing.count + 1,
    });
  });

  return Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    total: data.total,
    count: data.count,
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

