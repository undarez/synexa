"use client";

import { useState } from "react";
import { Wifi, Bluetooth, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import type { DiscoveredDevice } from "@/app/lib/devices/discovery";
import {
  discoverBluetoothDevicesClient,
  bluetoothToDiscoveredDevice,
} from "@/app/lib/devices/bluetooth-client";

export function NetworkDetector() {
  const [detecting, setDetecting] = useState(false);
  const [detectingBluetooth, setDetectingBluetooth] = useState(false);
  const [wifiDetected, setWifiDetected] = useState<{ enabled: boolean; ssid: string | null } | null>(null);
  const [bluetoothDetected, setBluetoothDetected] = useState<{ enabled: boolean; deviceName: string | null } | null>(null);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const detectNetwork = async () => {
    setDetecting(true);
    setError(null);
    setSuccess(false);
    setWifiDetected(null);
    setBluetoothDetected(null);

    try {
      const wifiInfo: { enabled: boolean; ssid: string | null } = {
        enabled: false,
        ssid: null,
      };

      const bluetoothInfo: { enabled: boolean; deviceName: string | null } = {
        enabled: false,
        deviceName: null,
      };

      // Détection WiFi via l'API Network Information
      if (typeof navigator !== "undefined") {
        // Essayer l'API Network Information
        const connection = (navigator as any).connection || 
                          (navigator as any).mozConnection || 
                          (navigator as any).webkitConnection ||
                          (navigator as any).networkInformation;
        
        if (connection) {
          const networkType = connection.effectiveType || connection.type || connection.downlink;
          
          // Détecter si c'est WiFi (pas de données cellulaires et connexion rapide)
          if (connection.type === "wifi" || connection.type === "ethernet") {
            wifiInfo.enabled = connection.type === "wifi";
            wifiInfo.ssid = connection.type === "wifi" ? "Réseau WiFi" : null;
          } else if (connection.type === "cellular") {
            wifiInfo.enabled = false;
          } else {
            // Si on a une connexion rapide et que ce n'est pas cellulaire, c'est probablement WiFi
            const isFastConnection = connection.downlink && connection.downlink > 1; // > 1 Mbps
            wifiInfo.enabled = isFastConnection && connection.type !== "cellular";
            if (wifiInfo.enabled) {
              wifiInfo.ssid = "Réseau WiFi détecté";
            }
          }
        } else {
          // Fallback : si on est en ligne, on suppose qu'il y a une connexion réseau
          wifiInfo.enabled = navigator.onLine;
          if (wifiInfo.enabled) {
            wifiInfo.ssid = "Connexion réseau active";
          }
        }
      }

      // Détection Bluetooth via l'API Web Bluetooth
      if (typeof navigator !== "undefined" && "bluetooth" in navigator) {
        try {
          const bluetooth = (navigator as any).bluetooth;
          if (bluetooth && bluetooth.getAvailability) {
            // Vérifier la disponibilité de Bluetooth
            const available = await bluetooth.getAvailability();
            if (available) {
              bluetoothInfo.enabled = true;
              bluetoothInfo.deviceName = "Bluetooth disponible";
              
              // Essayer de demander l'accès à un périphérique (nécessite une interaction utilisateur)
              // On ne le fait pas automatiquement pour éviter de bloquer l'utilisateur
            } else {
              bluetoothInfo.enabled = false;
            }
          } else if (bluetooth) {
            // API disponible mais sans getAvailability
            bluetoothInfo.enabled = true;
            bluetoothInfo.deviceName = "Bluetooth disponible (API limitée)";
          }
        } catch (bluetoothError: any) {
          // Bluetooth n'est pas disponible ou erreur
          console.warn("Erreur détection Bluetooth:", bluetoothError);
          bluetoothInfo.enabled = false;
        }
      } else {
        // Bluetooth API non disponible dans ce navigateur
        bluetoothInfo.enabled = false;
        bluetoothInfo.deviceName = null;
      }

      setWifiDetected(wifiInfo);
      setBluetoothDetected(bluetoothInfo);

      // Découvrir les devices réels
      const discoveredDevices: DiscoveredDevice[] = [];

      // Découverte WiFi devices
      if (wifiInfo.enabled) {
        try {
          const wifiResponse = await fetch("/api/devices/discover?type=WIFI&timeout=15000");
          if (wifiResponse.ok) {
            const wifiData = await wifiResponse.json();
            if (wifiData.devices && Array.isArray(wifiData.devices)) {
              discoveredDevices.push(...wifiData.devices);
            }
          }
        } catch (err) {
          console.warn("Erreur découverte WiFi devices:", err);
        }
      }

      // Note: Bluetooth nécessite une sélection manuelle via la fenêtre native
      // On ne le fait pas automatiquement ici, mais on propose un bouton séparé

      setDevices(discoveredDevices);

      // Sauvegarder les informations détectées
      const response = await fetch("/api/detect-network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wifi: wifiInfo,
          bluetooth: bluetoothInfo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(errorData.error || "Erreur lors de la sauvegarde");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Erreur détection réseau:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la détection");
    } finally {
      setDetecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          <Bluetooth className="h-5 w-5" />
          Détection réseau
        </CardTitle>
        <CardDescription>
          Détectez automatiquement vos connexions WiFi et Bluetooth
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={detectNetwork}
          disabled={detecting}
          className="w-full"
          variant="outline"
        >
          {detecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Détection en cours...
            </>
          ) : (
            <>
              <Wifi className="mr-2 h-4 w-4" />
              Détecter WiFi & Bluetooth
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-600 dark:text-green-400">
              Connexions détectées et sauvegardées !
            </p>
          </div>
        )}

        {(wifiDetected || bluetoothDetected) && (
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800">
            {wifiDetected && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    WiFi
                  </span>
                </div>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {wifiDetected.enabled ? (
                    wifiDetected.ssid || "Connecté"
                  ) : (
                    "Non détecté"
                  )}
                </span>
              </div>
            )}

            {bluetoothDetected && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bluetooth className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    Bluetooth
                  </span>
                </div>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {bluetoothDetected.enabled ? (
                    bluetoothDetected.deviceName || "Disponible"
                  ) : (
                    "Non disponible"
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bouton séparé pour Bluetooth */}
        {bluetoothDetected?.enabled && typeof navigator !== "undefined" && "bluetooth" in navigator && (
          <Button
            onClick={async () => {
              setDetectingBluetooth(true);
              setError(null);
              
              try {
                const isSecure = window.location.protocol === "https:" || 
                                 window.location.hostname === "localhost" || 
                                 window.location.hostname === "127.0.0.1";
                
                if (!isSecure) {
                  setError("Bluetooth nécessite HTTPS ou localhost");
                  return;
                }

                // Ouvrir la fenêtre de sélection Bluetooth
                const bluetoothDevices = await discoverBluetoothDevicesClient();
                const discovered = bluetoothDevices.map(bluetoothToDiscoveredDevice);
                
                // Ajouter aux devices existants
                setDevices(prev => {
                  const existingIds = new Set(prev.map(d => d.id));
                  const newDevices = discovered.filter(d => !existingIds.has(d.id));
                  return [...prev, ...newDevices];
                });
                
                if (discovered.length > 0) {
                  setSuccess(true);
                  setTimeout(() => setSuccess(false), 3000);
                }
              } catch (err) {
                if (err instanceof Error) {
                  // Si l'utilisateur a annulé, ne pas afficher d'erreur
                  if (!err.message.includes("annulé") && 
                      !err.message.includes("cancelled") &&
                      err.name !== "NotFoundError") {
                    setError(`Bluetooth: ${err.message}`);
                  }
                }
              } finally {
                setDetectingBluetooth(false);
              }
            }}
            disabled={detectingBluetooth}
            className="w-full"
            variant="outline"
          >
            {detectingBluetooth ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sélection d'un device...
              </>
            ) : (
              <>
                <Bluetooth className="mr-2 h-4 w-4" />
                Sélectionner un device Bluetooth
              </>
            )}
          </Button>
        )}

        {/* Liste des devices détectés */}
        {devices.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Devices détectés ({devices.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-start justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {device.connectionType === "WIFI" ? (
                        <Wifi className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Bluetooth className="h-4 w-4 text-blue-600" />
                      )}
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {device.name}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {device.type} • {device.provider}
                      {device.metadata.ip && ` • ${device.metadata.ip}`}
                    </p>
                    {device.capabilities.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {device.capabilities.slice(0, 3).map((cap) => (
                          <span
                            key={cap}
                            className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          >
                            {cap}
                          </span>
                        ))}
                        {device.capabilities.length > 3 && (
                          <span className="text-xs text-zinc-500">
                            +{device.capabilities.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {devices.length === 0 && !detecting && !detectingBluetooth && (wifiDetected || bluetoothDetected) && (
          <div className="space-y-2 text-center">
            <p className="text-xs text-zinc-500">
              Aucun device détecté.
            </p>
            {wifiDetected?.enabled && (
              <p className="text-xs text-zinc-500">
                Pour WiFi : Assurez-vous que vos devices sont allumés et sur le même réseau. Le scan peut prendre jusqu'à 15 secondes.
              </p>
            )}
            {bluetoothDetected?.enabled && (
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">
                  Pour Bluetooth : Cliquez sur "Sélectionner un device Bluetooth" ci-dessus.
                </p>
                <p className="text-xs text-zinc-400">
                  ⚠️ Une fenêtre native s'ouvrira pour choisir votre device. Web Bluetooth ne fonctionne qu'avec les devices Bluetooth Low Energy (BLE).
                </p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1 text-xs text-zinc-500">
          <p>
            💡 La détection WiFi scanne automatiquement votre réseau local.
          </p>
          {bluetoothDetected?.enabled && (
            <p>
              🔵 Bluetooth nécessite une sélection manuelle via la fenêtre native du navigateur. Seuls les devices BLE (Bluetooth Low Energy) sont supportés.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

