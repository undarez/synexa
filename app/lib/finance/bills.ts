import { supabase } from "@/app/lib/supabase/client";
import { BillCategory, BillStatus } from "@/app/lib/supabase/types";

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

  const now = new Date().toISOString();
  const { data: bill, error } = await supabase
    .from('Bill')
    .insert({
      userId,
      title: input.title,
      description: input.description || null,
      category,
      amount: input.amount,
      currency: input.currency || "EUR",
      dueDate: dueDate.toISOString(),
      provider: input.provider || null,
      reference: input.reference || null,
      reminderDays: input.reminderDays || 3,
      isRecurring: input.isRecurring || false,
      recurrenceRule: input.recurrenceRule || null,
      status,
      metadata: input.metadata || null,
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single();

  if (error || !bill) {
    throw new Error(`Erreur lors de la création de la facture: ${error?.message}`);
  }

  return bill;
}

/**
 * Met à jour une facture
 */
export async function updateBill(userId: string, billId: string, input: UpdateBillInput) {
  // Vérifier que la facture appartient à l'utilisateur
  const { data: existingBill, error: fetchError } = await supabase
    .from('Bill')
    .select('*')
    .eq('id', billId)
    .eq('userId', userId)
    .single();

  if (fetchError || !existingBill) {
    throw new Error("Facture non trouvée");
  }

  const updateData: any = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.amount !== undefined) updateData.amount = input.amount;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.dueDate !== undefined) {
    const dueDate = typeof input.dueDate === "string" ? new Date(input.dueDate) : input.dueDate;
    updateData.dueDate = dueDate.toISOString();
  }
  if (input.paidDate !== undefined) {
    updateData.paidDate = input.paidDate === null ? null : (typeof input.paidDate === "string" ? new Date(input.paidDate) : input.paidDate).toISOString();
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
    const dueDate = new Date(updateData.dueDate);
    if (dueDate < new Date() && existingBill.status === BillStatus.PENDING) {
      updateData.status = BillStatus.OVERDUE;
    }
  }

  // Si la facture est marquée comme payée, mettre à jour la date de paiement
  if (updateData.status === BillStatus.PAID && !updateData.paidDate) {
    updateData.paidDate = new Date().toISOString();
  }

  updateData.updatedAt = new Date().toISOString();

  const { data: bill, error: updateError } = await supabase
    .from('Bill')
    // @ts-expect-error - Le type Database.Update est any, mais TypeScript ne l'infère pas correctement
    .update(updateData)
    .eq('id', billId)
    .eq('userId', userId)
    .select()
    .single();

  if (updateError || !bill) {
    throw new Error(`Erreur lors de la mise à jour de la facture: ${updateError?.message}`);
  }

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
  let query = supabase
    .from('Bill')
    .select('*')
    .eq('userId', userId);

  if (options?.status) {
    query = query.eq('status', options.status);
  } else if (!options?.includePaid) {
    query = query.neq('status', BillStatus.PAID);
  }

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  query = query.order('dueDate', { ascending: true });

  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  }

  const { data: bills, error } = await query;

  if (error) {
    throw new Error(`Erreur lors de la récupération des factures: ${error.message}`);
  }

  return bills || [];
}

/**
 * Récupère une facture par ID
 */
export async function getBillById(userId: string, billId: string) {
  const { data: bill, error } = await supabase
    .from('Bill')
    .select('*')
    .eq('id', billId)
    .eq('userId', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Erreur lors de la récupération de la facture: ${error.message}`);
  }

  return bill || null;
}

/**
 * Supprime une facture
 */
export async function deleteBill(userId: string, billId: string) {
  const { data: bill, error: fetchError } = await supabase
    .from('Bill')
    .select('id')
    .eq('id', billId)
    .eq('userId', userId)
    .single();

  if (fetchError || !bill) {
    throw new Error("Facture non trouvée");
  }

  const { error: deleteError } = await supabase
    .from('Bill')
    .delete()
    .eq('id', billId)
    .eq('userId', userId);

  if (deleteError) {
    throw new Error(`Erreur lors de la suppression de la facture: ${deleteError.message}`);
  }

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

  const { data: bills, error } = await supabase
    .from('Bill')
    .select('*')
    .eq('userId', userId)
    .in('status', [BillStatus.PENDING, BillStatus.OVERDUE])
    .gte('dueDate', today.toISOString())
    .lte('dueDate', futureDate.toISOString())
    .order('dueDate', { ascending: true });

  if (error) {
    throw new Error(`Erreur lors de la récupération des factures à venir: ${error.message}`);
  }

  return bills || [];
}

/**
 * Récupère les factures en retard
 */
export async function getOverdueBills(userId: string) {
  const today = new Date();

  const { data: bills, error } = await supabase
    .from('Bill')
    .select('*')
    .eq('userId', userId)
    .eq('status', BillStatus.OVERDUE)
    .lt('dueDate', today.toISOString())
    .order('dueDate', { ascending: true });

  if (error) {
    throw new Error(`Erreur lors de la récupération des factures en retard: ${error.message}`);
  }

  return bills || [];
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

  // Récupérer toutes les factures pour calculer les agrégations
  const { data: allBills, error: fetchError } = await supabase
    .from('Bill')
    .select('*')
    .eq('userId', userId);

  if (fetchError) {
    throw new Error(`Erreur lors de la récupération des factures: ${fetchError.message}`);
  }

  const bills = allBills || [];

  // Filtrer et calculer manuellement (Supabase ne supporte pas groupBy directement)
  const pendingBills = bills.filter(
    (b: any) => b.status === BillStatus.PENDING &&
    new Date(b.dueDate) >= startDate &&
    new Date(b.dueDate) <= endDate
  );
  const paidBills = bills.filter(
    (b: any) => b.status === BillStatus.PAID &&
    b.paidDate &&
    new Date(b.paidDate) >= startDate &&
    new Date(b.paidDate) <= endDate
  );
  const overdueBills = bills.filter((b: any) => b.status === BillStatus.OVERDUE);
  const billsInPeriod = bills.filter(
    (b: any) => 
      [BillStatus.PENDING, BillStatus.OVERDUE].includes(b.status) &&
      new Date(b.dueDate) >= startDate &&
      new Date(b.dueDate) <= endDate
  );

  // Calculer les totaux
  const totalPending = pendingBills.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
  const totalPaid = paidBills.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
  const totalOverdue = overdueBills.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);

  // Grouper par catégorie
  const categoryMap = new Map<string, { total: number; count: number }>();
  billsInPeriod.forEach((b: any) => {
    const category = b.category || BillCategory.OTHER;
    const existing = categoryMap.get(category) || { total: 0, count: 0 };
    categoryMap.set(category, {
      total: existing.total + (b.amount || 0),
      count: existing.count + 1,
    });
  });

  const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    total: data.total,
    count: data.count,
  }));

  return {
    totalPending,
    totalPaid,
    totalOverdue,
    byCategory,
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
  const today = new Date().toISOString();
  
  let query = supabase
    .from('Bill')
    .update({
      status: BillStatus.OVERDUE,
      updatedAt: new Date().toISOString(),
    })
    .in('status', [BillStatus.PENDING, BillStatus.OVERDUE])
    .lt('dueDate', today);

  if (userId) {
    query = query.eq('userId', userId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Erreur lors de la mise à jour du statut des factures: ${error.message}`);
  }
}






