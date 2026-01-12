import { RoutineActionType, RoutineTriggerType } from "@/app/lib/supabase/types";
import type { Routine, RoutineLog, RoutineStep } from "@/app/lib/supabase/types";
import { supabase } from "@/app/lib/supabase/client";
import { dispatchDeviceCommand } from "@/app/lib/routines/transport";
import { toJsonInput } from "@/app/lib/supabase/helpers";
import { generateId } from "@/app/lib/supabase/helpers";

export type RoutineExecutionOptions = {
  dryRun?: boolean;
  metadata?: Record<string, unknown>;
};

export type RoutineStepResult = {
  stepId: string;
  order: number;
  actionType: RoutineActionType;
  status: "success" | "failed" | "skipped";
  output?: unknown;
  error?: string;
};

export type RoutineExecutionResult = {
  routine: Routine;
  log: RoutineLog;
  results: RoutineStepResult[];
};

async function executeStep(
  step: RoutineStep,
  options: RoutineExecutionOptions,
  userId?: string
): Promise<RoutineStepResult> {
  if (options.dryRun) {
    return {
      stepId: step.id,
      order: step.order,
      actionType: step.actionType,
      status: "success",
      output: { info: "Dry run uniquement" },
    };
  }

  try {
    switch (step.actionType) {
      case "DEVICE_COMMAND": {
        if (!step.deviceId) {
          return {
            stepId: step.id,
            order: step.order,
            actionType: step.actionType,
            status: "skipped",
            output: {
              info: "Aucun appareil sélectionné. Cette action nécessite un appareil connecté.",
              suggestion:
                "Ajoutez un appareil dans la section 'Appareils' ou modifiez cette étape pour utiliser une notification à la place.",
            },
          };
        }

        try {
          const response = await dispatchDeviceCommand(step.deviceId, {
            payload: step.payload ?? undefined,
          });
          return {
            stepId: step.id,
            order: step.order,
            actionType: step.actionType,
            status: "success",
            output: response,
          };
        } catch (err) {
          return {
            stepId: step.id,
            order: step.order,
            actionType: step.actionType,
            status: "failed",
            error:
              err instanceof Error
                ? err.message
                : "Erreur lors de la commande appareil",
          };
        }
      }
      case "NOTIFICATION": {
        const payload = (step.payload as Record<string, unknown>) || {};
        const message = (payload.message as string) || "Notification";

        // Si le message contient des mots-clés, récupérer des données réelles
        let notificationData: Record<string, unknown> = { message };

        if (
          message.includes("trafic") ||
          message.includes("Trafic") ||
          message.includes("traffic") ||
          message.includes("itinéraire") ||
          message.includes("Itinéraire") ||
          payload.type === "traffic"
        ) {
          // Récupérer les données de trafic depuis l'API
          try {
            // Récupérer l'adresse travail de l'utilisateur si disponible
            let destination = "Travail";
            let destinationLat: number | null = null;
            let destinationLng: number | null = null;
            
            if (userId) {
              const { data: userProfile } = await supabase
                .from('User')
                .select('workAddress, workLat, workLng, homeAddress')
                .eq('id', userId)
                .single();

              // Utiliser la destination du payload si fournie, sinon utiliser travail
              const customDest = (payload.destination as string) || "";
              if (customDest) {
                destination = customDest;
              } else if (userProfile?.workAddress) {
                destination = userProfile.workAddress;
                destinationLat = userProfile.workLat;
                destinationLng = userProfile.workLng;
              } else if (userProfile?.homeAddress) {
                destination = userProfile.homeAddress;
                destinationLat = null;
                destinationLng = null;
              }

              // Appeler l'API de trafic
              const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
              const trafficParams = new URLSearchParams();
              
              // Si on a des coordonnées de destination, les utiliser
              if (destinationLat && destinationLng) {
                trafficParams.append("lat", destinationLat.toString());
                trafficParams.append("lng", destinationLng.toString());
              }
              if (destination) {
                trafficParams.append("destination", destination);
              }

              const trafficResponse = await fetch(
                `${baseUrl}/api/traffic?${trafficParams.toString()}`
              );

              if (trafficResponse.ok) {
                const trafficData = await trafficResponse.json();
                notificationData = {
                  ...notificationData,
                  type: "traffic",
                  requiresLocation: true,
                  data: {
                    origin: trafficData.origin || "Position actuelle",
                    destination: trafficData.destination || destination,
                    userLocation: trafficData.userLocation,
                    destinationLocation: trafficData.destinationLocation,
                    routes: trafficData.routes || [],
                    lastUpdate: trafficData.lastUpdate || new Date().toISOString(),
                    message: trafficData.routes?.length
                      ? `Trafic vers ${destination}: ${trafficData.routes[0]?.duration || "N/A"}`
                      : `Informations trafic pour ${destination}`,
                  },
                };
              } else {
                // Fallback si l'API échoue
                notificationData = {
                  ...notificationData,
                  type: "traffic",
                  requiresLocation: true,
                  data: {
                    origin: "Position actuelle",
                    destination,
                    message: "Récupération des informations trafic en cours...",
                    routes: [],
                  },
                };
              }
            } else {
              // Pas d'userId, retourner juste un flag
              notificationData = {
                ...notificationData,
                type: "traffic",
                requiresLocation: true,
                data: {
                  origin: "Position actuelle",
                  destination: (payload.destination as string) || "Travail",
                  message: "Récupération des informations trafic en cours...",
                  routes: [],
                },
              };
            }
          } catch (error) {
            // En cas d'erreur, utiliser des données de base
            notificationData = {
              ...notificationData,
              type: "traffic",
              requiresLocation: true,
              data: {
                origin: "Position actuelle",
                destination: (payload.destination as string) || "Travail",
                message: "Erreur lors de la récupération des informations trafic",
                routes: [],
              },
            };
          }
        }

        if (
          message.includes("actualités") ||
          message.includes("Actualités") ||
          message.includes("journal") ||
          message.includes("nouvelles") ||
          message.includes("news")
        ) {
          // Extraire le sujet de recherche si mentionné
          let searchQuery = "actualités générales";
          const searchKeywords = ["sur", "concernant", "à propos de", "de"];
          
          for (const keyword of searchKeywords) {
            const index = message.toLowerCase().indexOf(keyword);
            if (index !== -1) {
              searchQuery = message.substring(index + keyword.length).trim();
              break;
            }
          }

          // Appeler l'API de recherche d'actualités
          try {
            const newsResponse = await fetch(
              `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/news/search?q=${encodeURIComponent(searchQuery)}`
            );
            
            if (newsResponse.ok) {
              const newsData = await newsResponse.json();
              notificationData = {
                ...notificationData,
                type: "news",
                data: {
                  query: searchQuery,
                  articles: newsData.articles || [],
                  totalResults: newsData.totalResults || 0,
                  sources: newsData.sources || [],
                  lastUpdate: newsData.lastUpdate || new Date().toISOString(),
                },
              };
            } else {
              // Fallback si l'API échoue
              notificationData = {
                ...notificationData,
                type: "news",
                data: {
                  query: searchQuery,
                  articles: [],
                  message: "Impossible de récupérer les actualités pour le moment",
                },
              };
            }
          } catch (error) {
            // En cas d'erreur, utiliser des données de base
            notificationData = {
              ...notificationData,
              type: "news",
              data: {
                query: searchQuery,
                articles: [],
                message: "Erreur lors de la récupération des actualités",
              },
            };
          }
        }

        // Détecter les messages de départ au travail pour ajouter la météo
        if (
          message.includes("travail") ||
          message.includes("Travail") ||
          message.includes("départ") ||
          message.includes("Départ") ||
          message.includes("partir") ||
          message.includes("Partir")
        ) {
          // Récupérer l'adresse travail de l'utilisateur
          if (userId) {
            const { data: userProfile } = await supabase
              .from('User')
              .select('workLat, workLng, workAddress')
              .eq('id', userId)
              .single();

            if (userProfile?.workLat && userProfile.workLng) {
              notificationData = {
                ...notificationData,
                requiresWeather: true,
                weatherLocation: {
                  lat: userProfile.workLat,
                  lng: userProfile.workLng,
                  address: userProfile.workAddress,
                },
              };
            }
          }
        }

        return {
          stepId: step.id,
          order: step.order,
          actionType: step.actionType,
          status: "success",
          output: notificationData,
        };
      }
      case "TASK_CREATE": {
        const payload = (step.payload as Record<string, unknown>) || {};
        const title = payload.title as string;

        if (!title) {
          return {
            stepId: step.id,
            order: step.order,
            actionType: step.actionType,
            status: "failed",
            error: "Le titre de la tâche est requis",
          };
        }

        try {
          // Créer la tâche directement via Supabase
          if (!userId) {
            return {
              stepId: step.id,
              order: step.order,
              actionType: step.actionType,
              status: "failed",
              error: "UserId requis pour créer une tâche",
            };
          }

          // Créer la tâche directement avec Supabase
          const taskId = generateId();
          const now = new Date().toISOString();
          
          const { data: task, error: taskError } = await supabase
            .from('Task')
            .insert({
              id: taskId,
              userId,
              title,
              priority: "MEDIUM",
              context: "PERSONAL",
              completed: false,
              createdAt: now,
              updatedAt: now,
            })
            .select()
            .single();

          if (taskError || !task) {
            throw new Error(taskError?.message || "Erreur lors de la création de la tâche");
          }

          return {
            stepId: step.id,
            order: step.order,
            actionType: step.actionType,
            status: "success",
            output: { task },
          };
        } catch (err) {
          return {
            stepId: step.id,
            order: step.order,
            actionType: step.actionType,
            status: "failed",
            error: err instanceof Error ? err.message : "Erreur inconnue",
          };
        }
      }
      case "MEDIA_PLAY": {
        return {
          stepId: step.id,
          order: step.order,
          actionType: step.actionType,
          status: "success",
          output: { info: "Lecture média à implémenter" },
        };
      }
      case "CUSTOM":
      default:
        return {
          stepId: step.id,
          order: step.order,
          actionType: step.actionType,
          status: "skipped",
          output: { info: "Action non implémentée" },
        };
    }
  } catch (error) {
    return {
      stepId: step.id,
      order: step.order,
      actionType: step.actionType,
      status: "failed",
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

function computeStatus(results: RoutineStepResult[]): string {
  if (results.every((step) => step.status === "success")) return "success";
  if (results.some((step) => step.status === "failed")) {
    return results.some((step) => step.status === "success")
      ? "partial"
      : "failed";
  }
  return "partial";
}

export async function executeRoutine(
  routineId: string,
  userId: string,
  options: RoutineExecutionOptions = {}
): Promise<RoutineExecutionResult> {
  // Récupérer la routine avec ses steps depuis Supabase
  const { data: routine, error: routineError } = await supabase
    .from('Routine')
    .select(`
      *,
      steps:RoutineStep(*)
    `)
    .eq('id', routineId)
    .eq('userId', userId)
    .single();

  if (routineError) {
    console.error('[executeRoutine] Erreur Supabase:', routineError);
    throw new Error(`Routine introuvable: ${routineError.message}`);
  }

  if (!routine) {
    console.error('[executeRoutine] Routine non trouvée:', { routineId, userId });
    throw new Error("Routine introuvable");
  }

  // Trier les steps par ordre
  const sortedSteps = (routine.steps || []).sort((a: RoutineStep, b: RoutineStep) => (a.order || 0) - (b.order || 0));

  const results: RoutineStepResult[] = [];
  for (const step of sortedSteps) {
    const result = await executeStep(step, options, userId);
    results.push(result);
    // TODO: gérer delaySeconds via job queue (BullMQ, Cloud Tasks, etc.)
  }

  // Créer le log d'exécution
  const logId = generateId();
  const logStatus = computeStatus(results);
  const logDetails = toJsonInput({
    results,
    metadata: options.metadata ?? null,
  });

  const { data: log, error: logError } = await supabase
    .from('RoutineLog')
    .insert({
      id: logId,
      routineId: routine.id,
      status: logStatus,
      details: logDetails as Record<string, unknown> | null,
      executedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (logError || !log) {
    console.error('[executeRoutine] Erreur création log:', logError);
    // Créer un log minimal en cas d'erreur
    const minimalLog: RoutineLog = {
      id: logId,
      routineId: routine.id,
      executedAt: new Date(),
      status: logStatus,
      details: logDetails as Record<string, unknown> | null,
    };
    return { routine: routine as Routine, log: minimalLog, results };
  }

  return { routine: routine as Routine, log: log as RoutineLog, results };
}
