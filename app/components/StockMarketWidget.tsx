"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Search, TrendingUp, TrendingDown, Star, Loader2, X, Plus, Clock, Radio } from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { StockQuote, StockSearchResult } from "@/app/lib/services/stock-market";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { StockDetailView } from "@/app/components/StockDetailView";

export function StockMarketWidget() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Charger les favoris au montage
  useEffect(() => {
    loadFavorites();
  }, []);

  // Charger les cotations des favoris en temps réel
  useEffect(() => {
    if (favorites.length > 0) {
      loadQuotes();
      // Rafraîchir toutes les 15 secondes pour du temps réel (compromis entre performance et actualité)
      const interval = setInterval(loadQuotes, 15000);
      return () => clearInterval(interval);
    }
  }, [favorites]);

  const loadFavorites = async () => {
    try {
      const response = await fetch("/api/favorites/stocks");
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites || []);
      }
    } catch (err) {
      console.error("Erreur chargement favoris:", err);
    }
  };

  const loadQuotes = async () => {
    if (favorites.length === 0) return;

    setLoading(true);
    try {
      const symbols = favorites.map((f: any) => f.symbol);
      const response = await fetch(`/api/stock-market/quotes?symbols=${symbols.join(",")}&t=${Date.now()}`, {
        cache: 'no-store' // Forcer la récupération de données fraîches
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuotes(data.quotes || []);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error("Erreur chargement cotations:", err);
    } finally {
      setLoading(false);
    }
  };

  const searchStocks = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchResults([]);
    setError(null);

    try {
      const response = await fetch(`/api/stock-market/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      } else {
        setError("Erreur lors de la recherche");
      }
    } catch (err) {
      setError("Erreur lors de la recherche");
    } finally {
      setSearching(false);
    }
  };

  const addFavorite = async (stock: StockSearchResult) => {
    try {
      const response = await fetch("/api/favorites/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stock),
      });

      if (response.ok) {
        await loadFavorites();
        setSearchQuery("");
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Erreur ajout favori:", err);
    }
  };

  const removeFavorite = async (symbol: string) => {
    try {
      const response = await fetch(`/api/favorites/stocks?symbol=${symbol}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadFavorites();
        setQuotes(prev => prev.filter(q => q.symbol !== symbol));
      }
    } catch (err) {
      console.error("Erreur suppression favori:", err);
    }
  };

  const isFavorite = (symbol: string) => {
    return favorites.some((f: any) => f.symbol === symbol);
  };

  const handleToggleFavorite = async (symbol: string, name: string) => {
    if (isFavorite(symbol)) {
      await removeFavorite(symbol);
    } else {
      // Trouver le stock dans les résultats de recherche ou les quotes
      const stock = searchResults.find((r) => r.symbol === symbol) || 
                    quotes.find((q) => q.symbol === symbol);
      if (stock) {
        await addFavorite({
          symbol,
          name: stock.name || name,
          exchange: stock.exchange,
          currency: stock.currency,
        });
      } else {
        // Si pas trouvé, utiliser les paramètres fournis
        await addFavorite({ symbol, name });
      }
    }
  };

  // Si un stock est sélectionné, afficher la vue détaillée
  if (selectedStock) {
    return (
      <StockDetailView
        symbol={selectedStock.symbol}
        name={selectedStock.name}
        onClose={() => setSelectedStock(null)}
        onToggleFavorite={handleToggleFavorite}
        isFavorite={isFavorite}
      />
    );
  }

  return (
    <Card className="bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] shadow-[var(--shadow-card)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
              <TrendingUp className="h-5 w-5" />
              Marchés en direct
            </CardTitle>
            <CardDescription className="text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
              Suivez vos cotations favorites en temps réel
            </CardDescription>
          </div>
          {lastUpdate && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Radio className="h-3 w-3 animate-pulse" />
                <span className="font-medium">Temps réel</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-muted))] dark:text-[hsl(var(--text-muted))]">
                <Clock className="h-3 w-3" />
                <span>
                  {format(lastUpdate, "dd/MM/yyyy HH:mm:ss", { locale: fr })}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recherche */}
        <div className="flex gap-2">
          <Input
            placeholder="Rechercher une cotation (ex: AAPL, CAC40)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                searchStocks();
              }
            }}
            className="flex-1"
          />
          <Button onClick={searchStocks} disabled={searching || !searchQuery.trim()}>
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Résultats de recherche */}
        {searchResults.length > 0 && (
          <div className="space-y-2 rounded-lg border border-[hsl(var(--border))] p-3">
            <p className="text-sm font-medium text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
              Résultats de recherche
            </p>
            {searchResults.map((result) => (
              <div
                key={result.symbol}
                className="group cursor-pointer flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] dark:bg-[hsl(var(--surface-alt))] p-2 transition-all hover:shadow-md hover:border-[hsl(var(--primary))]/30"
                onClick={() => setSelectedStock({ symbol: result.symbol, name: result.name })}
              >
                <div className="flex-1">
                  <p className="font-medium text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                    {result.name}
                  </p>
                  <p className="text-xs text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
                    {result.symbol} {result.exchange && `• ${result.exchange}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={isFavorite(result.symbol) ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isFavorite(result.symbol)) {
                        removeFavorite(result.symbol);
                      } else {
                        addFavorite(result);
                      }
                    }}
                  >
                    <Star className={cn("h-4 w-4", isFavorite(result.symbol) && "fill-current")} />
                  </Button>
                  <span className="text-xs text-[hsl(var(--text-muted))] dark:text-[hsl(var(--text-muted))]">
                    →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cotations favorites */}
        {favorites.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
              Mes cotations ({favorites.length})
            </p>
            {loading && quotes.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
              </div>
            ) : quotes.length > 0 ? (
              <div className="space-y-2">
                {quotes.map((quote) => {
                  const isPositive = quote.change >= 0;
                  return (
                    <div
                      key={quote.symbol}
                      className="group cursor-pointer rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] dark:bg-[hsl(var(--surface-alt))] p-3 transition-all hover:shadow-md hover:border-[hsl(var(--primary))]/30"
                      onClick={() => setSelectedStock({ symbol: quote.symbol, name: quote.name })}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                              {quote.name}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFavorite(quote.symbol);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
                            {quote.symbol} {quote.exchange && `• ${quote.exchange}`}
                          </p>
                          <div className="mt-2 flex items-center gap-4">
                            <span className="text-lg font-bold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                              {quote.price.toFixed(2)} {quote.currency}
                            </span>
                            <div className="flex flex-col items-end">
                              <span
                                className={cn(
                                  "flex items-center gap-1 text-sm font-semibold",
                                  isPositive
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                )}
                              >
                                {isPositive ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                )}
                                {isPositive ? "+" : ""}
                                {quote.change.toFixed(2)} {quote.currency}
                              </span>
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  isPositive
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                )}
                              >
                                ({isPositive ? "+" : ""}
                                {quote.changePercent.toFixed(2)}%)
                              </span>
                            </div>
                          </div>
                          {quote.timestamp && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-[hsl(var(--text-muted))] dark:text-[hsl(var(--text-muted))]">
                              <Clock className="h-3 w-3" />
                              <span>
                                Dernière mise à jour: {format(new Date(quote.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: fr })}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-[hsl(var(--text-muted))] dark:text-[hsl(var(--text-muted))] ml-2">
                          →
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] text-center py-4">
                Aucune cotation disponible
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] mb-4">
              Aucune cotation suivie
            </p>
            <p className="text-xs text-[hsl(var(--text-muted))] dark:text-[hsl(var(--text-muted))]">
              Recherchez une cotation et ajoutez-la à vos favoris pour la suivre
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-[hsl(var(--danger))]/20 bg-[hsl(var(--danger))]/10 p-3">
            <p className="text-sm text-[hsl(var(--danger))]">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

