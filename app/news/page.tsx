"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Search, Loader2, Newspaper, TrendingUp } from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { NewsResults } from "@/app/components/NewsResults";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import type { NewsArticle, NewsCategory } from "@/app/lib/services/news";
import { NEWS_CATEGORIES } from "@/app/lib/services/news";
import { Footer } from "@/app/components/Footer";

export default function NewsPage() {
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<NewsCategory | "all">("all");
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSearch, setLastSearch] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/?error=auth_required&redirect=/news");
    }
  }, [status]);

  const searchNews = async () => {
    if (!searchQuery.trim() && category === "all") {
      setError("Veuillez entrer un terme de recherche ou sélectionner une catégorie");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append("q", searchQuery.trim());
      }
      if (category !== "all") {
        params.append("category", category);
      }

      const response = await fetch(`/api/news/search?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Erreur lors de la recherche");
      }

      const data = await response.json();
      setArticles(data.articles || []);
      setLastSearch(searchQuery.trim() || category);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value as NewsCategory | "all");
    if (value !== "all") {
      setSearchQuery("");
      // Rechercher automatiquement la catégorie
      setTimeout(() => {
        searchNews();
      }, 100);
    }
  };

  if (status === "loading") {
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Actualités
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Recherchez et consultez les dernières actualités sur n'importe quel sujet
          </p>
        </div>

        {/* Barre de recherche */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Rechercher des actualités
            </CardTitle>
            <CardDescription>
              Entrez un sujet ou sélectionnez une catégorie
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <Input
                  placeholder="Ex: intelligence artificielle, technologie, santé..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      searchNews();
                    }
                  }}
                  disabled={loading || category !== "all"}
                />
              </div>
              <Select value={category} onValueChange={handleCategoryChange} disabled={loading}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  <SelectItem value="general">Général</SelectItem>
                  <SelectItem value="technology">Technologie</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="health">Santé</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="entertainment">Divertissement</SelectItem>
                  <SelectItem value="politics">Politique</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={searchNews} disabled={loading || (!searchQuery.trim() && category === "all")}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recherche...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Rechercher
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Catégories populaires */}
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Catégories populaires
          </h2>
          <div className="flex flex-wrap gap-2">
            {NEWS_CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCategory(cat);
                  setSearchQuery("");
                  setTimeout(() => {
                    searchNews();
                  }, 100);
                }}
                disabled={loading}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                {cat === "general"
                  ? "Général"
                  : cat === "technology"
                  ? "Technologie"
                  : cat === "business"
                  ? "Business"
                  : cat === "health"
                  ? "Santé"
                  : cat === "science"
                  ? "Science"
                  : cat === "sports"
                  ? "Sports"
                  : cat === "entertainment"
                  ? "Divertissement"
                  : cat === "politics"
                  ? "Politique"
                  : cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Résultats */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </CardContent>
          </Card>
        ) : articles.length > 0 ? (
          <NewsResults query={lastSearch || searchQuery || category} articles={articles} />
        ) : lastSearch ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                Aucun résultat
              </CardTitle>
              <CardDescription>
                Aucun article trouvé pour "{lastSearch}". Essayez avec d'autres mots-clés.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}


