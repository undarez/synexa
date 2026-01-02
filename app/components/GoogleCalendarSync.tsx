"use client";

import { useState, useEffect } from "react";
import { Calendar, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { signIn } from "next-auth/react";

export function GoogleCalendarSync() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch("/api/calendar/sync");
      if (response.ok) {
        const data = await response.json();
        setConnected(data.connected);
        setNeedsReconnect(data.needsReconnect || false);
      } else if (response.status === 403) {
        // Problème de scopes, forcer la reconnexion
        setConnected(false);
        setNeedsReconnect(true);
      }
    } catch (err) {
      console.error("Erreur vérification connexion:", err);
      setConnected(false);
    }
  };

  const handleConnect = () => {
    signIn("google", {
      callbackUrl: "/calendar",
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysAhead: 30 }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        
        // Si c'est un problème de scopes, proposer de se reconnecter
        if (response.status === 403 && errorData.code === "INSUFFICIENT_SCOPES") {
          setError("Les permissions Google Calendar ne sont pas disponibles. Veuillez vous reconnecter.");
          setConnected(false); // Forcer la reconnexion
          return;
        }
        
        // Si l'API n'est pas activée
        if (errorData.code === "API_NOT_ENABLED") {
          setError(
            <>
              L'API Google Calendar n'est pas activée dans votre projet Google Cloud.
              <br />
              <a 
                href={errorData.helpUrl || "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"} 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline text-blue-600 dark:text-blue-400"
              >
                Cliquez ici pour l'activer
              </a>
            </>
          );
          return;
        }
        
        throw new Error(errorData.error || "Erreur lors de la synchronisation");
      }

      const data = await response.json();
      setLastSync(new Date());
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Initialiser automatiquement les webhooks après la première synchronisation
      // (uniquement en production avec HTTPS)
      try {
        const watchResponse = await fetch("/api/calendar/watch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ calendarId: "primary" }),
        });
        const watchData = await watchResponse.json();
        if (watchResponse.ok && !watchData.development) {
          console.log("[Calendar] Webhooks initialisés automatiquement");
        } else if (watchData.development) {
          // En développement, c'est normal que les webhooks ne fonctionnent pas
          console.log("[Calendar] Webhooks non disponibles en développement (HTTPS requis)");
        }
      } catch (watchError) {
        console.warn("[Calendar] Erreur initialisation webhooks:", watchError);
        // Ne pas bloquer si les webhooks échouent
      }
      
      // Recharger la page pour afficher les nouveaux événements
      if (data.synced > 0) {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      console.error("Erreur synchronisation:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  if (connected === null) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Synchronisez vos événements avec Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected ? (
          <div className="space-y-3">
            {needsReconnect ? (
              <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/20">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Les permissions Google Calendar ne sont pas disponibles. Veuillez vous reconnecter pour autoriser l'accès au calendrier.
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Connectez votre compte Google pour synchroniser automatiquement vos événements.
              </p>
            )}
            <Button onClick={handleConnect} className="w-full">
              <Calendar className="mr-2 h-4 w-4" />
              {needsReconnect ? "Se reconnecter avec Google" : "Se connecter avec Google"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-600 dark:text-green-400">
                Google Calendar connecté
              </p>
            </div>

            <Button
              onClick={handleSync}
              disabled={syncing}
              className="w-full"
              variant="outline"
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Synchroniser maintenant
                </>
              )}
            </Button>

            {lastSync && (
              <p className="text-xs text-zinc-500">
                Dernière synchronisation : {lastSync.toLocaleString("fr-FR")}
              </p>
            )}

            {error && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-600 dark:text-red-400">
                    {typeof error === "string" ? (
                      <p>{error}</p>
                    ) : (
                      error
                    )}
                  </div>
                </div>
                {(typeof error === "string" && error.includes("permissions")) && (
                  <Button onClick={handleConnect} variant="outline" className="w-full">
                    <Calendar className="mr-2 h-4 w-4" />
                    Se reconnecter avec Google
                  </Button>
                )}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-600 dark:text-green-400">
                  Synchronisation réussie !
                </p>
              </div>
            )}

            <p className="text-xs text-zinc-500">
              💡 Les événements créés dans Synexa peuvent être synchronisés avec Google Calendar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

