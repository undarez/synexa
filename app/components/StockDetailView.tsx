"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { TrendingUp, TrendingDown, Star, X, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { StockQuote } from "@/app/lib/services/stock-market";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

interface StockDetailViewProps {
  symbol: string;
  name: string;
  onClose: () => void;
  onToggleFavorite?: (symbol: string, name: string) => void;
  isFavorite?: (symbol: string) => boolean;
}

export function StockDetailView({
  symbol,
  name,
  onClose,
  onToggleFavorite,
  isFavorite,
}: StockDetailViewProps) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"1D" | "5D" | "1M" | "3M" | "YTD" | "1Y" | "3Y" | "5Y" | "MAX">("1D");
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  useEffect(() => {
    loadQuote();
    loadChartData();
    // Rafraîchir toutes les 15 secondes pour du temps réel
    const interval = setInterval(loadQuote, 15000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);
  
  // Recharger le graphique quand le timeframe change
  useEffect(() => {
    loadChartData();
  }, [timeframe]);

  const loadQuote = async () => {
    try {
      const response = await fetch(`/api/stock-market/quotes?symbols=${symbol}&t=${Date.now()}`, {
        cache: 'no-store' // Forcer la récupération de données fraîches
      });
      if (response.ok) {
        const data = await response.json();
        if (data.quotes && data.quotes.length > 0) {
          setQuote(data.quotes[0]);
        }
      }
    } catch (err) {
      console.error("Erreur chargement cotation:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    setLoadingChart(true);
    try {
      // Mapper les timeframes vers les paramètres Yahoo Finance
      const rangeMap: Record<string, string> = {
        "1D": "1d",
        "5D": "5d",
        "1M": "1mo",
        "3M": "3mo",
        "YTD": "ytd",
        "1Y": "1y",
        "3Y": "3y",
        "5Y": "5y",
        "MAX": "max",
      };

      const intervalMap: Record<string, string> = {
        "1D": "5m",
        "5D": "1h",
        "1M": "1d",
        "3M": "1d",
        "YTD": "1d",
        "1Y": "1wk",
        "3Y": "1mo",
        "5Y": "1mo",
        "MAX": "3mo",
      };

      const range = rangeMap[timeframe] || "1d";
      const interval = intervalMap[timeframe] || "1d";

      const response = await fetch(
        `/api/stock-market/chart?symbol=${symbol}&range=${range}&interval=${interval}`
      );

      if (response.ok) {
        const data = await response.json();
        setChartData(data.chartData || []);
      } else {
        // Fallback: générer des données simulées
        if (quote) {
          generateFallbackChartData(quote);
        }
      }
    } catch (err) {
      console.error("Erreur chargement graphique:", err);
      // Fallback: générer des données simulées
      if (quote) {
        generateFallbackChartData(quote);
      }
    } finally {
      setLoadingChart(false);
    }
  };

  const generateFallbackChartData = (quote: StockQuote) => {
    // Générer des données de graphique simulées en fallback
    const data = [];
    const basePrice = quote.price;
    const volatility = Math.abs(quote.changePercent) / 100 || 0.02;
    const points = timeframe === "1D" ? 24 : timeframe === "5D" ? 40 : 30;
    
    for (let i = 0; i < points; i++) {
      const time = new Date();
      if (timeframe === "1D") {
        time.setHours(9 + i, 0, 0, 0);
      } else {
        time.setDate(time.getDate() - (points - i));
      }
      const randomChange = (Math.random() - 0.5) * volatility * 2;
      data.push({
        date: format(time, "HH:mm", { locale: fr }),
        time: time.toISOString(),
        timestamp: time.getTime(),
        value: basePrice * (1 + randomChange),
        close: basePrice * (1 + randomChange),
      });
    }
    setChartData(data);
  };

  // Formater les données pour Recharts
  const formattedChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    
    const dateFormat = 
      timeframe === "1D" || timeframe === "5D" ? "HH:mm" :
      timeframe === "1M" || timeframe === "3M" ? "d MMM" :
      timeframe === "YTD" || timeframe === "1Y" ? "MMM yyyy" :
      "MMM yyyy";
    
    return chartData.map((point) => {
      const dateValue = point.time || point.timestamp;
      const date = point.date || (dateValue ? format(new Date(dateValue), dateFormat, { locale: fr }) : "");
      
      return {
        date,
        value: point.close || point.value || 0,
        time: dateValue,
        fullDate: dateValue ? new Date(dateValue) : null,
      };
    }).filter(p => !isNaN(p.value) && isFinite(p.value) && p.value > 0);
  }, [chartData, timeframe]);

  // Calculer la variation depuis le début
  const chartVariation = useMemo(() => {
    if (formattedChartData.length < 2) return { value: 0, percent: 0 };
    const first = formattedChartData[0].value;
    const last = formattedChartData[formattedChartData.length - 1].value;
    const diff = last - first;
    const percent = first !== 0 ? (diff / first) * 100 : 0;
    return { value: diff, percent };
  }, [formattedChartData]);

  if (loading) {
    return (
      <Card className="bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] shadow-[var(--shadow-card)]">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
        </CardContent>
      </Card>
    );
  }

  if (!quote) {
    return (
      <Card className="bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] shadow-[var(--shadow-card)]">
        <CardContent className="py-12 text-center">
          <p className="text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
            Impossible de charger les données pour {symbol}
          </p>
          <Button onClick={onClose} variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isPositive = quote.change >= 0;
  const timeframes: Array<"1D" | "5D" | "1M" | "3M" | "YTD" | "1Y" | "3Y" | "5Y" | "MAX"> = [
    "1D",
    "5D",
    "1M",
    "3M",
    "YTD",
    "1Y",
    "3Y",
    "5Y",
    "MAX",
  ];

  return (
    <Card className="bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] shadow-[var(--shadow-card)]">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-2xl font-bold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                {name}
              </CardTitle>
              {onToggleFavorite && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => onToggleFavorite(symbol, name)}
                >
                  <Star
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isFavorite && isFavorite(symbol)
                        ? "fill-[hsl(var(--warning))] text-[hsl(var(--warning))]"
                        : "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--warning))]"
                    )}
                  />
                </Button>
              )}
            </div>
            <CardDescription className="text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
              {symbol} {quote.exchange && `• ${quote.exchange}`} • {quote.currency}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prix et variation */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
              {quote.price.toFixed(2)}
            </span>
            <span className="text-lg text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
              {quote.currency}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1 text-lg font-semibold",
                isPositive ? "text-[hsl(var(--success))]" : "text-[hsl(var(--danger))]"
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              {isPositive ? "+" : ""}
              {quote.change.toFixed(2)} {quote.currency} ({isPositive ? "+" : ""}
              {quote.changePercent.toFixed(2)}%)
            </span>
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
              En temps réel
            </span>
          </div>
        </div>

        {/* Sélecteur de période */}
        <div className="flex flex-wrap gap-2">
          {timeframes.map((tf) => (
            <Button
              key={tf}
              size="sm"
              variant={timeframe === tf ? "default" : "outline"}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </Button>
          ))}
        </div>

        {/* Graphique moderne avec Recharts - Style Trade Republic/Plum */}
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] p-4">
          {loadingChart ? (
            <div className="h-80 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : formattedChartData.length > 0 ? (
            <div className="space-y-4">
              {/* En-tête avec valeur et variation */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] mb-1">
                    Valeur actuelle
                  </p>
                  <span className="text-2xl font-bold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                    {quote.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {quote.currency}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] mb-1">
                    Variation (1D)
                  </p>
                  <span
                    className={cn(
                      "text-xl font-semibold",
                      isPositive
                        ? "text-[hsl(var(--success))]"
                        : "text-[hsl(var(--danger))]"
                    )}
                  >
                    {isPositive ? "+" : ""}
                    {quote.change.toFixed(2)} {quote.currency} (
                    {isPositive ? "+" : ""}
                    {quote.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Graphique Recharts */}
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id={`colorGradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--danger))"}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--danger))"}
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }}
                      domain={["auto", "auto"]}
                      tickFormatter={(value) => value.toFixed(2)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--surface))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        color: "hsl(var(--text))",
                      }}
                      labelStyle={{ color: "hsl(var(--text-secondary))", fontSize: "12px" }}
                      formatter={(value: number) => [
                        `${value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ${quote.currency}`,
                        "Prix",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={isPositive ? "hsl(var(--success))" : "hsl(var(--danger))"}
                      strokeWidth={3}
                      fill={`url(#colorGradient-${symbol})`}
                      dot={false}
                      activeDot={{
                        r: 6,
                        fill: isPositive ? "hsl(var(--success))" : "hsl(var(--danger))",
                        stroke: "hsl(var(--surface))",
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
              <p>Aucune donnée de graphique disponible</p>
            </div>
          )}
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 gap-4">
          {quote.high && quote.low && (
            <>
              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] dark:bg-[hsl(var(--surface-alt))] p-3">
                <p className="text-xs text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] mb-1">
                  Plage de la journée
                </p>
                <p className="text-sm font-semibold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                  {quote.low.toFixed(2)} - {quote.high.toFixed(2)}
                </p>
              </div>
            </>
          )}
          {quote.open && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] dark:bg-[hsl(var(--surface-alt))] p-3">
              <p className="text-xs text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] mb-1">
                À l'ouverture
              </p>
              <p className="text-sm font-semibold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                {quote.open.toFixed(2)} {quote.currency}
              </p>
            </div>
          )}
          {quote.previousClose && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] dark:bg-[hsl(var(--surface-alt))] p-3">
              <p className="text-xs text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] mb-1">
                Clôture précédente
              </p>
              <p className="text-sm font-semibold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                {quote.previousClose.toFixed(2)} {quote.currency}
              </p>
            </div>
          )}
          {quote.volume && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] dark:bg-[hsl(var(--surface-alt))] p-3">
              <p className="text-xs text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] mb-1">
                Volume
              </p>
              <p className="text-sm font-semibold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                {quote.volume.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

