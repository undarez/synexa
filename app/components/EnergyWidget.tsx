"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Loader2,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface EnergyStats {
  total: number;
  average: number;
  totalCost: number;
  trend: number;
}

export function EnergyWidget() {
  const [stats, setStats] = useState<EnergyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayConsumption, setTodayConsumption] = useState<number | null>(null);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    fetchEnergyData();
  }, []);

  const fetchEnergyData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/energy/consumption?period=7d");
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        if (data.data && data.data.length > 0) {
          setTodayConsumption(data.data[data.data.length - 1].consumption);
        }
        setConfigured(true);
      } else if (response.status === 400) {
        setConfigured(false);
      }
    } catch (error) {
      console.error("Erreur chargement énergie:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-10 w-10 text-[hsl(var(--primary))]" />
            <div>
              <h3 className="font-semibold text-lg">Énergie</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Chargement...</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-10 w-10 text-[hsl(var(--muted-foreground))]" />
            <div>
              <h3 className="font-semibold text-lg">Énergie</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Non configuré
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              Configurez votre compteur dans votre profil
            </p>
          </div>
        </div>
        <Link href="/energy">
          <Button variant="outline" className="w-full" size="sm">
            Configurer
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-10 w-10 text-[hsl(var(--primary))]" />
          <div>
            <h3 className="font-semibold text-lg">Énergie</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Consommation 7 jours
            </p>
          </div>
        </div>
        <Link href="/energy">
          <Button variant="ghost" size="sm">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {stats && (
        <>
          {/* Aujourd'hui */}
          <div className="rounded-lg border border-[hsl(var(--border))] bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(var(--primary))]/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Aujourd'hui</p>
                <p className="text-2xl font-bold">
                  {todayConsumption !== null ? `${todayConsumption.toFixed(1)} kWh` : "N/A"}
                </p>
              </div>
              <Zap className="h-8 w-8 text-[hsl(var(--primary))]" />
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">7 jours</p>
              <p className="text-lg font-bold">{stats.total.toFixed(1)} kWh</p>
            </div>
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Coût</p>
              <p className="text-lg font-bold">{stats.totalCost.toFixed(2)} €</p>
            </div>
          </div>

          {/* Tendance */}
          <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Tendance</span>
            <div className="flex items-center gap-2">
              {stats.trend > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-500">
                    +{stats.trend.toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">
                    {stats.trend.toFixed(1)}%
                  </span>
                </>
              )}
            </div>
          </div>

          <Link href="/energy">
            <Button variant="outline" className="w-full" size="sm">
              Voir le détail
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}


