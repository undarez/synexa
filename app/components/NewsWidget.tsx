"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Newspaper, ExternalLink, TrendingUp, Clock, Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import type { NewsArticle } from "@/app/lib/services/news";

export function NewsWidget() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestNews();
  }, []);

  const fetchLatestNews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Récupérer les actualités personnalisées (personnalisation activée par défaut)
      const response = await fetch("/api/news/search?category=general&personalized=true");
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des actualités");
      }
      
      const data = await response.json();
      setArticles(data.articles?.slice(0, 5) || []); // Limiter à 5 articles pour le widget
    } catch (err) {
      console.error("Erreur actualités:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 animate-pulse" />
            <div>
              <h3 className="font-semibold text-lg">Actualités</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Chargement...</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
        </div>
      </div>
    );
  }

  if (error || articles.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Newspaper className="h-10 w-10 text-[hsl(var(--muted-foreground))]" />
            <div>
              <h3 className="font-semibold text-lg text-[hsl(var(--foreground))]">Actualités</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {error || "Aucune actualité disponible"}
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/news"
          className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gradient-to-r from-[hsl(var(--primary))] to-purple-600 text-white hover:from-[hsl(var(--primary))]/90 hover:to-purple-600/90 transition-all duration-200 hover:scale-105 text-sm font-medium"
        >
          <Newspaper className="h-4 w-4" />
          Voir toutes les actualités
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec icône animée */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Newspaper className="h-10 w-10 text-blue-500" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-ping" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-[hsl(var(--foreground))]">Actualités</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {articles.length} article{articles.length > 1 ? "s" : ""} récent{articles.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Link
          href="/news"
          className="text-xs text-[hsl(var(--primary))] hover:underline font-medium"
        >
          Voir tout →
        </Link>
      </div>

      {/* Liste des articles avec animations */}
      <div className="space-y-3">
        {articles.map((article, index) => (
          <div
            key={index}
            className={cn(
              "group relative p-3 rounded-lg border border-[hsl(var(--border))] bg-gradient-to-br from-white/50 to-blue-50/30 dark:from-zinc-800/50 dark:to-blue-950/20 hover:shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer",
              "animate-in fade-in slide-in-from-bottom-4",
            )}
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={async () => {
              // Track l'activité de consultation
              try {
                await fetch("/api/news/track", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ article }),
                });
              } catch (err) {
                // Ignorer les erreurs silencieusement
              }
              window.open(article.url, "_blank", "noopener,noreferrer");
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <TrendingUp className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-[hsl(var(--foreground))] line-clamp-2 group-hover:text-[hsl(var(--primary))] transition-colors">
                  {article.title}
                </h4>
                {article.description && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">
                    {article.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <span className="font-medium text-[hsl(var(--foreground))]">{article.source}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(new Date(article.publishedAt), "PP", { locale: fr })}
                    </span>
                  </div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Lien vers la page complète */}
      <Link
        href="/news"
        className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gradient-to-r from-[hsl(var(--primary))] to-purple-600 text-white hover:from-[hsl(var(--primary))]/90 hover:to-purple-600/90 transition-all duration-200 hover:scale-105 text-sm font-medium"
      >
        <Newspaper className="h-4 w-4" />
        Voir toutes les actualités
      </Link>
    </div>
  );
}

