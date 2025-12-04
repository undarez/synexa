"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

export function FinanceWidget() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await fetch("/api/finance/summary");
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Finance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Finance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
              Aucune donnée financière disponible
            </p>
            <Link href="/finance" className="text-xs text-[hsl(var(--primary))] hover:underline">
              Voir le tableau de bord →
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const balance = (summary.monthlyIncome || 0) - (summary.monthlyExpenses || 0);
  const isPositive = balance >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Finance
        </CardTitle>
        <CardDescription>
          Résumé du mois
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Revenus</span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              +{summary.monthlyIncome?.toFixed(2) || "0.00"} €
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Dépenses</span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              -{summary.monthlyExpenses?.toFixed(2) || "0.00"} €
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">Solde</span>
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`font-bold ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {balance.toFixed(2)} €
              </span>
            </div>
          </div>
          <Link href="/finance" className="text-xs text-[hsl(var(--primary))] hover:underline mt-2 block">
            Voir le tableau de bord →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}





