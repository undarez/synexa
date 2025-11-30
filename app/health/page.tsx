"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, Heart, Moon, Activity, Droplet } from "lucide-react";
import { HealthMetricType } from "@prisma/client";

interface HealthMetric {
  id: string;
  type: HealthMetricType;
  value: number;
  unit?: string;
  recordedAt: string;
  source?: string;
}

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

const metricLabels: Record<HealthMetricType, { label: string; icon: any; color: string; gradient: string }> = {
  SLEEP: {
    label: "Sommeil",
    icon: Moon,
    color: "text-blue-500",
    gradient: "from-blue-500/20 to-indigo-500/20",
  },
  ACTIVITY: {
    label: "Activité",
    icon: Activity,
    color: "text-green-500",
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  HEART_RATE: {
    label: "Fréquence cardiaque",
    icon: Heart,
    color: "text-red-500",
    gradient: "from-red-500/20 to-pink-500/20",
  },
  WEIGHT: {
    label: "Poids",
    icon: Activity,
    color: "text-purple-500",
    gradient: "from-purple-500/20 to-violet-500/20",
  },
  STEPS: {
    label: "Pas",
    icon: Activity,
    color: "text-green-500",
    gradient: "from-green-500/20 to-teal-500/20",
  },
  CALORIES: {
    label: "Calories",
    icon: Activity,
    color: "text-orange-500",
    gradient: "from-orange-500/20 to-amber-500/20",
  },
  HYDRATION: {
    label: "Hydratation",
    icon: Droplet,
    color: "text-cyan-500",
    gradient: "from-cyan-500/20 to-blue-500/20",
  },
  MOOD: {
    label: "Humeur",
    icon: Heart,
    color: "text-yellow-500",
    gradient: "from-yellow-500/20 to-orange-500/20",
  },
  STRESS: {
    label: "Stress",
    icon: Heart,
    color: "text-red-500",
    gradient: "from-red-500/20 to-rose-500/20",
  },
  BLOOD_PRESSURE: {
    label: "Tension artérielle",
    icon: Heart,
    color: "text-red-500",
    gradient: "from-red-500/20 to-pink-500/20",
  },
  OTHER: {
    label: "Autre",
    icon: Activity,
    color: "text-gray-500",
    gradient: "from-gray-500/20 to-slate-500/20",
  },
};

export default function HealthPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<HealthMetricsSummary[]>([]);
  const [metrics, setMetrics] = useState<Record<HealthMetricType, HealthMetric[]>>({} as any);
  const [selectedType, setSelectedType] = useState<HealthMetricType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/?error=auth_required&redirect=/health");
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchSummaries();
    }
  }, [status]);

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

  const fetchMetricsByType = async (type: HealthMetricType) => {
    try {
      const response = await fetch(`/api/health/metrics?type=${type}&limit=30`);
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des données");
      }
      const data = await response.json();
      setMetrics((prev) => ({ ...prev, [type]: data.metrics || [] }));
    } catch (err) {
      console.error("Erreur chargement métriques:", err);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch("/api/health/sync", { method: "GET" });
      if (!response.ok) {
        throw new Error("Erreur lors de la synchronisation");
      }
      await fetchSummaries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSyncing(false);
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

  const renderChart = (type: HealthMetricType, data: HealthMetric[]) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex h-64 items-center justify-center text-[hsl(var(--muted-foreground))]">
          Aucune donnée disponible
        </div>
      );
    }

    const maxValue = Math.max(...data.map((m) => m.value));
    const minValue = Math.min(...data.map((m) => m.value));
    const range = maxValue - minValue || 1;

    return (
      <div className="h-64 w-full">
        <svg viewBox="0 0 800 200" className="h-full w-full">
          <defs>
            <linearGradient id={`gradient-${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {/* Ligne */}
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            points={data
              .map(
                (m, i) =>
                  `${(i / (data.length - 1)) * 800},${200 - ((m.value - minValue) / range) * 180}`
              )
              .join(" ")}
            className={metricLabels[type].color}
          />
          {/* Zone remplie */}
          <polygon
            fill={`url(#gradient-${type})`}
            points={`0,200 ${data
              .map(
                (m, i) =>
                  `${(i / (data.length - 1)) * 800},${200 - ((m.value - minValue) / range) * 180}`
              )
              .join(" ")} 800,200`}
            className={metricLabels[type].color}
          />
          {/* Points */}
          {data.map((m, i) => (
            <circle
              key={m.id}
              cx={(i / (data.length - 1)) * 800}
              cy={200 - ((m.value - minValue) / range) * 180}
              r="4"
              fill="currentColor"
              className={metricLabels[type].color}
            />
          ))}
        </svg>
      </div>
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">
              Visualisation de vos métriques de santé
            </h1>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">
              Suivez l'évolution de vos données de santé avec des graphiques interactifs
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Synchroniser
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {summaries.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucune métrique enregistrée</CardTitle>
              <CardDescription>
                Commencez à suivre votre bien-être en synchronisant vos données ou en ajoutant des métriques manuellement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button onClick={handleSync} disabled={syncing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  Synchroniser les sources
                </Button>
                <Button variant="outline" onClick={() => window.location.href = "/profile"}>
                  Ajouter une métrique
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={summaries[0]?.type || undefined} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {summaries.map((summary) => {
                const config = metricLabels[summary.type] || metricLabels.OTHER;
                return (
                  <TabsTrigger
                    key={summary.type}
                    value={summary.type}
                    onClick={() => {
                      setSelectedType(summary.type);
                      if (!metrics[summary.type]) {
                        fetchMetricsByType(summary.type);
                      }
                    }}
                  >
                    <config.icon className="mr-2 h-4 w-4" />
                    {config.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {summaries.map((summary) => {
              const config = metricLabels[summary.type] || metricLabels.OTHER;
              const Icon = config.icon;
              const chartData = metrics[summary.type] || [];

              return (
                <TabsContent key={summary.type} value={summary.type} className="space-y-4">
                  {/* Vue d'ensemble */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className={`bg-gradient-to-br ${config.gradient}`}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Icon className={`h-5 w-5 ${config.color}`} />
                          {config.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {summary.latest && (
                          <>
                            <div className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">
                              {formatValue(summary.latest.value, summary.latest.unit)}
                            </div>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                              Dernière mesure: {new Date(summary.latest.recordedAt).toLocaleDateString("fr-FR")}
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {summary.average && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Moyenne</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
                            {formatValue(summary.average.value, summary.average.unit)}
                          </div>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            Sur {summary.average.period}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          Tendance
                          {getTrendIcon(summary.trend)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
                          {summary.count}
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          mesure{summary.count > 1 ? "s" : ""} enregistrée{summary.count > 1 ? "s" : ""}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Graphique */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Évolution dans le temps</CardTitle>
                      <CardDescription>
                        Visualisation de vos données sur les 30 derniers jours
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {chartData.length === 0 ? (
                        <div className="flex h-64 items-center justify-center">
                          <Button
                            variant="outline"
                            onClick={() => fetchMetricsByType(summary.type)}
                          >
                            Charger les données
                          </Button>
                        </div>
                      ) : (
                        <div className={config.color}>{renderChart(summary.type, chartData)}</div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
}

