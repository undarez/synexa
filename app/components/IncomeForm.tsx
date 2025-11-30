"use client";

import { useState, useEffect } from "react";
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
import type { Income } from "@prisma/client";
import { format } from "date-fns";

interface IncomeFormProps {
  income?: Income | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function IncomeForm({ income, open, onOpenChange, onSuccess }: IncomeFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    currency: "EUR",
    frequency: "MONTHLY",
    startDate: "",
    endDate: "",
    isActive: true,
  });

  useEffect(() => {
    if (income) {
      setFormData({
        title: income.title || "",
        amount: income.amount.toString(),
        currency: income.currency || "EUR",
        frequency: income.frequency || "MONTHLY",
        startDate: income.startDate ? format(new Date(income.startDate), "yyyy-MM-dd") : "",
        endDate: income.endDate ? format(new Date(income.endDate), "yyyy-MM-dd") : "",
        isActive: income.isActive !== undefined ? income.isActive : true,
      });
    } else {
      setFormData({
        title: "",
        amount: "",
        currency: "EUR",
        frequency: "MONTHLY",
        startDate: "",
        endDate: "",
        isActive: true,
      });
    }
  }, [income, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = income ? `/api/finance/income/${income.id}` : "/api/finance/income";
      const method = income ? "PUT" : "POST";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{income ? "Modifier le salaire" : "Ajouter un salaire"}</DialogTitle>
          <DialogDescription>
            {income ? "Modifiez les informations de votre salaire" : "Ajoutez votre salaire net de base"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Salaire net"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Devise</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
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

          <div className="space-y-2">
            <Label htmlFor="frequency">Fréquence *</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData({ ...formData, frequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">Mensuel</SelectItem>
                <SelectItem value="WEEKLY">Hebdomadaire</SelectItem>
                <SelectItem value="YEARLY">Annuel</SelectItem>
                <SelectItem value="ONE_TIME">Unique</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Actif
            </Label>
          </div>

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
              {loading ? "Enregistrement..." : income ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

