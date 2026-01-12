/**
 * Agent Finance
 * 
 * Responsabilités :
 * - Ajouter des dépenses
 * - Ajouter des revenus
 * - Récupérer un résumé financier
 * 
 * ⚠️ IMPORTANT : Aucune IA ici. Juste de la logique métier.
 */

import type { AgentInput, AgentOutput } from "../types";
import { createServerComponentClient } from "@/app/lib/supabase/server-client";

/**
 * Agent finance principal
 */
export async function financeAgent(input: AgentInput): Promise<AgentOutput> {
  const { action, parameters, userId } = input;

  try {
    switch (action) {
      case "add_expense":
        return await addExpense(userId, parameters);
      
      case "add_income":
        return await addIncome(userId, parameters);
      
      case "get_summary":
        return await getFinancialSummary(userId, parameters);
      
      default:
        return {
          success: false,
          error: `Action non supportée: ${action}`,
        };
    }
  } catch (error) {
    console.error("[Finance Agent] Erreur:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Ajoute une dépense
 */
async function addExpense(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const { amount, category, description, date } = params;

  if (!amount || !category) {
    return {
      success: false,
      error: "amount et category requis",
    };
  }

  const supabase = await createServerComponentClient();

  try {
    const { data, error } = await supabase
      .from("Expense")
      .insert({
        userId,
        amount: parseFloat(amount),
        category,
        description: description || null,
        date: date || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      result: {
        expenseId: data.id,
        amount: data.amount,
        category: data.category,
      },
      logs: [`Dépense de ${amount}€ ajoutée (${category})`],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur ajout dépense",
    };
  }
}

/**
 * Ajoute un revenu
 */
async function addIncome(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const { amount, source, description, date } = params;

  if (!amount || !source) {
    return {
      success: false,
      error: "amount et source requis",
    };
  }

  const supabase = await createServerComponentClient();

  try {
    const { data, error } = await supabase
      .from("Income")
      .insert({
        userId,
        amount: parseFloat(amount),
        source,
        description: description || null,
        date: date || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      result: {
        incomeId: data.id,
        amount: data.amount,
        source: data.source,
      },
      logs: [`Revenu de ${amount}€ ajouté (${source})`],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur ajout revenu",
    };
  }
}

/**
 * Récupère un résumé financier
 */
async function getFinancialSummary(userId: string, params: Record<string, any>): Promise<AgentOutput> {
  const { startDate, endDate } = params;

  const supabase = await createServerComponentClient();

  try {
    // Récupérer les dépenses
    let expenseQuery = supabase
      .from("Expense")
      .select("amount")
      .eq("userId", userId);

    if (startDate) {
      expenseQuery = expenseQuery.gte("date", startDate);
    }
    if (endDate) {
      expenseQuery = expenseQuery.lte("date", endDate);
    }

    const { data: expenses } = await expenseQuery;

    // Récupérer les revenus
    let incomeQuery = supabase
      .from("Income")
      .select("amount")
      .eq("userId", userId);

    if (startDate) {
      incomeQuery = incomeQuery.gte("date", startDate);
    }
    if (endDate) {
      incomeQuery = incomeQuery.lte("date", endDate);
    }

    const { data: incomes } = await incomeQuery;

    const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const totalIncome = incomes?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
    const balance = totalIncome - totalExpenses;

    return {
      success: true,
      result: {
        totalExpenses,
        totalIncome,
        balance,
        period: {
          start: startDate || "all",
          end: endDate || "all",
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur récupération résumé",
    };
  }
}
