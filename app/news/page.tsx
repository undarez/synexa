"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Search, Loader2, Newspaper, TrendingUp, Settings, Sparkles, Star, BookOpen } from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { NewsResults } from "@/app/components/NewsResults";
import { StockMarketWidget } from "@/app/components/StockMarketWidget";
import { NewsDashboard } from "@/app/components/NewsDashboard";
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
import { cn } from "@/app/lib/utils";

export default function NewsPage() {
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<NewsCategory | "all">("all");
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [favoriteArticles, setFavoriteArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSearch, setLastSearch] = useState<string>("");
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "news" | "stocks" | "favorites">("dashboard");

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/?error=auth_required&redirect=/news");
    }
  }, [status]);

  // Charger automatiquement les actualités personnalisées au montage
  useEffect(() => {
    if (status === "authenticated" && initialLoading) {
      loadPersonalizedNews();
      loadFavoriteArticles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const loadPersonalizedNews = async () => {
    setInitialLoading(true);
    setLoading(true);
    setError(null);

    try {
      // Charger les actualités personnalisées selon le profil
      const response = await fetch("/api/news/search?personalized=true");
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement");
      }

      const data = await response.json();
      setArticles(data.articles || []);
      setLastSearch("Actualités personnalisées");
      setCategory("all");
    } catch (err) {
      console.error("Erreur chargement actualités:", err);
      // En cas d'erreur, charger les actualités générales
      try {
        const fallbackResponse = await fetch("/api/news/search?category=general");
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setArticles(fallbackData.articles || []);
          setLastSearch("Actualités générales");
          setCategory("general");
        }
      } catch (fallbackErr) {
        setError("Impossible de charger les actualités");
      }
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const loadFavoriteArticles = async () => {
    try {
      const response = await fetch("/api/favorites/articles");
      if (response.ok) {
        const data = await response.json();
        setFavoriteArticles(data.favorites || []);
      }
    } catch (err) {
      console.error("Erreur chargement favoris:", err);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await fetch("/api/news/preferences");
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (err) {
      console.error("Erreur récupération préférences:", err);
    }
  };

  const searchNews = async () => {
    if (!searchQuery.trim() && category === "all") {
      setError("Veuillez entrer un terme de recherche ou sélectionner une catégorie");
      return;
    }

    setLoading(true);
    setError(null);
    setActiveTab("news");

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append("q", searchQuery.trim());
      }
      if (category !== "all") {
        params.append("category", category);
      }
      params.append("personalized", "true"); // Toujours utiliser la personnalisation

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
      setActiveTab("news");
      // Rechercher automatiquement la catégorie
      setTimeout(() => {
        searchNews();
      }, 100);
    }
  };

  const toggleFavorite = async (article: NewsArticle) => {
    try {
      const isFavorite = favoriteArticles.some((f: any) => f.url === article.url);
      
      if (isFavorite) {
        // Supprimer des favoris
        await fetch(`/api/favorites/articles?url=${encodeURIComponent(article.url)}`, {
          method: "DELETE",
        });
      } else {
        // Ajouter aux favoris
        await fetch("/api/favorites/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ article }),
        });
      }
      
      await loadFavoriteArticles();
    } catch (err) {
      console.error("Erreur toggle favori:", err);
    }
  };

  const isArticleFavorite = (url: string) => {
    return favoriteArticles.some((f: any) => f.url === url);
  };

  if (status === "loading" || initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--text))] transition-colors">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-[hsl(var(--text))] dark:text-[hsl(var(--text))] mb-2">
                Actualités
              </h1>
              <p className="text-lg text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
                Restez informé avec des actualités personnalisées selon vos préférences
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setShowPreferences(!showPreferences);
                if (!showPreferences && !preferences) {
                  fetchPreferences();
                }
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Préférences
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-[hsl(var(--border))]">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={cn(
                "px-4 py-2 font-medium transition-colors border-b-2",
                activeTab === "dashboard"
                  ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                  : "border-transparent text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))]"
              )}
            >
              <Sparkles className="inline h-4 w-4 mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("news")}
              className={cn(
                "px-4 py-2 font-medium transition-colors border-b-2",
                activeTab === "news"
                  ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                  : "border-transparent text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))]"
              )}
            >
              <Newspaper className="inline h-4 w-4 mr-2" />
              Actualités
            </button>
            <button
              onClick={() => setActiveTab("stocks")}
              className={cn(
                "px-4 py-2 font-medium transition-colors border-b-2",
                activeTab === "stocks"
                  ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                  : "border-transparent text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))]"
              )}
            >
              <TrendingUp className="inline h-4 w-4 mr-2" />
              Bourse
            </button>
            <button
              onClick={() => setActiveTab("favorites")}
              className={cn(
                "px-4 py-2 font-medium transition-colors border-b-2",
                activeTab === "favorites"
                  ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                  : "border-transparent text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))]"
              )}
            >
              <BookOpen className="inline h-4 w-4 mr-2" />
              Mes favoris ({favoriteArticles.length})
            </button>
          </div>
        </div>

        {/* Préférences */}
        {showPreferences && (
          <Card className="mb-6 bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                <Sparkles className="h-5 w-5 text-[hsl(var(--primary))]" />
                Préférences d'actualités
              </CardTitle>
              <CardDescription className="text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
                Personnalisez vos actualités selon vos préférences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {preferences ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2 text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                      Catégories préférées :
                    </p>
                    <p className="text-xs text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
                      {preferences.preferredCategories?.length > 0
                        ? preferences.preferredCategories.join(", ")
                        : "Aucune (inférées automatiquement)"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2 text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                      Sources préférées :
                    </p>
                    <p className="text-xs text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
                      {preferences.preferredSources?.length > 0
                        ? preferences.preferredSources.join(", ")
                        : "Toutes les sources"}
                    </p>
                  </div>
                  <p className="text-xs text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] italic">
                    💡 Vos préférences sont inférées automatiquement selon vos consultations d'articles.
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--primary))]" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contenu selon l'onglet actif */}
        {activeTab === "dashboard" && (
          <NewsDashboard
            onToggleFavorite={toggleFavorite}
            isFavorite={isArticleFavorite}
          />
        )}

        {activeTab === "news" && (
          <>
            {/* Barre de recherche */}
            <Card className="mb-6 bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                  <Search className="h-5 w-5" />
                  Rechercher des actualités
                </CardTitle>
                <CardDescription className="text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
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
                      className="bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))]"
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
              <h2 className="mb-3 text-lg font-semibold text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
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
              <Card className="mb-6 border-[hsl(var(--danger))]/20 bg-[hsl(var(--danger))]/10">
                <CardContent className="pt-6">
                  <p className="text-sm text-[hsl(var(--danger))]">{error}</p>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <Card className="bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] shadow-[var(--shadow-card)]">
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
                </CardContent>
              </Card>
            ) : articles.length > 0 ? (
              <NewsResults 
                query={lastSearch || searchQuery || category} 
                articles={articles}
                onToggleFavorite={toggleFavorite}
                isFavorite={isArticleFavorite}
              />
            ) : lastSearch ? (
              <Card className="bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] shadow-[var(--shadow-card)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[hsl(var(--text))] dark:text-[hsl(var(--text))]">
                    <Newspaper className="h-5 w-5" />
                    Aucun résultat
                  </CardTitle>
                  <CardDescription className="text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))]">
                    Aucun article trouvé pour "{lastSearch}". Essayez avec d'autres mots-clés.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}
          </>
        )}

        {activeTab === "stocks" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-3">
              <StockMarketWidget />
            </div>
          </div>
        )}

        {activeTab === "favorites" && (
          <div className="space-y-4">
            {favoriteArticles.length > 0 ? (
              <NewsResults
                query="Mes articles favoris"
                articles={favoriteArticles.map((f: any) => ({
                  title: f.title,
                  description: f.description || "",
                  url: f.url,
                  source: f.source,
                  imageUrl: f.imageUrl || undefined,
                  publishedAt: f.publishedAt,
                  category: f.category || undefined,
                }))}
                onToggleFavorite={toggleFavorite}
                isFavorite={isArticleFavorite}
              />
            ) : (
              <Card className="bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))] shadow-[var(--shadow-card)]">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-[hsl(var(--text-muted))] dark:text-[hsl(var(--text-muted))] mb-4" />
                  <p className="text-lg font-medium text-[hsl(var(--text))] dark:text-[hsl(var(--text))] mb-2">
                    Aucun article favori
                  </p>
                  <p className="text-sm text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] text-center">
                    Ajoutez des articles à vos favoris en cliquant sur l'icône étoile
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
