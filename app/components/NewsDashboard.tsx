"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Newspaper, TrendingUp, Loader2, ExternalLink, Star, Clock, TrendingDown } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { NewsArticle } from "@/app/lib/services/news";
import { cn } from "@/app/lib/utils";
import type { StockQuote } from "@/app/lib/services/stock-market";
import { StockDetailView } from "@/app/components/StockDetailView";

interface NewsDashboardProps {
  onToggleFavorite?: (article: NewsArticle) => void;
  isFavorite?: (url: string) => boolean;
}

export function NewsDashboard({ onToggleFavorite, isFavorite }: NewsDashboardProps) {
  const [topArticles, setTopArticles] = useState<NewsArticle[]>([]);
  const [stockQuotes, setStockQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null);
  const [clickedArticleIndex, setClickedArticleIndex] = useState<number | null>(null);
  const [clickedStockIndex, setClickedStockIndex] = useState<number | null>(null);

  useEffect(() => {
    loadDashboardData();
    // Rafraîchir toutes les 15 secondes pour du temps réel
    const interval = setInterval(loadDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Charger les 5 articles les plus pertinents
      const articlesResponse = await fetch("/api/news/search?personalized=true");
      if (articlesResponse.ok) {
        const articlesData = await articlesResponse.json();
        setTopArticles((articlesData.articles || []).slice(0, 5));
      }

      // Charger les cotations favorites
      const favoritesResponse = await fetch("/api/favorites/stocks");
      if (favoritesResponse.ok) {
        const favoritesData = await favoritesResponse.json();
        const favorites = favoritesData.favorites || [];
        
        if (favorites.length > 0) {
          const symbols = favorites.map((f: any) => f.symbol);
          const quotesResponse = await fetch(`/api/stock-market/quotes?symbols=${symbols.join(",")}&t=${Date.now()}`, {
            cache: 'no-store' // Forcer la récupération de données fraîches
          });
          if (quotesResponse.ok) {
            const quotesData = await quotesResponse.json();
            setStockQuotes((quotesData.quotes || []).slice(0, 5));
          }
        }
      }
    } catch (err) {
      console.error("Erreur chargement dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card className="bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] shadow-[var(--shadow-card)]">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] shadow-[var(--shadow-card)]">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-6 grid gap-6 lg:grid-cols-2">
      {/* Articles les plus pertinents */}
      <Card className="bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
            <Newspaper className="h-5 w-5" />
            Articles les plus pertinents
          </CardTitle>
          <CardDescription className="text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
            Sélectionnés selon vos préférences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topArticles.length > 0 ? (
              topArticles.map((article, index) => (
                <div
                  key={index}
                  className={cn(
                    "group cursor-pointer rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] dark:bg-[hsl(var(--surface-alt))] p-3 transition-all duration-200",
                    clickedArticleIndex === index
                      ? "scale-95 shadow-lg border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5"
                      : "hover:shadow-md hover:border-[hsl(var(--primary))]/30 hover:scale-[1.02]"
                  )}
                  onClick={() => {
                    setClickedArticleIndex(index);
                    setTimeout(() => {
                      window.open(article.url, "_blank", "noopener,noreferrer");
                      setClickedArticleIndex(null);
                    }, 150);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-[hsl(var(--text))] dark:text-[hsl(var(--text))] line-clamp-2 mb-1 group-hover:text-[hsl(var(--primary))] transition-colors">
                        {article.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
                        <span>{article.source}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(article.publishedAt), "PP", { locale: fr })}
                        </span>
                      </div>
                    </div>
                    {onToggleFavorite && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          "h-6 w-6 p-0 flex-shrink-0 transition-all duration-200",
                          isFavorite && isFavorite(article.url) && "animate-pulse"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(article);
                        }}
                      >
                        <Star
                          className={cn(
                            "h-3 w-3 transition-all duration-200",
                            isFavorite && isFavorite(article.url)
                              ? "fill-[hsl(var(--warning))] text-[hsl(var(--warning))] scale-110"
                              : "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--warning))] hover:scale-110"
                          )}
                        />
                      </Button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(article.url, "_blank", "noopener,noreferrer");
                      }}
                    >
                      Lire <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                    <span className="text-xs text-[hsl(var(--text-muted))] dark:text-[hsl(var(--text-muted))]">
                      →
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-center text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] py-4">
                Aucun article disponible
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bourse en direct */}
      <Card className="bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] shadow-[var(--shadow-card)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                <TrendingUp className="h-5 w-5" />
                Bourse en direct
              </CardTitle>
              <CardDescription className="text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
                Vos cotations favorites en temps réel
              </CardDescription>
            </div>
            {stockQuotes.length > 0 && stockQuotes[0]?.timestamp && (
              <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-muted))] dark:text-[hsl(var(--text-muted))]">
                <Clock className="h-3 w-3" />
                <span>
                  {format(new Date(stockQuotes[0].timestamp), "dd/MM/yyyy HH:mm:ss", { locale: fr })}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stockQuotes.length > 0 ? (
              stockQuotes.map((quote, index) => {
                const isPositive = quote.change >= 0;
                return (
                  <div
                    key={quote.symbol}
                    className={cn(
                      "flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] dark:bg-[hsl(var(--surface-alt))] p-3 cursor-pointer transition-all duration-200",
                      clickedStockIndex === index
                        ? "scale-95 shadow-lg border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5"
                        : "hover:shadow-md hover:border-[hsl(var(--primary))]/30 hover:scale-[1.02]"
                    )}
                    onClick={() => {
                      setClickedStockIndex(index);
                      setTimeout(() => {
                        setSelectedStock({ symbol: quote.symbol, name: quote.name });
                        setClickedStockIndex(null);
                      }, 150);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[hsl(var(--text))] dark:text-[hsl(var(--text))] truncate">
                        {quote.name}
                      </p>
                      <p className="text-xs text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
                        {quote.symbol}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                        {quote.price.toFixed(2)} {quote.currency || ""}
                      </span>
                      <div className="flex items-center gap-1">
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                        )}
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {isPositive ? "+" : ""}
                          {quote.change.toFixed(2)} ({isPositive ? "+" : ""}
                          {quote.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-center text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] py-4">
                Aucune cotation suivie. Ajoutez des favoris dans l'onglet Bourse.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal pour les détails de la cotation */}
      {selectedStock && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedStock(null)}
        >
          <div 
            className="relative w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <StockDetailView
              symbol={selectedStock.symbol}
              name={selectedStock.name}
              onClose={() => setSelectedStock(null)}
              onToggleFavorite={async (symbol: string, name: string) => {
                // Gérer l'ajout/suppression des favoris
                try {
                  const response = await fetch("/api/favorites/stocks");
                  if (response.ok) {
                    const data = await response.json();
                    const isFavorite = data.favorites?.some((f: any) => f.symbol === symbol);
                    
                    if (isFavorite) {
                      await fetch(`/api/favorites/stocks?symbol=${symbol}`, { method: "DELETE" });
                    } else {
                      await fetch("/api/favorites/stocks", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ symbol, name }),
                      });
                    }
                    // Recharger les données
                    loadDashboardData();
                  }
                } catch (err) {
                  console.error("Erreur toggle favori:", err);
                }
              }}
              isFavorite={(symbol: string) => {
                // Vérifier si c'est un favori
                return stockQuotes.some((q) => q.symbol === symbol);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

