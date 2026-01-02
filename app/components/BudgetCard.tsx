"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { Edit, Trash2, AlertTriangle } from "lucide-react";
import type { Budget, ExpenseCategory } from "@prisma/client";
import {
  Utensils,
  Car,
  ShoppingBag,
  Film,
  Heart,
  GraduationCap,
  Shirt,
  Home,
  User,
  MoreHorizontal,
} from "lucide-react";

interface BudgetSummary {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  shouldAlert: boolean;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

interface BudgetCardProps {
  summary: BudgetSummary;
  onEdit: (budget: Budget) => void;
  onDelete: (budgetId: string) => void;
}

const categoryLabels: Record<ExpenseCategory, { label: string; icon: any }> = {
  FOOD: { label: "Alimentation", icon: Utensils },
  TRANSPORT: { label: "Transport", icon: Car },
  SHOPPING: { label: "Shopping", icon: ShoppingBag },
  ENTERTAINMENT: { label: "Loisirs", icon: Film },
  HEALTH: { label: "Santé", icon: Heart },
  EDUCATION: { label: "Éducation", icon: GraduationCap },
  CLOTHING: { label: "Vêtements", icon: Shirt },
  HOME: { label: "Maison", icon: Home },
  PERSONAL: { label: "Personnel", icon: User },
  OTHER: { label: "Autre", icon: MoreHorizontal },
};

export default function BudgetCard({ summary, onEdit, onDelete }: BudgetCardProps) {
  const { budget, spent, remaining, percentage, isOverBudget, shouldAlert } = summary;
  const CategoryIcon = categoryLabels[budget.category]?.icon || MoreHorizontal;
  const categoryLabel = categoryLabels[budget.category]?.label || "Autre";

  return (
    <Card className={isOverBudget ? "border-red-500" : shouldAlert ? "border-yellow-500" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CategoryIcon className="h-5 w-5" />
            {budget.title}
          </CardTitle>
          {shouldAlert && !isOverBudget && (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          )}
          {isOverBudget && <AlertTriangle className="h-5 w-5 text-red-500" />}
        </div>
        <p className="text-sm text-muted-foreground">{categoryLabel}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Dépensé</span>
              <span className={`text-sm font-bold ${isOverBudget ? "text-red-500" : ""}`}>
                {spent.toFixed(2)} € / {budget.amount.toFixed(2)} €
              </span>
            </div>
            <Progress 
              value={Math.min(percentage, 100)} 
              className={`h-2 ${isOverBudget ? "[&>div]:bg-red-500" : shouldAlert ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}`}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {percentage.toFixed(1)}% utilisé
              </span>
              <span
                className={`text-xs font-medium ${
                  remaining >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {remaining >= 0 ? `Restant: ${remaining.toFixed(2)} €` : `Dépassé: ${Math.abs(remaining).toFixed(2)} €`}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onEdit(budget)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm("Êtes-vous sûr de vouloir supprimer ce budget ?")) {
                  onDelete(budget.id);
                }
              }}
              className="text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

