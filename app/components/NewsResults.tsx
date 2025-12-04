"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ExternalLink, Calendar, Newspaper } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { NewsArticle } from "@/app/lib/services/news";
import { trackNewsActivity } from "@/app/lib/services/news-personalization";

interface NewsResultsProps {
  query: string;
  articles: NewsArticle[];
  onClose?: () => void;
}

export function NewsResults({ query, articles, onClose }: NewsResultsProps) {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-5 w-5" />
          Actualités : {query}
        </CardTitle>
        <CardDescription>
          {articles.length} article{articles.length > 1 ? "s" : ""} trouvé{articles.length > 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {articles.map((article, index) => (
            <div
              key={index}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-2">
                <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-50">
                  {article.title}
                </h3>
              </div>

              {article.description && (
                <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                  {article.description.length > 200
                    ? `${article.description.substring(0, 200)}...`
                    : article.description}
                </p>
              )}

              {/* Ne pas afficher l'URL directement */}

              <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {article.source}
                </span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(new Date(article.publishedAt), "PPp", { locale: fr })}
                  </span>
                </div>
                {article.category && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
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
                    className="w-full sm:w-auto"
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

