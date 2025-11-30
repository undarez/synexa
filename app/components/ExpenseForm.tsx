"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
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
import type { Expense, ExpenseCategory, ExpenseFrequency } from "@prisma/client";
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

interface ExpenseFormProps {
  expense?: Expense | null;
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

export default function ExpenseForm({ expense, open, onOpenChange, onSuccess }: ExpenseFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "OTHER" as ExpenseCategory,
    amount: "",
    currency: "EUR",
    frequency: "ONE_TIME" as ExpenseFrequency,
    date: format(new Date(), "yyyy-MM-dd"),
    isRecurring: false,
    recurrenceRule: "",
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        title: expense.title || "",
        description: expense.description || "",
        category: expense.category,
        amount: expense.amount.toString(),
        currency: expense.currency || "EUR",
        frequency: expense.frequency,
        date: expense.date ? format(new Date(expense.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        isRecurring: expense.isRecurring || false,
        recurrenceRule: expense.recurrenceRule || "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        category: "OTHER",
        amount: "",
        currency: "EUR",
        frequency: "ONE_TIME",
        date: format(new Date(), "yyyy-MM-dd"),
        isRecurring: false,
        recurrenceRule: "",
      });
    }
  }, [expense, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = expense ? `/api/finance/expenses/${expense.id}` : "/api/finance/expenses";
      const method = expense ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la sauvegarde");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur:", error);
      alert(error instanceof Error ? error.message : "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const CategoryIcon = categoryLabels[formData.category]?.icon || MoreHorizontal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? "Modifier la dépense" : "Nouvelle dépense"}</DialogTitle>
          <DialogDescription>
            {expense ? "Modifiez les informations de la dépense" : "Ajoutez une dépense quotidienne ou mensuelle"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Courses, Restaurant..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Notes supplémentaires..."
              rows={2}
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
              <Label htmlFor="amount">Montant *</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Fréquence</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value as ExpenseFrequency })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONE_TIME">Unique</SelectItem>
                  <SelectItem value="DAILY">Quotidien</SelectItem>
                  <SelectItem value="WEEKLY">Hebdomadaire</SelectItem>
                  <SelectItem value="MONTHLY">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="isRecurring" className="cursor-pointer">
              Dépense récurrente
            </Label>
          </div>

          {formData.isRecurring && (
            <div className="space-y-2">
              <Label htmlFor="recurrenceRule">Règle de récurrence</Label>
              <Select
                value={formData.recurrenceRule}
                onValueChange={(value) => setFormData({ ...formData, recurrenceRule: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une fréquence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Quotidien</SelectItem>
                  <SelectItem value="WEEKLY">Hebdomadaire</SelectItem>
                  <SelectItem value="MONTHLY">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : expense ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

