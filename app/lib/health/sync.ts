/**
 * Service de synchronisation des métriques de santé
 * Synchronise avec Apple Health, Fitbit, Withings, etc.
 */

import prisma from "@/app/lib/prisma";
import { HealthMetricType, Prisma } from "@prisma/client";
import { createHealthMetric } from "./metrics";
import { toJsonInput } from "@/app/lib/prisma/json";

export interface HealthSyncConfig {
  provider: "apple_health" | "fitbit" | "withings" | "google_fit";
  enabled: boolean;
  lastSyncAt?: Date;
  accessToken?: string;
  refreshToken?: string;
  userId?: string; // ID utilisateur du provider
  metadata?: Record<string, any>;
}

/**
 * Récupère la configuration de synchronisation d'un utilisateur
 */
export async function getHealthSyncConfig(
  userId: string,
  provider: "apple_health" | "fitbit" | "withings" | "google_fit"
): Promise<HealthSyncConfig | null> {
  const preference = await prisma.preference.findUnique({
    where: {
      userId_key: {
        userId,
        key: `health_sync_${provider}`,
      },
    },
  });

  if (!preference) return null;

  return preference.value as unknown as HealthSyncConfig;
}

/**
 * Enregistre la configuration de synchronisation
 */
export async function setHealthSyncConfig(
  userId: string,
  config: HealthSyncConfig
): Promise<void> {
  await prisma.preference.upsert({
    where: {
      userId_key: {
        userId,
        key: `health_sync_${config.provider}`,
      },
    },
    create: {
      userId,
      key: `health_sync_${config.provider}`,
      value: toJsonInput(config) ?? Prisma.JsonNull,
    },
    update: {
      value: toJsonInput(config) ?? Prisma.JsonNull,
    },
  });
}

/**
 * Synchronise les métriques depuis Apple Health
 * Note: Apple Health nécessite une app native ou un proxy
 */
export async function syncAppleHealth(
  userId: string,
  config: HealthSyncConfig
): Promise<{ synced: number; errors: number }> {
  // Pour l'instant, on simule la synchronisation
  // En production, cela nécessiterait :
  // 1. Une app iOS native qui lit HealthKit
  // 2. Un proxy/API qui expose les données
  // 3. Ou utiliser HealthKit via une extension Safari (limité)

  let synced = 0;
  let errors = 0;

  try {
    // TODO: Implémenter la vraie synchronisation Apple Health
    // Pour l'instant, on retourne une simulation
    console.log(`[Health Sync] Synchronisation Apple Health pour ${userId}`);

    // Exemple de données simulées (à remplacer par la vraie API)
    const mockData = [
      {
        type: "SLEEP" as HealthMetricType,
        value: 7.5,
        unit: "hours",
        recordedAt: new Date(),
      },
      {
        type: "STEPS" as HealthMetricType,
        value: 8500,
        unit: "steps",
        recordedAt: new Date(),
      },
      {
        type: "HEART_RATE" as HealthMetricType,
        value: 72,
        unit: "bpm",
        recordedAt: new Date(),
      },
    ];

    for (const data of mockData) {
      try {
        await createHealthMetric(userId, {
          ...data,
          source: "apple_health",
        });
        synced++;
      } catch (error) {
        console.error("[Health Sync] Erreur création métrique:", error);
        errors++;
      }
    }

    // Mettre à jour la date de dernière synchronisation
    await setHealthSyncConfig(userId, {
      ...config,
      lastSyncAt: new Date(),
    });

    return { synced, errors };
  } catch (error) {
    console.error("[Health Sync] Erreur synchronisation Apple Health:", error);
    throw error;
  }
}

/**
 * Synchronise les métriques depuis Fitbit
 */
export async function syncFitbit(
  userId: string,
  config: HealthSyncConfig
): Promise<{ synced: number; errors: number }> {
  if (!config.accessToken) {
    throw new Error("Token d'accès Fitbit requis");
  }

  let synced = 0;
  let errors = 0;

  try {
    const today = new Date().toISOString().split("T")[0];
    const baseUrl = "https://api.fitbit.com/1";

    // Récupérer les données du jour
    const [activities, sleep, heartRate] = await Promise.all([
      // Activités (pas, calories, distance)
      fetch(`${baseUrl}/user/-/activities/date/${today}.json`, {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      }).then((r) => r.json()),

      // Sommeil
      fetch(`${baseUrl}/user/-/sleep/date/${today}.json`, {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      }).then((r) => r.json()),

      // Fréquence cardiaque (moyenne du jour)
      fetch(`${baseUrl}/user/-/activities/heart/date/${today}/1d.json`, {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      }).then((r) => r.json()),
    ]);

    // Traiter les pas
    if (activities?.summary?.steps) {
      try {
        await createHealthMetric(userId, {
          type: "STEPS",
          value: activities.summary.steps,
          unit: "steps",
          source: "fitbit",
          recordedAt: new Date(),
        });
        synced++;
      } catch (error) {
        errors++;
      }
    }

    // Traiter les calories
    if (activities?.summary?.caloriesOut) {
      try {
        await createHealthMetric(userId, {
          type: "CALORIES",
          value: activities.summary.caloriesOut,
          unit: "kcal",
          source: "fitbit",
          recordedAt: new Date(),
        });
        synced++;
      } catch (error) {
        errors++;
      }
    }

    // Traiter le sommeil
    if (sleep?.summary?.totalMinutesAsleep) {
      try {
        await createHealthMetric(userId, {
          type: "SLEEP",
          value: sleep.summary.totalMinutesAsleep / 60, // Convertir minutes en heures
          unit: "hours",
          source: "fitbit",
          recordedAt: new Date(),
        });
        synced++;
      } catch (error) {
        errors++;
      }
    }

    // Traiter la fréquence cardiaque
    if (heartRate?.activitiesHeart?.[0]?.value?.restingHeartRate) {
      try {
        await createHealthMetric(userId, {
          type: "HEART_RATE",
          value: heartRate.activitiesHeart[0].value.restingHeartRate,
          unit: "bpm",
          source: "fitbit",
          recordedAt: new Date(),
        });
        synced++;
      } catch (error) {
        errors++;
      }
    }

    // Mettre à jour la date de dernière synchronisation
    await setHealthSyncConfig(userId, {
      ...config,
      lastSyncAt: new Date(),
    });

    return { synced, errors };
  } catch (error: any) {
    console.error("[Health Sync] Erreur synchronisation Fitbit:", error);

    // Si le token a expiré, marquer pour refresh
    if (error.status === 401) {
      throw new Error("Token Fitbit expiré. Veuillez reconnecter votre compte.");
    }

    throw error;
  }
}

/**
 * Synchronise les métriques depuis Withings
 */
export async function syncWithings(
  userId: string,
  config: HealthSyncConfig
): Promise<{ synced: number; errors: number }> {
  if (!config.accessToken) {
    throw new Error("Token d'accès Withings requis");
  }

  let synced = 0;
  let errors = 0;

  try {
    const baseUrl = "https://wbsapi.withings.net/v2/measure";
    const today = Math.floor(Date.now() / 1000);
    const yesterday = today - 86400; // 24h avant

    // Récupérer les mesures (poids, IMC, masse grasse, etc.)
    const response = await fetch(
      `${baseUrl}?action=getmeas&access_token=${config.accessToken}&startdate=${yesterday}&enddate=${today}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error("Erreur lors de la récupération des données Withings");
    }

    const data = await response.json();

    if (data.body?.measuregrps) {
      for (const group of data.body.measuregrps) {
        const recordedAt = new Date(group.date * 1000);

        for (const measure of group.measures) {
          try {
            let type: HealthMetricType | null = null;
            let value: number | null = null;
            let unit: string | undefined;

            // Withings utilise des types numériques
            // 1 = poids (kg), 4 = taille (m), 5 = IMC, 6 = masse grasse (%)
            switch (measure.type) {
              case 1: // Poids
                type = "WEIGHT";
                value = measure.value * Math.pow(10, measure.unit); // Convertir selon l'unité
                unit = "kg";
                break;
              case 6: // Masse grasse
                // On peut stocker ça dans metadata
                continue; // Pour l'instant, on skip
              default:
                continue;
            }

            if (type && value !== null) {
              await createHealthMetric(userId, {
                type,
                value,
                unit,
                source: "withings",
                recordedAt,
                metadata: {
                  withingsType: measure.type,
                  withingsUnit: measure.unit,
                },
              });
              synced++;
            }
          } catch (error) {
            errors++;
          }
        }
      }
    }

    // Mettre à jour la date de dernière synchronisation
    await setHealthSyncConfig(userId, {
      ...config,
      lastSyncAt: new Date(),
    });

    return { synced, errors };
  } catch (error: any) {
    console.error("[Health Sync] Erreur synchronisation Withings:", error);

    if (error.status === 401) {
      throw new Error("Token Withings expiré. Veuillez reconnecter votre compte.");
    }

    throw error;
  }
}

/**
 * Synchronise les métriques depuis Google Fit
 * Supporte les montres Android/Wear OS (Fossil, Samsung, etc.)
 */
export async function syncGoogleFit(
  userId: string,
  config: HealthSyncConfig
): Promise<{ synced: number; errors: number }> {
  if (!config.accessToken) {
    throw new Error("Token d'accès Google Fit requis");
  }

  let synced = 0;
  let errors = 0;

  try {
    const baseUrl = "https://www.googleapis.com/fitness/v1/users/me";
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Convertir en nanosecondes (format Google Fit)
    const startTimeNanos = startOfDay.getTime() * 1000000;
    const endTimeNanos = endOfDay.getTime() * 1000000;

    // Types de données Google Fit
    const dataTypes = [
      { type: "com.google.step_count.delta", metricType: "STEPS" as HealthMetricType, unit: "steps", aggregate: true },
      { type: "com.google.calories.expended", metricType: "CALORIES" as HealthMetricType, unit: "kcal", aggregate: true },
      { type: "com.google.heart_rate.bpm", metricType: "HEART_RATE" as HealthMetricType, unit: "bpm", aggregate: false },
      { type: "com.google.sleep.segment", metricType: "SLEEP" as HealthMetricType, unit: "hours", aggregate: false },
      { type: "com.google.weight", metricType: "WEIGHT" as HealthMetricType, unit: "kg", aggregate: false },
      { type: "com.google.activity.segment", metricType: "ACTIVITY" as HealthMetricType, unit: "minutes", aggregate: false },
    ];

    for (const dataType of dataTypes) {
      try {
        // Récupérer les données pour ce type
        const response = await fetch(
          `${baseUrl}/dataset:aggregate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${config.accessToken}`,
            },
            body: JSON.stringify({
              aggregateBy: [
                {
                  dataTypeName: dataType.type,
                },
              ],
              bucketByTime: {
                durationMillis: 86400000, // 24 heures
              },
              startTimeMillis: startTimeNanos / 1000000,
              endTimeMillis: endTimeNanos / 1000000,
            }),
          }
        );

        if (!response.ok) {
          // Si le type de données n'est pas disponible, continuer
          if (response.status === 404 || response.status === 400) {
            continue;
          }
          throw new Error(`Erreur API Google Fit: ${response.statusText}`);
        }

        const data = await response.json();

        // Traiter les buckets de données
        if (data.bucket && data.bucket.length > 0) {
          for (const bucket of data.bucket) {
            if (bucket.dataset && bucket.dataset.length > 0) {
              for (const dataset of bucket.dataset) {
                if (dataset.point && dataset.point.length > 0) {
                  // Pour les types agrégés (steps, calories), on prend la somme du bucket
                  if (dataType.aggregate) {
                    let totalValue = 0;
                    let lastTimestamp = 0;

                    for (const point of dataset.point) {
                      if (point.value && point.value.length > 0) {
                        const pointValue = point.value[0]?.fpVal || point.value[0]?.intVal || 0;
                        totalValue += pointValue;
                        lastTimestamp = Math.max(lastTimestamp, point.startTimeNanos || 0);
                      }
                    }

                    if (totalValue > 0) {
                      const recordedAt = new Date(lastTimestamp / 1000000);
                      await createHealthMetric(userId, {
                        type: dataType.metricType,
                        value: totalValue,
                        unit: dataType.unit,
                        source: "google_fit",
                        recordedAt,
                        metadata: {
                          googleFitDataType: dataType.type,
                          bucketStart: bucket.startTimeMillis,
                          bucketEnd: bucket.endTimeMillis,
                        },
                      });
                      synced++;
                    }
                  } else {
                    // Pour les types non-agrégés (heart rate, sleep, weight), on traite chaque point
                    for (const point of dataset.point) {
                      let value: number | null = null;

                      if (point.value && point.value.length > 0) {
                        if (dataType.type === "com.google.sleep.segment") {
                          // Pour le sommeil, calculer la durée
                          const startTime = point.startTimeNanos / 1000000;
                          const endTime = point.endTimeNanos / 1000000;
                          value = (endTime - startTime) / (1000 * 60 * 60); // Convertir en heures
                        } else if (dataType.type === "com.google.activity.segment") {
                          // Pour l'activité, calculer la durée
                          const startTime = point.startTimeNanos / 1000000;
                          const endTime = point.endTimeNanos / 1000000;
                          value = (endTime - startTime) / (1000 * 60); // Convertir en minutes
                        } else {
                          // Pour les autres types, utiliser la valeur directement
                          value = point.value[0]?.fpVal || point.value[0]?.intVal || null;
                        }

                        if (value !== null && value > 0) {
                          const recordedAt = new Date(point.startTimeNanos / 1000000);

                          await createHealthMetric(userId, {
                            type: dataType.metricType,
                            value,
                            unit: dataType.unit,
                            source: "google_fit",
                            recordedAt,
                            metadata: {
                              googleFitDataType: dataType.type,
                              originalValue: point.value[0],
                            },
                          });
                          synced++;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`[Health Sync] Erreur ${dataType.type}:`, error);
        errors++;
      }
    }

    // Mettre à jour la date de dernière synchronisation
    await setHealthSyncConfig(userId, {
      ...config,
      lastSyncAt: new Date(),
    });

    return { synced, errors };
  } catch (error: any) {
    console.error("[Health Sync] Erreur synchronisation Google Fit:", error);

    // Si le token a expiré
    if (error.status === 401) {
      throw new Error("Token Google Fit expiré. Veuillez reconnecter votre compte.");
    }

    throw error;
  }
}

/**
 * Synchronise toutes les sources configurées pour un utilisateur
 */
export async function syncAllHealthSources(userId: string): Promise<{
  totalSynced: number;
  totalErrors: number;
  results: Record<string, { synced: number; errors: number }>;
}> {
  const providers: Array<"apple_health" | "fitbit" | "withings" | "google_fit"> = [
    "apple_health",
    "fitbit",
    "withings",
    "google_fit",
  ];

  const results: Record<string, { synced: number; errors: number }> = {};
  let totalSynced = 0;
  let totalErrors = 0;

  for (const provider of providers) {
    try {
      const config = await getHealthSyncConfig(userId, provider);

      if (!config || !config.enabled) {
        continue;
      }

      let result: { synced: number; errors: number };

      switch (provider) {
        case "apple_health":
          result = await syncAppleHealth(userId, config);
          break;
        case "fitbit":
          result = await syncFitbit(userId, config);
          break;
        case "withings":
          result = await syncWithings(userId, config);
          break;
        case "google_fit":
          result = await syncGoogleFit(userId, config);
          break;
        default:
          continue;
      }

      results[provider] = result;
      totalSynced += result.synced;
      totalErrors += result.errors;
    } catch (error) {
      console.error(`[Health Sync] Erreur ${provider}:`, error);
      results[provider] = { synced: 0, errors: 1 };
      totalErrors++;
    }
  }

  return {
    totalSynced,
    totalErrors,
    results,
  };
}

