"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import IncomeForm from "@/app/components/IncomeForm";
import ExpenseForm from "@/app/components/ExpenseForm";
import BillForm from "@/app/components/BillForm";
import BillItem from "@/app/components/BillItem";
import BudgetForm from "@/app/components/BudgetForm";
import BudgetCard from "@/app/components/BudgetCard";
import type { Income, Expense, Bill, Budget } from "@prisma/client";
import {
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function FinancePage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isBillFormOpen, setIsBillFormOpen] = useState(false);
  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incomesRes, expensesRes, billsRes, incomeMonthlyRes, expensesMonthlyRes, budgetsRes] = await Promise.all([
        fetch("/api/finance/income?activeOnly=true"),
        fetch("/api/finance/expenses"),
        fetch("/api/finance/bills?includePaid=true"),
        fetch("/api/finance/income?monthly=true"),
        fetch("/api/finance/expenses?monthly=true"),
        fetch("/api/finance/budgets?withSummary=true"),
      ]);

      if (incomesRes.ok) {
        const incomesData = await incomesRes.json();
        setIncomes(incomesData);
      }

      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setExpenses(expensesData);
      }

      if (billsRes.ok) {
        const billsData = await billsRes.json();
        setBills(billsData);
      }

      if (incomeMonthlyRes.ok) {
        const { total } = await incomeMonthlyRes.json();
        setMonthlyIncome(total);
      }

      if (expensesMonthlyRes.ok) {
        const { total } = await expensesMonthlyRes.json();
        setMonthlyExpenses(total);
      }

      if (budgetsRes.ok) {
        const budgetsData = await budgetsRes.json();
        setBudgets(budgetsData);
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIncomeSuccess = async () => {
    setIsIncomeFormOpen(false);
    setSelectedIncome(null);
    // Attendre un peu pour que la base de données soit à jour
    await new Promise(resolve => setTimeout(resolve, 300));
    await fetchData();
  };

  const handleExpenseSuccess = async () => {
    setIsExpenseFormOpen(false);
    setSelectedExpense(null);
    // Attendre un peu pour que la base de données soit à jour
    await new Promise(resolve => setTimeout(resolve, 300));
    await fetchData();
  };

  const handleBillSuccess = () => {
    setIsBillFormOpen(false);
    setSelectedBill(null);
    fetchData();
  };

  const handleBudgetSuccess = async () => {
    setIsBudgetFormOpen(false);
    setSelectedBudget(null);
    await new Promise(resolve => setTimeout(resolve, 300));
    await fetchData();
  };

  const handleDeleteBudget = async (budgetId: string) => {
    try {
      const response = await fetch(`/api/finance/budgets/${budgetId}`, {
        method: "DELETE",
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce revenu ?")) return;
    
    try {
      const response = await fetch(`/api/finance/income/${incomeId}`, {
        method: "DELETE",
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette dépense ?")) return;
    
    try {
      const response = await fetch(`/api/finance/expenses/${expenseId}`, {
        method: "DELETE",
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const balance = monthlyIncome - monthlyExpenses;
  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background))]">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] flex items-center gap-3">
                <Wallet className="h-8 w-8" />
                Finance
              </h1>
              <p className="text-muted-foreground mt-2">
                Gérez votre salaire, vos dépenses et vos factures
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="budgets">Budgets</TabsTrigger>
              <TabsTrigger value="expenses">Dépenses</TabsTrigger>
              <TabsTrigger value="bills">Factures</TabsTrigger>
            </TabsList>

            {/* Vue d'ensemble */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Résumé financier */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Revenus mensuels
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{monthlyIncome.toFixed(2)} €</div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => {
                        setSelectedIncome(null);
                        setIsIncomeFormOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {incomes.length === 0 ? "Ajouter un salaire" : "Modifier"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Dépenses mensuelles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{monthlyExpenses.toFixed(2)} €</div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => {
                        setSelectedExpense(null);
                        setIsExpenseFormOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une dépense
                    </Button>
                  </CardContent>
                </Card>

                <Card className={balance >= 0 ? "border-green-500" : "border-red-500"}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Solde restant
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${balance >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {balance.toFixed(2)} €
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {balance >= 0 ? "Budget disponible" : "Dépassement"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Salaire configuré */}
              {incomes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Salaire configuré</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {incomes.map((income) => (
                        <div
                          key={income.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{income.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {income.amount.toFixed(2)} {income.currency} / {income.frequency === "MONTHLY" ? "mois" : income.frequency === "WEEKLY" ? "semaine" : "an"}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedIncome(income);
                                setIsIncomeFormOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteIncome(income.id)}
                              className="text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dépenses récentes */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Dépenses récentes</CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveTab("expenses")}
                    >
                      Voir tout
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentExpenses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucune dépense enregistrée
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentExpenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{expense.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(expense.date), "d MMMM yyyy", { locale: fr })}
                            </div>
                          </div>
                          <div className="font-bold">{expense.amount.toFixed(2)} €</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Budgets */}
            <TabsContent value="budgets" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Mes budgets</h2>
                <Button onClick={() => {
                  setSelectedBudget(null);
                  setIsBudgetFormOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau budget
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Chargement...</p>
                </div>
              ) : budgets.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <CardTitle className="mb-2">Aucun budget</CardTitle>
                    <CardDescription>
                      Créez un budget pour suivre vos dépenses par catégorie
                    </CardDescription>
                    <Button
                      className="mt-4"
                      onClick={() => {
                        setSelectedBudget(null);
                        setIsBudgetFormOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer un budget
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {budgets.map((summary) => (
                    <BudgetCard
                      key={summary.budget.id}
                      summary={summary}
                      onEdit={(budget) => {
                        setSelectedBudget(budget);
                        setIsBudgetFormOpen(true);
                      }}
                      onDelete={handleDeleteBudget}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Dépenses */}
            <TabsContent value="expenses" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Mes dépenses</h2>
                <Button onClick={() => {
                  setSelectedExpense(null);
                  setIsExpenseFormOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle dépense
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Chargement...</p>
                </div>
              ) : expenses.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <CardTitle className="mb-2">Aucune dépense</CardTitle>
                    <CardDescription>
                      Commencez par ajouter vos premières dépenses
                    </CardDescription>
                    <Button
                      className="mt-4"
                      onClick={() => {
                        setSelectedExpense(null);
                        setIsExpenseFormOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une dépense
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {expenses.map((expense) => (
                    <Card key={expense.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{expense.title}</CardTitle>
                        {expense.description && (
                          <CardDescription>{expense.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-2xl font-bold">{expense.amount.toFixed(2)} €</span>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(expense.date), "d MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setSelectedExpense(expense);
                              setIsExpenseFormOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Factures (secondaire) */}
            <TabsContent value="bills" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Mes factures</h2>
                <Button onClick={() => {
                  setSelectedBill(null);
                  setIsBillFormOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle facture
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Chargement...</p>
                </div>
              ) : bills.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <CardTitle className="mb-2">Aucune facture</CardTitle>
                    <CardDescription>
                      Ajoutez vos factures pour un suivi complet
                    </CardDescription>
                    <Button
                      className="mt-4"
                      onClick={() => {
                        setSelectedBill(null);
                        setIsBillFormOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une facture
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bills.map((bill) => (
                    <BillItem
                      key={bill.id}
                      bill={bill}
                      onUpdate={fetchData}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      <IncomeForm
        income={selectedIncome}
        open={isIncomeFormOpen}
        onOpenChange={setIsIncomeFormOpen}
        onSuccess={handleIncomeSuccess}
      />

      <ExpenseForm
        expense={selectedExpense}
        open={isExpenseFormOpen}
        onOpenChange={setIsExpenseFormOpen}
        onSuccess={handleExpenseSuccess}
      />

      <BillForm
        bill={selectedBill}
        open={isBillFormOpen}
        onOpenChange={setIsBillFormOpen}
        onSuccess={handleBillSuccess}
      />

      <BudgetForm
        budget={selectedBudget}
        open={isBudgetFormOpen}
        onOpenChange={setIsBudgetFormOpen}
        onSuccess={handleBudgetSuccess}
      />
    </div>
  );
}
