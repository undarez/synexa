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
import type { Bill, BillCategory } from "@prisma/client";
import { 
  Zap, 
  Wifi, 
  Shield, 
  CreditCard, 
  Home, 
  Receipt, 
  Heart, 
  Car, 
  GraduationCap, 
  MoreHorizontal 
} from "lucide-react";

interface BillFormProps {
  bill?: Bill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const categoryLabels: Record<BillCategory, { label: string; icon: any }> = {
  UTILITIES: { label: "Services publics", icon: Zap },
  INTERNET: { label: "Internet/Téléphone", icon: Wifi },
  INSURANCE: { label: "Assurance", icon: Shield },
  SUBSCRIPTION: { label: "Abonnements", icon: CreditCard },
  RENT: { label: "Loyer", icon: Home },
  TAXES: { label: "Impôts", icon: Receipt },
  HEALTH: { label: "Santé", icon: Heart },
  TRANSPORT: { label: "Transport", icon: Car },
  EDUCATION: { label: "Éducation", icon: GraduationCap },
  OTHER: { label: "Autre", icon: MoreHorizontal },
};

export default function BillForm({ bill, open, onOpenChange, onSuccess }: BillFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "OTHER" as BillCategory,
    amount: "",
    currency: "EUR",
    dueDate: "",
    provider: "",
    reference: "",
    reminderDays: "3",
    isRecurring: false,
    recurrenceRule: "",
  });

  useEffect(() => {
    if (bill) {
      setFormData({
        title: bill.title || "",
        description: bill.description || "",
        category: bill.category,
        amount: bill.amount.toString(),
        currency: bill.currency || "EUR",
        dueDate: bill.dueDate ? format(new Date(bill.dueDate), "yyyy-MM-dd") : "",
        provider: bill.provider || "",
        reference: bill.reference || "",
        reminderDays: bill.reminderDays.toString(),
        isRecurring: bill.isRecurring || false,
        recurrenceRule: bill.recurrenceRule || "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        category: "OTHER",
        amount: "",
        currency: "EUR",
        dueDate: "",
        provider: "",
        reference: "",
        reminderDays: "3",
        isRecurring: false,
        recurrenceRule: "",
      });
    }
  }, [bill, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = bill ? `/api/finance/bills/${bill.id}` : "/api/finance/bills";
      const method = bill ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          reminderDays: parseInt(formData.reminderDays),
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
          <DialogTitle>{bill ? "Modifier la facture" : "Nouvelle facture"}</DialogTitle>
          <DialogDescription>
            {bill ? "Modifiez les informations de la facture" : "Ajoutez une nouvelle facture à suivre"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Facture EDF"
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
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as BillCategory })}
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

          <div className="space-y-2">
            <Label htmlFor="dueDate">Date d'échéance *</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Fournisseur</Label>
              <Input
                id="provider"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                placeholder="Ex: EDF, Orange..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Référence</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="N° de facture"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminderDays">Rappel (jours avant échéance)</Label>
            <Input
              id="reminderDays"
              type="number"
              min="0"
              value={formData.reminderDays}
              onChange={(e) => setFormData({ ...formData, reminderDays: e.target.value })}
            />
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
              Facture récurrente
            </Label>
          </div>

          {formData.isRecurring && (
            <div className="space-y-2">
              <Label htmlFor="recurrenceRule">Fréquence</Label>
              <Select
                value={formData.recurrenceRule}
                onValueChange={(value) => setFormData({ ...formData, recurrenceRule: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une fréquence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Mensuelle</SelectItem>
                  <SelectItem value="QUARTERLY">Trimestrielle</SelectItem>
                  <SelectItem value="YEARLY">Annuelle</SelectItem>
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
              {loading ? "Enregistrement..." : bill ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}






