"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { VoiceInput } from "./VoiceInput";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import type { WeatherForecast } from "@/app/lib/services/weather";
import { NewsResults } from "./NewsResults";
import { speakText } from "@/app/lib/services/tts";

// Charger WeatherMap uniquement côté client (Leaflet nécessite window)
const WeatherMap = dynamic(() => import("./WeatherMap").then(mod => ({ default: mod.WeatherMap })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
    </div>
  ),
});

interface VoiceCommandHandlerProps {
  onEventCreated?: (event: any) => void;
  onRoutineCreated?: (routine: any) => void;
  onTaskCreated?: (task: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function VoiceCommandHandler({
  onEventCreated,
  onRoutineCreated,
  onTaskCreated,
  onError,
  className = "",
}: VoiceCommandHandlerProps) {
  const [processing, setProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [weatherData, setWeatherData] = useState<{
    weather: WeatherForecast;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [newsData, setNewsData] = useState<{
    query: string;
    articles: any[];
  } | null>(null);

  const handleTranscript = async (text: string) => {
    if (!text.trim()) return;

    setProcessing(true);
    setLastCommand(text);
    setResult(null);

    try {
      // Parser la commande vocale
      const response = await fetch("/api/voice/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors du parsing");
      }

      const data = await response.json();
      const command = data.command;

      // Exécuter l'action selon le type
      if (command.type === "CONVERSATION" && command.action === "CONVERSATION") {
        await handleConversation(command.data);
      } else if (command.type === "QUESTION" && command.action === "NEWS") {
        await handleNewsQuestion(command.data);
      } else if (command.type === "QUESTION" && command.action === "WEATHER") {
        await handleWeatherQuestion(command.data);
      } else if (command.type === "EVENT" && command.action === "CREATE") {
        await createEvent(command.data);
      } else if (command.type === "ROUTINE" && command.action === "CREATE") {
        await createRoutine(command.data);
      } else if (command.type === "TASK" && command.action === "CREATE") {
        await createTask(command.data);
      } else {
        throw new Error("Commande non reconnue");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";
      setResult({
        type: "error",
        message: errorMessage,
      });
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  const createEvent = async (eventData: any) => {
    try {
      // Convertir les dates en objets Date si elles sont des strings
      const startDate = eventData.start instanceof Date 
        ? eventData.start 
        : new Date(eventData.start);
      const endDate = eventData.end instanceof Date 
        ? eventData.end 
        : new Date(eventData.end);

      // Vérifier que les dates sont valides
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Dates invalides dans l'événement");
      }

      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          allDay: eventData.allDay || false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la création");
      }

      const data = await response.json();
      setResult({
        type: "success",
        message: `Événement "${eventData.title}" créé avec succès !`,
      });

      if (onEventCreated) {
        onEventCreated(data.event);
      }
    } catch (error) {
      throw error;
    }
  };

  const createRoutine = async (routineData: any) => {
    try {
      const response = await fetch("/api/routines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: routineData.name,
          description: routineData.description,
          triggerType: routineData.triggerType,
          triggerData: routineData.triggerData,
          steps: routineData.steps,
          active: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la création");
      }

      const data = await response.json();
      setResult({
        type: "success",
        message: `Automatisation "${routineData.name}" créée avec succès !`,
      });

      if (onRoutineCreated) {
        onRoutineCreated(data.routine);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleConversation = async (data: any) => {
    try {
      const message = data.message || data.question || "";

      const response = await fetch("/api/ai/conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la conversation");
      }

      const result = await response.json();
      const aiResponse = result.response || result.aiResponse || "";

      // Réponse vocale avec voix authentique
      await speakText(aiResponse, {
        lang: "fr-FR",
        rate: 0.9,
        pitch: 1.0,
      });

      setResult({
        type: "success",
        message: aiResponse,
      });

      // Stocker les résultats de recherche si disponibles
      if (result.webSearch) {
        setNewsData({
          query: result.webSearch.query,
          articles: result.webSearch.results.map((r: any) => ({
            title: r.title,
            description: r.snippet,
            url: r.url,
            source: r.source || "Web",
            publishedAt: new Date().toISOString(),
          })),
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const handleNewsQuestion = async (questionData: any) => {
    try {
      const query = questionData.question || questionData.query || "";

      // Rechercher les actualités
      const response = await fetch(`/api/news/search?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la recherche d'actualités");
      }

      const data = await response.json();
      
      // Stocker les données d'actualités
      setNewsData({
        query,
        articles: data.articles || [],
      });
      
      const summary = data.articles && data.articles.length > 0
        ? `J'ai trouvé ${data.articles.length} article${data.articles.length > 1 ? 's' : ''} sur "${query}".`
        : `Aucun article trouvé pour "${query}".`;

      setResult({
        type: "success",
        message: summary,
      });

      // Réponse vocale
      await speakText(summary, {
        lang: "fr-FR",
        rate: 0.9,
        pitch: 1.0,
      });
    } catch (error: any) {
      throw error;
    }
  };

  const handleWeatherQuestion = async (questionData: any) => {
    try {
      // Demander la géolocalisation
      if (!navigator.geolocation) {
        throw new Error("Géolocalisation non supportée par votre navigateur");
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Récupérer la météo
      const response = await fetch(
        `/api/weather?lat=${latitude}&lon=${longitude}&question=${encodeURIComponent(questionData.question)}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la récupération de la météo");
      }

      const data = await response.json();
      
      // Stocker les données météo pour afficher la carte
      setWeatherData({
        weather: data.weather,
        latitude,
        longitude,
      });
      
      setResult({
        type: "success",
        message: data.response,
      });

      // Réponse vocale avec voix authentique
      await speakText(data.response, {
        lang: "fr-FR",
        rate: 0.9,
        pitch: 1.0,
      });
    } catch (error: any) {
      if (error.code === 1) { // PERMISSION_DENIED
        throw new Error("Permission de géolocalisation refusée. Activez-la dans les paramètres de votre navigateur.");
      } else if (error.code === 2) { // POSITION_UNAVAILABLE
        throw new Error("Impossible de déterminer votre position.");
      } else if (error.code === 3) { // TIMEOUT
        throw new Error("Délai d'attente dépassé pour la géolocalisation.");
      }
      throw error;
    }
  };

  const createTask = async (taskData: any) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: taskData.title,
          due: taskData.due ? new Date(taskData.due).toISOString() : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la création");
      }

      const data = await response.json();
      setResult({
        type: "success",
        message: `Tâche "${taskData.title}" créée avec succès !`,
      });

      if (onTaskCreated) {
        onTaskCreated(data.task);
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Commandes vocales</CardTitle>
        <CardDescription>
          Parlez pour créer des événements, automatisations ou tâches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <VoiceInput
          onTranscript={handleTranscript}
          onError={(error) => {
            setResult({ type: "error", message: error });
            if (onError) {
              onError(error);
            }
          }}
          language="fr-FR"
        />

        {processing && (
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Traitement de la commande...</span>
          </div>
        )}

        {lastCommand && !processing && (
          <div className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              Commande détectée :
            </p>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              "{lastCommand}"
            </p>
          </div>
        )}

        {result && (
          <div
            className={`flex items-center gap-2 rounded-md p-3 text-sm ${
              result.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
            }`}
          >
            {result.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span>{result.message}</span>
          </div>
        )}

        <div className="text-xs text-zinc-500">
          <p className="font-medium mb-1">Exemples :</p>
          <ul className="list-disc list-inside space-y-1">
            <li>"Créer un événement réunion demain à 14h avec Jean"</li>
            <li>"Quand je dis bonjour, allumer les lumières"</li>
            <li>"Créer une tâche faire les courses"</li>
            <li>"Quel temps fera-t-il demain ?"</li>
            <li>"Cherche les actualités sur la technologie"</li>
            <li>"Montre-moi les nouvelles sur l'intelligence artificielle"</li>
            <li>"Quel est le prix d'un iPhone ?"</li>
            <li>"Trouve-moi un restaurant à Paris"</li>
            <li>"Comment fonctionne l'intelligence artificielle ?"</li>
          </ul>
        </div>
      </CardContent>

      {weatherData && (
        <div className="mt-4">
          <WeatherMap
            latitude={weatherData.latitude}
            longitude={weatherData.longitude}
            weather={weatherData.weather}
          />
        </div>
      )}
    </Card>
  );
}

