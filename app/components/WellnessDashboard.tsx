"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Heart, Moon, Activity, Droplet, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { HealthMetricType } from "@prisma/client";

interface HealthMetricsSummary {
  type: HealthMetricType;
  latest?: {
    value: number;
    unit?: string;
    recordedAt: string;
  };
  average?: {
    value: number;
    unit?: string;
    period: string;
  };
  trend?: "up" | "down" | "stable";
  count: number;
}

const metricLabels: Record<HealthMetricType, { label: string; icon: any; color: string }> = {
  SLEEP: { label: "Sommeil", icon: Moon, color: "text-blue-500" },
  ACTIVITY: { label: "Activité", icon: Activity, color: "text-green-500" },
  HEART_RATE: { label: "Fréquence cardiaque", icon: Heart, color: "text-red-500" },
  WEIGHT: { label: "Poids", icon: Activity, color: "text-purple-500" },
  STEPS: { label: "Pas", icon: Activity, color: "text-green-500" },
  CALORIES: { label: "Calories", icon: Activity, color: "text-orange-500" },
  HYDRATION: { label: "Hydratation", icon: Droplet, color: "text-cyan-500" },
  MOOD: { label: "Humeur", icon: Heart, color: "text-yellow-500" },
  STRESS: { label: "Stress", icon: Heart, color: "text-red-500" },
  BLOOD_PRESSURE: { label: "Tension artérielle", icon: Heart, color: "text-red-500" },
  OTHER: { label: "Autre", icon: Activity, color: "text-gray-500" },
};

export function WellnessDashboard() {
  const [summaries, setSummaries] = useState<HealthMetricsSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/health/metrics?summary=true&days=30");
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des métriques");
      }
      const data = await response.json();
      setSummaries(data.summaries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend?: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatValue = (value: number, unit?: string) => {
    const formatted = value.toFixed(1);
    return unit ? `${formatted} ${unit}` : formatted;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tableau de bord Bien-être</CardTitle>
          <CardDescription>Chargement des métriques...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tableau de bord Bien-être</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (summaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Tableau de bord Bien-être
          </CardTitle>
          <CardDescription>
            Aucune métrique enregistrée. Commencez à suivre votre bien-être !
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.href = "/profile"}>
            Ajouter une métrique
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Tableau de bord Bien-être
        </CardTitle>
        <CardDescription>
          Vue d'ensemble de vos métriques de santé sur les 30 derniers jours
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary) => {
            const config = metricLabels[summary.type] || metricLabels.OTHER;
            const Icon = config.icon;

            return (
              <div
                key={summary.type}
                className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    <h3 className="font-semibold text-[hsl(var(--foreground))]">
                      {config.label}
                    </h3>
                  </div>
                  {getTrendIcon(summary.trend)}
                </div>

                {summary.latest && (
                  <div className="mb-2">
                    <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                      {formatValue(summary.latest.value, summary.latest.unit)}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Dernière mesure:{" "}
                      {new Date(summary.latest.recordedAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                )}

                {summary.average && (
                  <div className="mt-2 pt-2 border-t border-[hsl(var(--border))]">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Moyenne ({summary.average.period}):{" "}
                      <span className="font-semibold text-[hsl(var(--foreground))]">
                        {formatValue(summary.average.value, summary.average.unit)}
                      </span>
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {summary.count} mesure{summary.count > 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              // Synchroniser toutes les sources
              fetch("/api/health/sync", { method: "GET" })
                .then(() => fetchSummaries())
                .catch(console.error);
            }}
            className="flex-1"
          >
            Synchroniser les sources
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/profile"}
          >
            Configurer
          </Button>
          <Button
            variant="outline"
            onClick={fetchSummaries}
          >
            Actualiser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

