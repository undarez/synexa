"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { HealthMetricType } from "@prisma/client";
import { Loader2 } from "lucide-react";

interface HealthMetricFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const metricTypes: { value: HealthMetricType; label: string; unit: string }[] = [
  { value: "SLEEP", label: "Sommeil", unit: "heures" },
  { value: "ACTIVITY", label: "Activité", unit: "minutes" },
  { value: "HEART_RATE", label: "Fréquence cardiaque", unit: "bpm" },
  { value: "WEIGHT", label: "Poids", unit: "kg" },
  { value: "STEPS", label: "Pas", unit: "pas" },
  { value: "CALORIES", label: "Calories", unit: "kcal" },
  { value: "HYDRATION", label: "Hydratation", unit: "ml" },
  { value: "MOOD", label: "Humeur", unit: "/10" },
  { value: "STRESS", label: "Stress", unit: "/10" },
  { value: "BLOOD_PRESSURE", label: "Tension artérielle", unit: "mmHg" },
];

export function HealthMetricForm({ onSuccess, onCancel }: HealthMetricFormProps) {
  const [type, setType] = useState<HealthMetricType | "">("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [source, setSource] = useState("manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMetric = metricTypes.find((m) => m.value === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !value) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/health/metrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          value: parseFloat(value),
          unit: unit || selectedMetric?.unit,
          source,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de l'ajout");
      }

      // Réinitialiser le formulaire
      setType("");
      setValue("");
      setUnit("");
      setSource("manual");

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter une métrique de santé</CardTitle>
        <CardDescription>
          Enregistrez vos données de bien-être pour suivre votre évolution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="type">Type de métrique</Label>
            <Select value={type} onValueChange={(v) => {
              setType(v as HealthMetricType);
              const metric = metricTypes.find((m) => m.value === v);
              if (metric) {
                setUnit(metric.unit);
              }
            }}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Sélectionnez un type" />
              </SelectTrigger>
              <SelectContent>
                {metricTypes.map((metric) => (
                  <SelectItem key={metric.value} value={metric.value}>
                    {metric.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Valeur</Label>
            <Input
              id="value"
              type="number"
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              required
            />
            {selectedMetric && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Unité: {selectedMetric.unit}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unité (optionnel)</Label>
            <Input
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder={selectedMetric?.unit || "Unité"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger id="source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manuel</SelectItem>
                <SelectItem value="apple_health">Apple Health</SelectItem>
                <SelectItem value="fitbit">Fitbit</SelectItem>
                <SelectItem value="withings">Withings</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ajout...
                </>
              ) : (
                "Ajouter"
              )}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


