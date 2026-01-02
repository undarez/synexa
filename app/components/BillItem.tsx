"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import type { Bill, BillCategory } from "@prisma/client";
import { BillStatus } from "@prisma/client";
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
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Edit,
} from "lucide-react";
import { useState } from "react";
import BillForm from "./BillForm";

const categoryLabels: Record<BillCategory, { label: string; icon: any; color: string }> = {
  UTILITIES: { label: "Services publics", icon: Zap, color: "text-yellow-500" },
  INTERNET: { label: "Internet/Téléphone", icon: Wifi, color: "text-blue-500" },
  INSURANCE: { label: "Assurance", icon: Shield, color: "text-green-500" },
  SUBSCRIPTION: { label: "Abonnements", icon: CreditCard, color: "text-purple-500" },
  RENT: { label: "Loyer", icon: Home, color: "text-orange-500" },
  TAXES: { label: "Impôts", icon: Receipt, color: "text-red-500" },
  HEALTH: { label: "Santé", icon: Heart, color: "text-pink-500" },
  TRANSPORT: { label: "Transport", icon: Car, color: "text-cyan-500" },
  EDUCATION: { label: "Éducation", icon: GraduationCap, color: "text-indigo-500" },
  OTHER: { label: "Autre", icon: MoreHorizontal, color: "text-gray-500" },
};

const statusLabels: Record<BillStatus, { label: string; icon: any; color: string }> = {
  PENDING: { label: "En attente", icon: Clock, color: "text-blue-500" },
  PAID: { label: "Payée", icon: CheckCircle2, color: "text-green-500" },
  OVERDUE: { label: "En retard", icon: AlertCircle, color: "text-red-500" },
  CANCELLED: { label: "Annulée", icon: MoreHorizontal, color: "text-gray-500" },
};

interface BillItemProps {
  bill: Bill;
  onUpdate: () => void;
}

export default function BillItem({ bill, onUpdate }: BillItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  const category = categoryLabels[bill.category];
  const status = statusLabels[bill.status];
  const CategoryIcon = category.icon;
  const StatusIcon = status.icon;

  const dueDate = new Date(bill.dueDate);
  const isOverdue = bill.status === BillStatus.OVERDUE || (bill.status === BillStatus.PENDING && dueDate < new Date());
  const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette facture ?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/finance/bills/${bill.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      onUpdate();
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la suppression de la facture");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkAsPaid = async () => {
    setIsMarkingPaid(true);
    try {
      const response = await fetch(`/api/finance/bills/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidDate: new Date().toISOString() }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors du paiement");
      }

      onUpdate();
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors du paiement de la facture");
    } finally {
      setIsMarkingPaid(false);
    }
  };

  return (
    <>
      <BillForm
        bill={isEditing ? bill : null}
        open={isEditing}
        onOpenChange={setIsEditing}
        onSuccess={() => {
          setIsEditing(false);
          onUpdate();
        }}
      />
      <Card className={`transition-all hover:shadow-md ${isOverdue ? "border-red-500" : ""}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={`mt-1 ${category.color}`}>
                <CategoryIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{bill.title}</CardTitle>
                {bill.description && (
                  <CardDescription className="mt-1">{bill.description}</CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${isOverdue ? "text-red-500" : ""}`}>
                {bill.amount.toFixed(2)} {bill.currency}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-4 w-4 ${status.color}`} />
                <span className={status.color}>{status.label}</span>
              </div>
              <div className="text-muted-foreground">
                {bill.isRecurring && (
                  <span className="mr-2">
                    {bill.recurrenceRule === "MONTHLY" && "Mensuelle"}
                    {bill.recurrenceRule === "QUARTERLY" && "Trimestrielle"}
                    {bill.recurrenceRule === "YEARLY" && "Annuelle"}
                  </span>
                )}
                Échéance: {format(dueDate, "d MMMM yyyy", { locale: fr })}
              </div>
            </div>

            {bill.provider && (
              <div className="text-sm text-muted-foreground">
                Fournisseur: {bill.provider}
              </div>
            )}

            {bill.reference && (
              <div className="text-sm text-muted-foreground">
                Référence: {bill.reference}
              </div>
            )}

            {bill.status === BillStatus.PENDING && (
              <div className="text-sm">
                {daysUntilDue < 0 ? (
                  <span className="text-red-500 font-medium">
                    En retard de {Math.abs(daysUntilDue)} jour{Math.abs(daysUntilDue) > 1 ? "s" : ""}
                  </span>
                ) : daysUntilDue === 0 ? (
                  <span className="text-orange-500 font-medium">Échéance aujourd'hui</span>
                ) : daysUntilDue <= bill.reminderDays ? (
                  <span className="text-yellow-500 font-medium">
                    Dans {daysUntilDue} jour{daysUntilDue > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Dans {daysUntilDue} jour{daysUntilDue > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}

            {bill.status === BillStatus.PAID && bill.paidDate && (
              <div className="text-sm text-green-500">
                Payée le {format(new Date(bill.paidDate), "d MMMM yyyy", { locale: fr })}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t">
              {bill.status !== BillStatus.PAID && (
                <Button
                  size="sm"
                  onClick={handleMarkAsPaid}
                  disabled={isMarkingPaid}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {isMarkingPaid ? "Marquage..." : "Marquer comme payée"}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

