"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Loader2, Sparkles, CheckCircle2, Clock, Zap, Calendar, Bell } from "lucide-react";
import type { PersonalizedRecommendation } from "@/app/lib/learning/recommendations";

export function PersonalizedRecommendations() {
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/learning/recommendations?sync=true");
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des recommandations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (recommendation: PersonalizedRecommendation) => {
    if (!recommendation.action) return;

    try {
      switch (recommendation.action.type) {
        case "create_task":
          await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(recommendation.action.data),
          });
          break;
        case "execute_routine":
          await fetch(`/api/routines/${recommendation.action.data.routineId}/execute`, {
            method: "POST",
          });
          break;
      }
      // Rafraîchir les recommandations
      fetchRecommendations();
    } catch (error) {
      console.error("Erreur lors de l'exécution de l'action:", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "task":
        return <CheckCircle2 className="h-5 w-5" />;
      case "event":
        return <Calendar className="h-5 w-5" />;
      case "routine":
        return <Zap className="h-5 w-5" />;
      case "reminder":
        return <Bell className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10";
      case "medium":
        return "border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10";
      default:
        return "border-[hsl(var(--muted))] bg-[hsl(var(--muted))]";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[hsl(var(--primary))]" />
            Recommandations personnalisées
          </CardTitle>
          <CardDescription>
            Synexa apprend de vos habitudes pour vous proposer des suggestions adaptées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[hsl(var(--primary))]" />
            Recommandations personnalisées
          </CardTitle>
          <CardDescription>
            Synexa apprend de vos habitudes pour vous proposer des suggestions adaptées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Continuez à utiliser Synexa pour que nous puissions apprendre vos habitudes et vous proposer des recommandations personnalisées.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[hsl(var(--primary))]" />
          Recommandations personnalisées
        </CardTitle>
        <CardDescription>
          Basées sur vos habitudes et patterns d'utilisation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.slice(0, 5).map((rec, index) => (
            <div
              key={index}
              className={`rounded-lg border p-4 transition-all hover:shadow-md ${getPriorityColor(rec.priority)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0 text-[hsl(var(--primary))]">
                  {getIcon(rec.type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[hsl(var(--foreground))]">{rec.title}</h4>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    {rec.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {rec.reason}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      • Confiance: {Math.round(rec.confidence * 100)}%
                    </span>
                  </div>
                  {rec.action && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => handleAction(rec)}
                    >
                      Appliquer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">
          💡 Plus vous utilisez Synexa, plus les recommandations deviennent précises
        </div>
      </CardContent>
    </Card>
  );
}







