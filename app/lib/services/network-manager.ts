/**
 * Service de gestion réseau pour Synexa
 * Gère la connexion WiFi et données mobiles
 */

export interface NetworkStatus {
  type: "wifi" | "mobile" | "offline";
  connected: boolean;
  ssid?: string;
  signalStrength?: number; // 0-100
  dataUsage?: {
    today: number; // MB
    thisMonth: number; // MB
  };
}

/**
 * Détecte le type de connexion réseau actuel
 * Note: En production, cela nécessiterait des APIs natives du navigateur
 * ou une application mobile pour accéder aux informations réseau réelles
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  // Vérifier si on est en ligne
  if (typeof navigator !== "undefined" && navigator.onLine) {
    // En production, on utiliserait des APIs comme Network Information API
    // ou des services backend pour détecter le type de connexion
    
    // Pour l'instant, on simule une détection basique
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      const effectiveType = connection.effectiveType;
      const type = connection.type || "wifi";
      
      return {
        type: type === "cellular" ? "mobile" : "wifi",
        connected: true,
        signalStrength: connection.downlink ? Math.min(100, connection.downlink * 10) : undefined,
      };
    }

    // Fallback: supposer WiFi si en ligne
    return {
      type: "wifi",
      connected: true,
    };
  }

  return {
    type: "offline",
    connected: false,
  };
}

/**
 * Configure la préférence réseau de l'utilisateur
 */
export async function updateNetworkPreference(
  userId: string,
  preferences: {
    wifiEnabled?: boolean;
    mobileDataEnabled?: boolean;
    wifiSSID?: string;
  }
): Promise<void> {
  // Cette fonction serait appelée depuis une API route
  // pour mettre à jour les préférences utilisateur dans la base de données
  const response = await fetch("/api/network/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    throw new Error("Erreur lors de la mise à jour des préférences réseau");
  }
}

/**
 * Surveille les changements de connexion réseau
 */
export function watchNetworkStatus(
  callback: (status: NetworkStatus) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const updateStatus = async () => {
    const status = await getNetworkStatus();
    callback(status);
  };

  // Écouter les événements de changement de connexion
  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);

  // Vérifier périodiquement (toutes les 30 secondes)
  const interval = setInterval(updateStatus, 30000);

  // Initialiser
  updateStatus();

  // Retourner une fonction de nettoyage
  return () => {
    window.removeEventListener("online", updateStatus);
    window.removeEventListener("offline", updateStatus);
    clearInterval(interval);
  };
}


