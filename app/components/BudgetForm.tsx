"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
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

interface BudgetFormProps {
  budget?: Budget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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

export default function BudgetForm({ budget, open, onOpenChange, onSuccess }: BudgetFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "OTHER" as ExpenseCategory,
    amount: "",
    currency: "EUR",
    period: "MONTHLY",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: "",
    alertThreshold: "80",
  });

  useEffect(() => {
    if (budget) {
      setFormData({
        title: budget.title || "",
        category: budget.category,
        amount: budget.amount.toString(),
        currency: budget.currency || "EUR",
        period: budget.period || "MONTHLY",
        startDate: budget.startDate ? format(new Date(budget.startDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        endDate: budget.endDate ? format(new Date(budget.endDate), "yyyy-MM-dd") : "",
        alertThreshold: budget.alertThreshold?.toString() || "80",
      });
    } else {
      setFormData({
        title: "",
        category: "OTHER",
        amount: "",
        currency: "EUR",
        period: "MONTHLY",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: "",
        alertThreshold: "80",
      });
    }
  }, [budget, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = budget ? `/api/finance/budgets/${budget.id}` : "/api/finance/budgets";
      const method = budget ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          period: formData.period,
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          alertThreshold: parseFloat(formData.alertThreshold),
        }),
      });

      if (response.ok) {
        onSuccess();
        onOpenChange(false);
      } else {
        const error = await response.json();
        alert(error.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const CategoryIcon = categoryLabels[formData.category]?.icon || MoreHorizontal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{budget ? "Modifier le budget" : "Nouveau budget"}</DialogTitle>
          <DialogDescription>
            {budget
              ? "Modifiez les informations de votre budget"
              : "Créez un budget pour suivre vos dépenses par catégorie"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Budget Alimentation"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as ExpenseCategory })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-4 w-4" />
                        {categoryLabels[formData.category]?.label}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, { label, icon: Icon }]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Période</Label>
                <Select
                  value={formData.period}
                  onValueChange={(value) => setFormData({ ...formData, period: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Mensuel</SelectItem>
                    <SelectItem value="WEEKLY">Hebdomadaire</SelectItem>
                    <SelectItem value="YEARLY">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Montant ({formData.currency})</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alertThreshold">Seuil d'alerte (%)</Label>
                <Input
                  id="alertThreshold"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.alertThreshold}
                  onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                  placeholder="80"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Date de début</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Date de fin (optionnel)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : budget ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

