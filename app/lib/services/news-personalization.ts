/**
 * Service de personnalisation des actualités selon les préférences utilisateur
 */

import prisma from "@/app/lib/prisma";
import { searchNews, type NewsArticle, type NewsCategory } from "./news";

export interface NewsPreferences {
  preferredCategories?: NewsCategory[];
  preferredSources?: string[];
  excludedKeywords?: string[];
  language?: string;
  maxArticles?: number;
}

/**
 * Récupère les préférences d'actualités d'un utilisateur
 */
export async function getUserNewsPreferences(userId: string): Promise<NewsPreferences> {
  try {
    const preferences = await prisma.preference.findMany({
      where: {
        userId,
        key: {
          startsWith: "news_",
        },
      },
    });

    const prefs: NewsPreferences = {
      preferredCategories: [],
      preferredSources: [],
      excludedKeywords: [],
      language: "fr",
      maxArticles: 20,
    };

    preferences.forEach((pref) => {
      const value = pref.value as any;
      switch (pref.key) {
        case "news_categories":
          prefs.preferredCategories = Array.isArray(value) ? value : [];
          break;
        case "news_sources":
          prefs.preferredSources = Array.isArray(value) ? value : [];
          break;
        case "news_excluded_keywords":
          prefs.excludedKeywords = Array.isArray(value) ? value : [];
          break;
        case "news_language":
          prefs.language = typeof value === "string" ? value : "fr";
          break;
        case "news_max_articles":
          prefs.maxArticles = typeof value === "number" ? value : 20;
          break;
      }
    });

    // Si pas de préférences, analyser les patterns d'activité
    if (!prefs.preferredCategories || prefs.preferredCategories.length === 0) {
      prefs.preferredCategories = await inferPreferredCategories(userId);
    }

    return prefs;
  } catch (error) {
    console.error("[News Personalization] Erreur récupération préférences:", error);
    return {
      preferredCategories: [],
      preferredSources: [],
      excludedKeywords: [],
      language: "fr",
      maxArticles: 20,
    };
  }
}

/**
 * Infère les catégories préférées basées sur l'activité utilisateur
 */
async function inferPreferredCategories(userId: string): Promise<NewsCategory[]> {
  try {
    // Analyser les recherches d'actualités précédentes
    const activities = await prisma.userActivity.findMany({
      where: {
        userId,
        activityType: "news_viewed",
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
        },
      },
      select: {
        metadata: true,
      },
      take: 50,
    });

    const categoryCounts: Record<string, number> = {};
    activities.forEach((activity) => {
      const metadata = activity.metadata as any;
      if (metadata?.category) {
        categoryCounts[metadata.category] = (categoryCounts[metadata.category] || 0) + 1;
      }
    });

    // Retourner les 3 catégories les plus consultées
    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category as NewsCategory);

    return topCategories.length > 0 ? topCategories : ["general"];
  } catch (error) {
    console.error("[News Personalization] Erreur inférence catégories:", error);
    return ["general"];
  }
}

/**
 * Filtre et personnalise les articles selon les préférences
 */
export function personalizeNewsArticles(
  articles: NewsArticle[],
  preferences: NewsPreferences
): NewsArticle[] {
  let filtered = [...articles];

  // Filtrer par sources préférées (si spécifiées)
  if (preferences.preferredSources && preferences.preferredSources.length > 0) {
    filtered = filtered.filter((article) =>
      preferences.preferredSources!.some((source) =>
        article.source.toLowerCase().includes(source.toLowerCase())
      )
    );
  }

  // Exclure les articles avec mots-clés indésirables
  if (preferences.excludedKeywords && preferences.excludedKeywords.length > 0) {
    filtered = filtered.filter((article) => {
      const titleLower = article.title.toLowerCase();
      const descLower = (article.description || "").toLowerCase();
      return !preferences.excludedKeywords!.some((keyword) =>
        titleLower.includes(keyword.toLowerCase()) || descLower.includes(keyword.toLowerCase())
      );
    });
  }

  // Prioriser les catégories préférées
  if (preferences.preferredCategories && preferences.preferredCategories.length > 0) {
    filtered.sort((a, b) => {
      const aCategory = a.category || "general";
      const bCategory = b.category || "general";
      const aIndex = preferences.preferredCategories!.indexOf(aCategory as NewsCategory);
      const bIndex = preferences.preferredCategories!.indexOf(bCategory as NewsCategory);

      // Si les deux sont dans les préférées, garder l'ordre original
      if (aIndex >= 0 && bIndex >= 0) return 0;
      // Si seulement a est préférée, la mettre en premier
      if (aIndex >= 0) return -1;
      // Si seulement b est préférée, la mettre en premier
      if (bIndex >= 0) return 1;
      // Sinon, garder l'ordre original
      return 0;
    });
  }

  // Limiter le nombre d'articles
  const maxArticles = preferences.maxArticles || 20;
  return filtered.slice(0, maxArticles);
}

/**
 * Récupère les actualités personnalisées pour un utilisateur
 */
export async function getPersonalizedNews(
  userId: string,
  query?: string,
  category?: NewsCategory
): Promise<{
  articles: NewsArticle[];
  sources: string[];
  personalization: {
    applied: boolean;
    preferredCategories?: NewsCategory[];
    filteredCount?: number;
  };
}> {
  const preferences = await getUserNewsPreferences(userId);

  // Si des catégories sont préférées et pas de query/category spécifique, utiliser les préférées
  let searchCategory = category;
  if (!searchCategory && !query && preferences.preferredCategories && preferences.preferredCategories.length > 0) {
    // Utiliser la première catégorie préférée
    searchCategory = preferences.preferredCategories[0];
  }

  // Rechercher les actualités
  const result = await searchNews(query || "", searchCategory, preferences.language || "fr");

  // Personnaliser les résultats
  const personalizedArticles = personalizeNewsArticles(result.articles, preferences);

  return {
    articles: personalizedArticles,
    sources: result.sources,
    personalization: {
      applied: true,
      preferredCategories: preferences.preferredCategories,
      filteredCount: result.articles.length - personalizedArticles.length,
    },
  };
}

/**
 * Enregistre une préférence d'actualités
 */
export async function saveNewsPreference(
  userId: string,
  key: string,
  value: any
): Promise<void> {
  await prisma.preference.upsert({
    where: {
      userId_key: {
        userId,
        key: `news_${key}`,
      },
    },
    update: {
      value: value as any,
    },
    create: {
      userId,
      key: `news_${key}`,
      value: value as any,
    },
  });
}

/**
 * Track une activité de consultation d'actualités
 */
export async function trackNewsActivity(
  userId: string,
  article: NewsArticle
): Promise<void> {
  try {
    await prisma.userActivity.create({
      data: {
        userId,
        activityType: "news_viewed",
        entityType: "NewsArticle",
        metadata: {
          title: article.title,
          source: article.source,
          category: article.category,
          url: article.url,
        },
      },
    });
  } catch (error) {
    console.error("[News Personalization] Erreur tracking:", error);
  }
}

