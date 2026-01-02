"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ExternalLink, Calendar, Newspaper, Star } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { NewsArticle } from "@/app/lib/services/news";
import { trackNewsActivity } from "@/app/lib/services/news-personalization";
import { cn } from "@/app/lib/utils";

interface NewsResultsProps {
  query: string;
  articles: NewsArticle[];
  onClose?: () => void;
  onToggleFavorite?: (article: NewsArticle) => void;
  isFavorite?: (url: string) => boolean;
}

export function NewsResults({ query, articles, onClose, onToggleFavorite, isFavorite }: NewsResultsProps) {
  if (articles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Aucun résultat
          </CardTitle>
          <CardDescription>
            Aucun article trouvé pour "{query}"
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
          <Newspaper className="h-5 w-5" />
          Actualités : {query}
        </CardTitle>
        <CardDescription className="text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
          {articles.length} article{articles.length > 1 ? "s" : ""} trouvé{articles.length > 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {articles.map((article, index) => (
            <div
              key={index}
              className="group rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] p-4 transition-all hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="mb-3 flex-1 font-semibold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                  {article.title}
                </h3>
                {onToggleFavorite && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => onToggleFavorite(article)}
                  >
                    <Star
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isFavorite && isFavorite(article.url)
                          ? "fill-[hsl(var(--warning))] text-[hsl(var(--warning))]"
                          : "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--warning))]"
                      )}
                    />
                  </Button>
                )}
              </div>

              {article.description && (
                <p className="mb-3 text-sm text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] line-clamp-3">
                  {article.description.length > 200
                    ? `${article.description.substring(0, 200)}...`
                    : article.description}
                </p>
              )}

              <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
                <span className="font-medium text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                  {article.source}
                </span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(new Date(article.publishedAt), "PPp", { locale: fr })}
                  </span>
                </div>
                {article.category && (
                  <span className="rounded-full bg-[hsl(var(--info))]/10 px-2 py-0.5 text-[hsl(var(--info))]">
                    {article.category}
                  </span>
                )}
              </div>

              <Button
                onClick={async () => {
                  // Track l'activité de consultation
                  try {
                    const response = await fetch("/api/news/track", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ article }),
                    });
                  } catch (err) {
                    // Ignorer les erreurs silencieusement
                  }
                  window.open(article.url, "_blank", "noopener,noreferrer");
                }}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white border-[hsl(var(--primary))]"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Lire l'article complet
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

