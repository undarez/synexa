"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Loader2, RefreshCw, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { AlertCircle } from "lucide-react";

interface SyncConfig {
  provider: "apple_health" | "fitbit" | "withings" | "google_fit";
  enabled: boolean;
  lastSyncAt?: string;
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface HealthSyncManagerProps {
  className?: string;
}

export function HealthSyncManager({ className = "" }: HealthSyncManagerProps) {
  const [configs, setConfigs] = useState<Record<string, SyncConfig | null>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/health/sync/config");
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des configurations");
      }
      const data = await response.json();
      setConfigs(data.configs || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (provider: string) => {
    try {
      setSyncing((prev) => ({ ...prev, [provider]: true }));
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/health/sync?provider=${provider}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la synchronisation");
      }

      const data = await response.json();
      setSuccess(
        `${data.synced} métrique${data.synced > 1 ? "s" : ""} synchronisée${data.synced > 1 ? "s" : ""} depuis ${provider}`
      );

      // Rafraîchir les configurations pour mettre à jour lastSyncAt
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSyncing((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleConnect = (provider: string) => {
    // Rediriger vers l'autorisation du provider
    switch (provider) {
      case "fitbit":
        window.location.href = "/api/health/sync/fitbit/authorize";
        break;
      case "google_fit":
        window.location.href = "/api/health/sync/google-fit/authorize";
        break;
      default:
        setError(`La connexion ${provider} sera disponible prochainement`);
    }
  };

  const formatLastSync = (lastSyncAt?: string) => {
    if (!lastSyncAt) return "Jamais";
    const date = new Date(lastSyncAt);
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const providerLabels = {
    apple_health: {
      name: "Apple Health",
      description: "Synchronise avec Apple Health (nécessite une app iOS)",
      icon: "🍎",
    },
    fitbit: {
      name: "Fitbit",
      description: "Synchronise avec votre compte Fitbit",
      icon: "⌚",
    },
    withings: {
      name: "Withings",
      description: "Synchronise avec vos devices Withings",
      icon: "⚖️",
    },
    google_fit: {
      name: "Google Fit",
      description: "Synchronise avec Google Fit (montres Android, Fossil, Samsung, etc.)",
      icon: "🤖",
    },
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Synchronisation des métriques</CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Synchronisation des métriques</CardTitle>
        <CardDescription>
          Connectez vos montres connectées et synchronisez automatiquement vos données de santé
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span>{success}</span>
          </div>
        )}

        {Object.entries(providerLabels).map(([provider, label]) => {
          const config = configs[provider] as SyncConfig | null;
          const isConnected = config?.enabled && config?.accessToken;
          const isSyncing = syncing[provider];

          return (
            <div
              key={provider}
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{label.icon}</span>
                    <h3 className="font-semibold text-[hsl(var(--foreground))]">
                      {label.name}
                    </h3>
                    {isConnected ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
                    {label.description}
                  </p>
                  {isConnected && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Dernière synchronisation: {formatLastSync(config?.lastSyncAt)}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {isConnected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(provider)}
                        disabled={isSyncing}
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sync...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Synchroniser
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnect(provider)}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Connecter
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="pt-2 border-t border-[hsl(var(--border))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            💡 Les données sont synchronisées automatiquement. Vous pouvez aussi synchroniser
            manuellement en cliquant sur "Synchroniser".
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

