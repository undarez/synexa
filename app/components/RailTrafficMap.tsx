"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface RailwayStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance: number;
  lines: string[];
}

interface RailwayDelay {
  stationId: string;
  stationName: string;
  line: string;
  delayMinutes: number;
  delayHours: number;
  status: "on-time" | "delayed" | "cancelled" | "unknown";
  lastUpdate: string;
}

interface RailwayLine {
  id: string;
  name: string;
  type: "TER" | "TGV" | "Intercités" | "Transilien" | "RER";
  coordinates: Array<{ lat: number; lng: number }>;
  color?: string;
}

interface RailTrafficMapProps {
  userLocation: { lat: number; lng: number };
}

// ==========================================
// PROTECTION GLOBALE CONTRE INSTANCES MULTIPLES
// ==========================================
// FLAG GLOBAL pour éviter les instances multiples (protection contre Strict Mode)
let globalMapInstanceCount = 0;
const MAX_MAP_INSTANCES = 1;

// ==========================================
// FONCTIONS UTILITAIRES (isolées)
// ==========================================

function getLineColor(type: RailwayLine["type"]): string {
  switch (type) {
    case "TGV":
      return "#dc2626"; // Rouge SNCF TGV
    case "TER":
      return "#0891b2"; // Bleu TER
    case "RER":
      return "#7c3aed"; // Violet RER
    case "Transilien":
      return "#059669"; // Vert Transilien
    case "Intercités":
      return "#ea580c"; // Orange Intercités
    default:
      return "#6b7280"; // Gris par défaut
  }
}

function createStationIcon(L: any, delay?: RailwayDelay) {
  if (!L || !L.divIcon) return null;

  const statusColor = delay
    ? delay.status === "delayed"
      ? "#ef4444" // Rouge = retard
      : delay.status === "cancelled"
      ? "#6b7280" // Gris = annulé
      : "#10b981" // Vert = à l'heure
    : "#3b82f6"; // Bleu = pas d'info

  return L.divIcon({
    className: "custom-railway-station-icon",
    html: `
      <div style="
        background-color: ${statusColor};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <span style="color: white; font-size: 14px; font-weight: bold;">🚂</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================

export function RailTrafficMap({ userLocation }: RailTrafficMapProps) {
  // ==========================================
  // REFS (cycle de vie de la carte)
  // ==========================================
  const mapContainerRef = useRef<HTMLDivElement>(null); // Container DOM unique et isolé
  const mapInstanceRef = useRef<any>(null); // Instance de la carte Leaflet
  const tileLayerRef = useRef<any>(null); // Couche de tuiles
  const markersRef = useRef<any[]>([]); // Tous les marqueurs (gares)
  const polylinesRef = useRef<any[]>([]); // Toutes les lignes ferroviaires
  const isInitializedRef = useRef<boolean>(false); // Garde contre double init
  const initAttemptRef = useRef<boolean>(false); // Protection contre double appel en Strict Mode
  const instanceIdRef = useRef<number | null>(null); // ID unique de cette instance
  const containerIdRef = useRef<string>(`rail-map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`); // ID unique pour le container

  // ==========================================
  // STATE
  // ==========================================
  const [isLoading, setIsLoading] = useState(true);
  const [railData, setRailData] = useState<{
    stations: RailwayStation[];
    delays: RailwayDelay[];
    lines: RailwayLine[];
  } | null>(null);

  // ==========================================
  // FONCTIONS D'INITIALISATION
  // ==========================================

  /**
   * Initialise la carte Leaflet UNE SEULE FOIS
   * Responsabilité : Créer l'instance de la carte, appliquer le fond de carte
   */
  const initRailMap = async (container: HTMLDivElement): Promise<any> => {
    // Importer Leaflet
    const L = await import("leaflet");

    // Corriger les icônes par défaut de Leaflet
    delete (L.default.Icon.Default.prototype as any)._getIconUrl;
    L.default.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });

    // NETTOYAGE COMPLET DU CONTAINER AVANT INITIALISATION
    // Ceci est crucial pour éviter "Map container is being reused"
    try {
      // 1. Vérifier et supprimer toute instance Leaflet existante sur ce container
      if ((container as any)._leaflet_id) {
        try {
          const existingMap = (L.default.Map as any).get(container);
          if (existingMap) {
            console.log("[RailTrafficMap] Nettoyage instance Leaflet existante");
            existingMap.remove();
          }
        } catch (e) {
          console.warn("[RailTrafficMap] Erreur lors de la suppression de l'instance existante:", e);
        }
        delete (container as any)._leaflet_id;
      }

      // 2. Vider complètement le container
      container.innerHTML = "";

      // 3. Attendre un tick pour s'assurer que le DOM est propre
      await new Promise(resolve => setTimeout(resolve, 0));

      // 4. Vérifier à nouveau qu'il n'y a pas de carte
      if ((container as any)._leaflet_id) {
        console.warn("[RailTrafficMap] Container toujours marqué après nettoyage, suppression forcée");
        delete (container as any)._leaflet_id;
        container.innerHTML = "";
      }
    } catch (cleanupError) {
      console.error("[RailTrafficMap] Erreur lors du nettoyage du container:", cleanupError);
      // Continuer quand même si le nettoyage échoue
    }

    // Créer la carte UNE SEULE FOIS
    // Centrer sur la France (Paris par défaut, mais ajustable selon userLocation)
    const map = L.default.map(container, {
      center: [userLocation.lat || 46.6034, userLocation.lng || 1.8883], // Centre de la France par défaut
      zoom: 6, // Zoom pour voir toute la France
      scrollWheelZoom: true,
      zoomControl: true,
      attributionControl: true,
    });

    // Ajouter la couche de tuiles (fond de carte)
    tileLayerRef.current = L.default.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    ).addTo(map);

    return map;
  };

  /**
   * Charge les données ferroviaires depuis l'API
   * Responsabilité : Récupérer les données de retards et gares
   */
  const fetchRailDelays = async (): Promise<{
    stations: RailwayStation[];
    delays: RailwayDelay[];
    lines: RailwayLine[];
  }> => {
    try {
      const response = await fetch(
        `/api/traffic/railway?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=200`
      );

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des données ferroviaires");
      }

      const data = await response.json();
      return {
        stations: data.stations || [],
        delays: data.delays || [],
        lines: data.lines || [],
      };
    } catch (error) {
      console.error("[RailTrafficMap] Erreur fetchRailDelays:", error);
      // Retourner des données vides en cas d'erreur
      return { stations: [], delays: [], lines: [] };
    }
  };

  /**
   * Dessine les lignes ferroviaires sur la carte
   * Responsabilité : Ajouter les polylines des lignes
   */
  const renderRailLines = (map: any, lines: RailwayLine[]) => {
    if (!map || !lines || lines.length === 0) return;

    const L = (window as any).L;
    if (!L) return;

    lines.forEach((line) => {
      if (!line.coordinates || line.coordinates.length < 2) return;

      const color = line.color || getLineColor(line.type);
      const positions = line.coordinates.map((p) => [p.lat, p.lng] as [number, number]);

      const polyline = L.polyline(positions as any, {
        color,
        weight: 4,
        opacity: 0.7,
        dashArray: line.type === "TER" ? "5, 10" : undefined,
      }).addTo(map);

      // Popup avec informations de la ligne
      polyline.bindPopup(`
        <div style="padding: 8px; min-width: 150px;">
          <h3 style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${line.name}</h3>
          <p style="font-size: 12px; color: #666; margin: 0;">
            Type: <strong>${line.type}</strong>
          </p>
        </div>
      `);

      polylinesRef.current.push(polyline);
    });
  };

  /**
   * Ajoute les marqueurs de gares avec retards
   * Responsabilité : Visualiser les gares et leurs statuts
   */
  const renderRailStations = (map: any, stations: RailwayStation[], delays: RailwayDelay[]) => {
    if (!map || !stations || stations.length === 0) return;

    const L = (window as any).L;
    if (!L) return;

    // Créer un Map des retards pour accès rapide
    const delaysMap = new Map<string, RailwayDelay>();
    delays.forEach((delay) => {
      delaysMap.set(delay.stationId, delay);
    });

    stations.forEach((station) => {
      const delay = delaysMap.get(station.id);
      const stationIcon = createStationIcon(L, delay);

      if (!stationIcon) return;

      const marker = L.marker([station.lat, station.lng], {
        icon: stationIcon,
      }).addTo(map);

      // Popup avec informations de la gare et retard
      const delayInfo = delay
        ? delay.delayMinutes > 0
          ? `
            <div style="margin-top: 8px; padding: 8px; border-radius: 4px; 
              background-color: ${delay.status === "delayed" ? "#fee2e2" : delay.status === "cancelled" ? "#f3f4f6" : "#dcfce7"}; 
              border: 1px solid ${delay.status === "delayed" ? "#fecaca" : delay.status === "cancelled" ? "#e5e7eb" : "#bbf7d0"};">
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                <span style="font-weight: 500; font-size: 12px; color: ${delay.status === "delayed" ? "#991b1b" : delay.status === "cancelled" ? "#374151" : "#166534"};">
                  ${delay.status === "delayed" ? "⚠️ Retard" : delay.status === "cancelled" ? "❌ Annulé" : "✅ À l'heure"}
                </span>
              </div>
              ${delay.delayMinutes > 0 ? `
                <div style="font-size: 12px; color: #374151; margin-top: 4px;">
                  ⏱️ ${delay.delayHours > 0 ? `${delay.delayHours}h ` : ""}${delay.delayMinutes % 60} min de retard
                </div>
              ` : ""}
              <p style="font-size: 11px; color: #6b7280; margin-top: 4px; margin-bottom: 0;">
                Ligne: <strong>${delay.line}</strong>
              </p>
              <p style="font-size: 10px; color: #9ca3af; margin-top: 4px; margin-bottom: 0;">
                Mise à jour: ${new Date(delay.lastUpdate).toLocaleTimeString("fr-FR")}
              </p>
            </div>
          `
          : `
            <div style="margin-top: 8px; padding: 8px; border-radius: 4px; background-color: #dcfce7; border: 1px solid #bbf7d0;">
              <span style="font-weight: 500; font-size: 12px; color: #166534;">✅ À l'heure</span>
              <p style="font-size: 11px; color: #6b7280; margin-top: 4px; margin-bottom: 0;">
                Ligne: <strong>${delay.line}</strong>
              </p>
            </div>
          `
        : "";

      marker.bindPopup(`
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="font-weight: bold; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            🚂 ${station.name}
          </h3>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            📍 Distance: <strong>${station.distance.toFixed(1)} km</strong>
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            🚆 Lignes: <strong>${station.lines.join(", ")}</strong>
          </div>
          ${delayInfo}
        </div>
      `);

      markersRef.current.push(marker);
    });
  };

  /**
   * Supprime uniquement les couches ferroviaires (marqueurs et lignes)
   * Responsabilité : Nettoyer les layers sans toucher à l'instance map
   */
  const clearRailLayers = () => {
    // Supprimer tous les marqueurs
    markersRef.current.forEach((marker) => {
      try {
        if (marker && typeof marker.remove === "function") {
          marker.remove();
        }
      } catch (e) {
        // Ignorer les erreurs (marqueur déjà supprimé)
      }
    });
    markersRef.current = [];

    // Supprimer toutes les polylines
    polylinesRef.current.forEach((polyline) => {
      try {
        if (polyline && typeof polyline.remove === "function") {
          polyline.remove();
        }
      } catch (e) {
        // Ignorer les erreurs (polyline déjà supprimée)
      }
    });
    polylinesRef.current = [];
  };

  /**
   * Détruit proprement la carte
   * Responsabilité : Appeler map.remove() et libérer toutes les ressources
   */
  const cleanupRailMap = () => {
    console.log("[RailTrafficMap] cleanupRailMap appelé");

    // 1. Supprimer les layers d'abord (marqueurs et polylines)
    clearRailLayers();

    // 2. Supprimer la couche de tuiles
    if (tileLayerRef.current) {
      try {
        tileLayerRef.current.remove();
        tileLayerRef.current.off(); // Supprimer tous les event listeners
      } catch (e) {
        console.warn("[RailTrafficMap] Erreur suppression tileLayer:", e);
      }
      tileLayerRef.current = null;
    }

    // 3. Supprimer la carte (CRITIQUE : doit être fait avant le nettoyage du container)
    if (mapInstanceRef.current) {
      try {
        // Supprimer tous les event listeners de la carte
        mapInstanceRef.current.off();
        // Supprimer tous les controls
        mapInstanceRef.current.remove();
      } catch (e) {
        console.warn("[RailTrafficMap] Erreur suppression map instance:", e);
      }
      mapInstanceRef.current = null;
    }

    // 4. Nettoyer COMPLÈTEMENT le conteneur DOM (TRÈS IMPORTANT)
    if (mapContainerRef.current) {
      try {
        const container = mapContainerRef.current;
        
        // Supprimer toutes les références Leaflet du container
        if ((container as any)._leaflet_id) {
          delete (container as any)._leaflet_id;
        }
        
        // Vider complètement le container
        container.innerHTML = "";
        
        // Supprimer tous les attributs data-leaflet
        const attributes = container.attributes;
        for (let i = attributes.length - 1; i >= 0; i--) {
          const attr = attributes[i];
          if (attr.name.startsWith('data-leaflet') || attr.name === '_leaflet_id') {
            container.removeAttribute(attr.name);
          }
        }
      } catch (e) {
        console.warn("[RailTrafficMap] Erreur nettoyage container DOM:", e);
        // Si le nettoyage échoue, au moins vider le container
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML = "";
          delete (mapContainerRef.current as any)._leaflet_id;
        }
      }
    }

    // 5. Réinitialiser tous les flags
    isInitializedRef.current = false;
    initAttemptRef.current = false;
  };

  // ==========================================
  // CYCLE DE VIE : INITIALISATION (UNE SEULE FOIS)
  // ==========================================
  useEffect(() => {
    // PROTECTION STRICTE : Ne pas initialiser si déjà fait ou si tentative en cours
    if (isInitializedRef.current || initAttemptRef.current || !mapContainerRef.current) {
      return;
    }

    // PROTECTION GLOBALE : Vérifier qu'on n'a pas déjà trop d'instances
    if (globalMapInstanceCount >= MAX_MAP_INSTANCES) {
      console.warn("[RailTrafficMap] Trop d'instances de carte, attente du nettoyage...");
      return;
    }

    // Marquer qu'une tentative d'initialisation est en cours (protection contre Strict Mode)
    initAttemptRef.current = true;
    
    // Enregistrer cette instance globalement
    instanceIdRef.current = globalMapInstanceCount++;
    console.log(`[RailTrafficMap] Instance #${instanceIdRef.current} - Initialisation`);

    let isMounted = true;

    const initializeMap = async () => {
      try {
        const container = mapContainerRef.current;
        if (!container || !isMounted) {
          initAttemptRef.current = false;
          if (instanceIdRef.current !== null) {
            globalMapInstanceCount--;
            instanceIdRef.current = null;
          }
          return;
        }

        // Vérification finale avant initialisation : s'assurer que le container est vraiment vide
        if ((container as any)._leaflet_id) {
          console.warn(`[RailTrafficMap] Instance #${instanceIdRef.current} - Container déjà utilisé, nettoyage forcé`);
          cleanupRailMap();
          // Attendre que le nettoyage soit terminé
          await new Promise(resolve => setTimeout(resolve, 150));
        }

        // Double vérification après nettoyage
        if ((container as any)._leaflet_id) {
          console.error(`[RailTrafficMap] Instance #${instanceIdRef.current} - Container toujours marqué, abandon`);
          initAttemptRef.current = false;
          if (instanceIdRef.current !== null) {
            globalMapInstanceCount--;
            instanceIdRef.current = null;
          }
          return;
        }

        // 1. Initialiser la carte
        console.log(`[RailTrafficMap] Instance #${instanceIdRef.current} - Création de la carte`);
        const map = await initRailMap(container);
        if (!map || !isMounted) {
          initAttemptRef.current = false;
          if (instanceIdRef.current !== null) {
            globalMapInstanceCount--;
            instanceIdRef.current = null;
          }
          return;
        }

        // Vérification post-init : s'assurer qu'on n'a pas créé une carte sur un container déjà utilisé
        if ((container as any)._leaflet_id && mapInstanceRef.current !== map) {
          console.error(`[RailTrafficMap] Instance #${instanceIdRef.current} - Conflit détecté, nettoyage`);
          try {
            map.remove();
          } catch (e) {
            // Ignorer
          }
          cleanupRailMap();
          initAttemptRef.current = false;
          if (instanceIdRef.current !== null) {
            globalMapInstanceCount--;
            instanceIdRef.current = null;
          }
          return;
        }

        // Stocker la référence de la carte
        mapInstanceRef.current = map;
        isInitializedRef.current = true;
        console.log(`[RailTrafficMap] Instance #${instanceIdRef.current} - Carte initialisée avec succès`);

        // Stocker L globalement pour les fonctions de rendu
        const L = await import("leaflet");
        (window as any).L = L.default;

        // 2. Charger les données ferroviaires
        const data = await fetchRailDelays();
        if (!isMounted) return;

        setRailData(data);
        setIsLoading(false);
        
        // NOTE: Le rendu des layers sera fait dans le useEffect suivant
        // Cela permet de séparer l'initialisation de la carte et le rendu des données
      } catch (error) {
        console.error(`[RailTrafficMap] Instance #${instanceIdRef.current} - Erreur initialisation:`, error);
        setIsLoading(false);
        isInitializedRef.current = false;
        initAttemptRef.current = false;
        if (instanceIdRef.current !== null) {
          globalMapInstanceCount--;
          instanceIdRef.current = null;
        }
      }
    };

    initializeMap();

    // Cleanup au démontage - TRÈS IMPORTANT pour éviter la réutilisation
    return () => {
      console.log(`[RailTrafficMap] Instance #${instanceIdRef.current} - Cleanup (unmount)`);
      isMounted = false;
      if (isInitializedRef.current || mapInstanceRef.current) {
        cleanupRailMap();
      }
      // Réinitialiser les flags pour permettre un nouveau montage propre
      initAttemptRef.current = false;
      if (instanceIdRef.current !== null) {
        globalMapInstanceCount--;
        instanceIdRef.current = null;
      }
    };
  }, []); // ✅ Dépendances vides = initialisation UNE SEULE FOIS

  // ==========================================
  // CYCLE DE VIE : MISE À JOUR DES LAYERS (sans recréer la carte)
  // ==========================================
  useEffect(() => {
    // Attendre que la carte soit initialisée et que les données soient chargées
    if (!mapInstanceRef.current || !isInitializedRef.current || !railData) {
      return;
    }

    const map = mapInstanceRef.current;

    // Supprimer les anciens layers
    clearRailLayers();

    // Rendre les nouveaux layers
    if (railData.lines.length > 0 || railData.stations.length > 0) {
      renderRailLines(map, railData.lines);
      renderRailStations(map, railData.stations, railData.delays);

      // Ajuster les bounds pour voir toutes les données
      try {
        const bounds: Array<[number, number]> = [];
        
        // Ajouter la position de l'utilisateur
        bounds.push([userLocation.lat || 46.6034, userLocation.lng || 1.8883]);
        
        railData.stations.forEach((station) => {
          bounds.push([station.lat, station.lng]);
        });
        
        railData.lines.forEach((line) => {
          line.coordinates.forEach((coord) => {
            bounds.push([coord.lat, coord.lng]);
          });
        });

        if (bounds.length > 1) {
          map.fitBounds(bounds as any, { padding: [50, 50], maxZoom: 12 });
        } else if (bounds.length === 1) {
          map.setView(bounds[0], 11);
        }
      } catch (e) {
        // Ignorer les erreurs de bounds
      }
    } else {
      // Si pas de données, centrer sur la position de l'utilisateur ou la France
      map.setView(
        [userLocation.lat || 46.6034, userLocation.lng || 1.8883],
        userLocation.lat && userLocation.lng ? 11 : 6
      );
    }
  }, [railData, userLocation]); // Mettre à jour quand les données ou la position changent

  // ==========================================
  // RENDU
  // ==========================================
  if (isLoading) {
    return (
      <div className="h-[500px] flex items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))] mx-auto mb-2" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Chargement de la carte ferroviaire...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      id={containerIdRef.current}
      className="h-[500px] w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800"
      style={{ position: "relative", zIndex: 0 }}
      data-leaflet-container="true"
      data-rail-map-instance={containerIdRef.current}
    />
  );
}
