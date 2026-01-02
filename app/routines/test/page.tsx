"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Play, Loader2, CheckCircle2, XCircle, AlertCircle, MapPin } from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { TrafficMap } from "@/app/components/TrafficMap";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import type { Routine } from "@prisma/client";

interface ExecutionResult {
  routine: Routine;
  log: {
    id: string;
    status: string;
    executedAt: string;
    details: unknown;
  };
  results: Array<{
    stepId: string;
    order: number;
    actionType: string;
    status: string;
    output?: unknown;
    error?: string;
  }>;
}

export default function TestRoutinesPage() {
  const { data: session, status } = useSession();
  const [routines, setRoutines] = useState<
    Array<Routine & { steps?: Array<{ id: string; order: number; actionType: string }> }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ExecutionResult>>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/?error=auth_required&redirect=/routines/test");
    }
  }, [status]);

  const fetchRoutines = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/routines");
      if (response.ok) {
        const data = await response.json();
        setRoutines(data.routines || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchRoutines();
      // Demander la géolocalisation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            setLocationError("Impossible d'obtenir votre position. " + error.message);
          }
        );
      } else {
        setLocationError("La géolocalisation n'est pas supportée par votre navigateur.");
      }
    }
  }, [status]);

  const executeRoutine = async (routineId: string) => {
    try {
      setExecuting(routineId);
      
      // Si on a besoin de la géolocalisation et qu'on ne l'a pas encore, la demander
      if (!userLocation && navigator.geolocation) {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
              resolve();
            },
            (error) => {
              setLocationError("Impossible d'obtenir votre position. " + error.message);
              reject(error);
            }
          );
        });
      }
      
      const response = await fetch(`/api/routines/${routineId}/execute`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de l'exécution");
      }

      const data = await response.json();
      
      // Si les résultats contiennent des données trafic ou météo, récupérer les infos
      if (userLocation) {
        const updatedResults = { ...data };
        for (const result of updatedResults.results || []) {
          if (result.actionType === "NOTIFICATION" && result.output) {
            // Récupérer les infos trafic
            if (result.output.type === "traffic" && result.output.requiresLocation) {
              try {
                const trafficResponse = await fetch(
                  `/api/traffic?lat=${userLocation.lat}&lng=${userLocation.lng}&destination=Travail`
                );
                if (trafficResponse.ok) {
                  const trafficData = await trafficResponse.json();
                  result.output.data = trafficData;
                  result.output.userLocation = userLocation;
                }
              } catch (err) {
                console.error("Erreur récupération trafic:", err);
              }
            }
            
            // Récupérer les infos météo
            if (result.output.requiresWeather && result.output.weatherLocation) {
              try {
                const weatherResponse = await fetch(
                  `/api/weather?lat=${result.output.weatherLocation.lat}&lng=${result.output.weatherLocation.lng}`
                );
                if (weatherResponse.ok) {
                  const weatherData = await weatherResponse.json();
                  result.output.weather = weatherData;
                }
              } catch (err) {
                console.error("Erreur récupération météo:", err);
              }
            }
          }
        }
        setResults((prev) => ({ ...prev, [routineId]: updatedResults }));
      } else {
        setResults((prev) => ({ ...prev, [routineId]: data }));
      }
      
      await fetchRoutines();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'exécution");
    } finally {
      setExecuting(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "skipped":
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const renderOutput = (output: unknown, actionType: string) => {
    if (!output || typeof output !== "object") {
      return <pre className="text-xs">{JSON.stringify(output, null, 2)}</pre>;
    }

    const data = output as Record<string, unknown>;

    if (actionType === "NOTIFICATION" && data.type === "traffic" && data.data) {
      const trafficData = data.data as { 
        routes: Array<{ name: string; duration: string; traffic: string; details: string; distance?: string; polyline?: Array<{ lat: number; lng: number }> }>;
        userLocation?: { lat: number; lng: number };
      };
      const rawLocation = (data.userLocation as { lat?: number; lng?: number } | undefined) || trafficData.userLocation;
      const location = rawLocation && typeof rawLocation.lat === 'number' && typeof rawLocation.lng === 'number'
        ? { lat: rawLocation.lat, lng: rawLocation.lng }
        : undefined;
      
      // Mapper les routes pour correspondre au type TrafficRoute
      const routes = (trafficData.routes || []).map(route => ({
        name: route.name,
        duration: route.duration,
        distance: route.distance || '',
        polyline: route.polyline,
      }));
      
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            <p className="font-medium text-sm">🚗 Informations trafic :</p>
          </div>
          
          {location && (
            <TrafficMap userLocation={location} routes={routes} />
          )}
          
          <div className="space-y-2">
            {trafficData.routes?.map((route, idx) => (
              <div key={idx} className="rounded border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800">
                <p className="font-medium text-sm">{route.name}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {route.duration} • {route.distance || ""} • {route.traffic}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500">{route.details}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (actionType === "NOTIFICATION" && data.type === "news" && data.data) {
      const newsData = data.data as { articles: Array<{ title: string; source: string; summary: string }> };
      return (
        <div className="space-y-2">
          <p className="font-medium text-sm">📰 Actualités :</p>
          {newsData.articles?.slice(0, 3).map((article, idx) => (
            <div key={idx} className="rounded border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800">
              <p className="font-medium text-sm">{article.title}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{article.source}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{article.summary}</p>
            </div>
          ))}
        </div>
      );
    }

    if (actionType === "NOTIFICATION" && data.weather) {
      const weatherData = data.weather as {
        current: {
          temperature: number;
          conditionLabel: string;
          icon: string;
          feelsLike: number;
        };
        daily: Array<{
          day: string;
          high: number;
          low: number;
          conditionLabel: string;
          icon: string;
        }>;
      };
      
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{weatherData.current.icon}</span>
            <div>
              <p className="font-medium text-sm">🌤️ Météo actuelle</p>
              <p className="text-xs text-zinc-500">
                {weatherData.current.conditionLabel}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500">Température</p>
              <p className="text-lg font-bold">{weatherData.current.temperature}°C</p>
              <p className="text-xs text-zinc-400">
                Ressenti : {weatherData.current.feelsLike}°C
              </p>
            </div>
            
            <div className="rounded border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500">Aujourd'hui</p>
              <p className="text-sm font-medium">
                {weatherData.daily[0]?.low}° - {weatherData.daily[0]?.high}°C
              </p>
              <p className="text-xs text-zinc-400">
                {weatherData.daily[0]?.conditionLabel} {weatherData.daily[0]?.icon}
              </p>
            </div>
          </div>
          
          <div className="rounded border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
              💡 Conseil vestimentaire
            </p>
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
              {weatherData.current.temperature < 10
                ? "Il fait froid, prévoyez un manteau et des vêtements chauds"
                : weatherData.current.temperature < 20
                ? "Température fraîche, une veste légère serait appropriée"
                : "Température agréable, des vêtements légers suffiront"}
            </p>
          </div>
        </div>
      );
    }

    if (actionType === "TASK_CREATE" && data.task) {
      const task = data.task as { id: string; title: string };
      return (
        <div className="rounded border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/20">
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            ✅ Tâche créée : {task.title}
          </p>
        </div>
      );
    }

    return <pre className="text-xs">{JSON.stringify(output, null, 2)}</pre>;
  };

  if (status === "loading" || loading) {
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
            Test des automatisations
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Exécutez vos automatisations et voyez les résultats en temps réel
          </p>
          {userLocation && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/20">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✅ Géolocalisation activée : {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </p>
            </div>
          )}
          {locationError && (
            <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/20">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ {locationError}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {routines.map((routine) => {
            const result = results[routine.id];
            const isExecuting = executing === routine.id;

            return (
              <Card key={routine.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{routine.name}</CardTitle>
                      <CardDescription>{routine.description || "Aucune description"}</CardDescription>
                    </div>
                    <Button
                      onClick={() => executeRoutine(routine.id)}
                      disabled={isExecuting || !routine.active}
                      size="sm"
                    >
                      {isExecuting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Exécution...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Exécuter
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {result && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Résultats :</span>
                        <span className={`text-xs rounded px-2 py-1 ${
                          result.log.status === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                          result.log.status === "failed" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}>
                          {result.log.status}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {result.results.map((stepResult, idx) => (
                          <div
                            key={stepResult.stepId || idx}
                            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                          >
                            <div className="mb-2 flex items-center gap-2">
                              {getStatusIcon(stepResult.status)}
                              <span className="text-sm font-medium">
                                Étape {stepResult.order + 1} : {stepResult.actionType}
                              </span>
                            </div>
                            {stepResult.error && (
                              <p className="mb-2 text-sm text-red-600 dark:text-red-400">
                                ❌ {stepResult.error}
                              </p>
                            )}
                            {stepResult.status === "skipped" && Boolean(stepResult.output) && (
                              <div className="mb-2 rounded border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                  ⚠️ {typeof stepResult.output === "object" && stepResult.output != null && "info" in stepResult.output 
                                    ? (stepResult.output as { info: string }).info 
                                    : "Action ignorée"}
                                </p>
                                {typeof stepResult.output === "object" && stepResult.output != null && "suggestion" in stepResult.output && (
                                  <p className="mt-1 text-xs text-blue-600 dark:text-blue-300">
                                    💡 {(stepResult.output as { suggestion: string }).suggestion}
                                  </p>
                                )}
                              </div>
                            )}
                            {stepResult.output && (
                              <div className="mt-2">
                                {renderOutput(stepResult.output, stepResult.actionType)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!result && !isExecuting && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Cliquez sur "Exécuter" pour tester cette automatisation
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}

