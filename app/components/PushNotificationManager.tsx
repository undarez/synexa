"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Bell, BellOff } from "lucide-react";

/**
 * Composant pour gérer l'enregistrement des notifications push
 */
export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Vérifier si les notifications sont supportées
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    ) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("[Push] Erreur lors de la vérification:", error);
    }
  };

  const subscribe = async () => {
    if (!isSupported) {
      alert("Les notifications push ne sont pas supportées par votre navigateur");
      return;
    }

    setIsLoading(true);

    try {
      // Demander la permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Les notifications ont été refusées");
        setIsLoading(false);
        return;
      }

      // Enregistrer le service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Récupérer la clé publique VAPID
      const response = await fetch("/api/push/vapid-key");
      const { publicKey } = await response.json();

      if (!publicKey) {
        throw new Error("Clé VAPID non disponible");
      }

      // Convertir la clé en format Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      // Créer la subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      // Envoyer la subscription au serveur
      const subscribeResponse = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey("p256dh")!),
            auth: arrayBufferToBase64(subscription.getKey("auth")!),
          },
        }),
      });

      if (!subscribeResponse.ok) {
        throw new Error("Erreur lors de l'enregistrement");
      }

      setIsSubscribed(true);
      console.log("[Push] Subscription réussie");
    } catch (error) {
      console.error("[Push] Erreur:", error);
      alert("Erreur lors de l'activation des notifications: " + (error instanceof Error ? error.message : "Erreur inconnue"));
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Supprimer la subscription du serveur
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });

        setIsSubscribed(false);
        console.log("[Push] Désabonnement réussi");
      }
    } catch (error) {
      console.error("[Push] Erreur:", error);
      alert("Erreur lors de la désactivation des notifications");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null; // Ne rien afficher si non supporté
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      {isSubscribed ? (
        <>
          <BellOff className="h-4 w-4" />
          Désactiver les notifications
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          Activer les notifications
        </>
      )}
    </Button>
  );
}

// Fonctions utilitaires pour convertir les clés
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}








