"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

export function HealthWidget() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await fetch("/api/health/metrics?summary=true&days=7");
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summaries?.[0] || null);
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
            <Activity className="h-5 w-5" />
            Santé
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
            <Activity className="h-5 w-5" />
            Santé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
              Aucune donnée de santé disponible
            </p>
            <Link href="/health" className="text-xs text-[hsl(var(--primary))] hover:underline">
              Voir le tableau de bord →
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Santé
        </CardTitle>
        <CardDescription>
          Résumé de la semaine
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Moyenne</span>
            <span className="font-semibold">{summary.average?.toFixed(1)} {summary.unit || ""}</span>
          </div>
          {summary.trend && (
            <div className="flex items-center gap-2 text-sm">
              {summary.trend === "up" ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : summary.trend === "down" ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : null}
              <span className="text-[hsl(var(--muted-foreground))]">
                {summary.trend === "up" ? "En hausse" : summary.trend === "down" ? "En baisse" : "Stable"}
              </span>
            </div>
          )}
          <Link href="/health" className="text-xs text-[hsl(var(--primary))] hover:underline mt-2 block">
            Voir le tableau de bord →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}





