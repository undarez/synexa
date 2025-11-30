"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Loader2, Wifi, Bluetooth, RefreshCw, Plus, CheckCircle2, XCircle } from "lucide-react";
import type { DiscoveredDevice } from "@/app/lib/devices/discovery";
import {
  discoverBluetoothDevicesClient,
  bluetoothToDiscoveredDevice,
} from "@/app/lib/devices/bluetooth-client";

interface DeviceDiscoveryProps {
  onDeviceSelect: (device: DiscoveredDevice) => void;
  onCancel?: () => void;
}

export function DeviceDiscovery({ onDeviceSelect, onCancel }: DeviceDiscoveryProps) {
  const [discovering, setDiscovering] = useState(false);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState<"WIFI" | "BLUETOOTH" | "BOTH">("BOTH");

  const handleDiscover = async () => {
    setDiscovering(true);
    setError(null);
    setDevices([]);

    try {
      const allDevices: DiscoveredDevice[] = [];

      // Découverte WiFi (via API serveur)
      if (connectionType === "WIFI" || connectionType === "BOTH") {
        try {
          const response = await fetch(
            `/api/devices/discover?type=WIFI&timeout=10000`
          );

          if (response.ok) {
            const data = await response.json();
            allDevices.push(...(data.devices || []));
          }
        } catch (err) {
          console.error("Erreur découverte WiFi:", err);
        }
      }

      // Découverte Bluetooth (via Web Bluetooth API côté client)
      if (connectionType === "BLUETOOTH" || connectionType === "BOTH") {
        try {
          const bluetoothDevices = await discoverBluetoothDevicesClient();
          const discovered = bluetoothDevices.map(bluetoothToDiscoveredDevice);
          allDevices.push(...discovered);
        } catch (err) {
          if (err instanceof Error) {
            if (err.message.includes("annulé") || err.message.includes("cancelled")) {
              // L'utilisateur a annulé, ce n'est pas une erreur
            } else {
              setError(`Bluetooth: ${err.message}`);
            }
          }
        }
      }

      setDevices(allDevices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setDiscovering(false);
    }
  };

  const handleConnect = async (device: DiscoveredDevice) => {
    try {
      const response = await fetch("/api/devices/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ device }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur de connexion");
      }

      const data = await response.json();
      onDeviceSelect(device);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    }
  };

  const getTypeLabel = (type: DiscoveredDevice["type"]) => {
    const labels: Record<DiscoveredDevice["type"], string> = {
      LIGHT: "Ampoule",
      THERMOSTAT: "Thermostat",
      MEDIA: "Média",
      OUTLET: "Prise",
      SENSOR: "Capteur",
      OTHER: "Autre",
    };
    return labels[type] || type;
  };

  const getConnectionIcon = (type: DiscoveredDevice["connectionType"]) => {
    if (type === "WIFI") return <Wifi className="h-4 w-4" />;
    if (type === "BLUETOOTH") return <Bluetooth className="h-4 w-4" />;
    return (
      <div className="flex gap-1">
        <Wifi className="h-4 w-4" />
        <Bluetooth className="h-4 w-4" />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Découvrir des devices</CardTitle>
          <CardDescription>
            Recherchez les devices WiFi et Bluetooth disponibles sur votre réseau
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={connectionType === "WIFI" ? "default" : "outline"}
              size="sm"
              onClick={() => setConnectionType("WIFI")}
            >
              <Wifi className="mr-2 h-4 w-4" />
              WiFi
            </Button>
            <Button
              variant={connectionType === "BLUETOOTH" ? "default" : "outline"}
              size="sm"
              onClick={() => setConnectionType("BLUETOOTH")}
            >
              <Bluetooth className="mr-2 h-4 w-4" />
              Bluetooth
            </Button>
            <Button
              variant={connectionType === "BOTH" ? "default" : "outline"}
              size="sm"
              onClick={() => setConnectionType("BOTH")}
            >
              Les deux
            </Button>
          </div>

          <Button
            onClick={handleDiscover}
            disabled={discovering}
            className="w-full"
          >
            {discovering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recherche en cours...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Lancer la recherche
              </>
            )}
          </Button>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/20 dark:text-red-400">
              {error}
            </div>
          )}

          {devices.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {devices.length} device(s) trouvé(s)
              </p>
              <div className="space-y-2">
                {devices.map((device) => (
                  <Card key={device.id} className="border-zinc-200 dark:border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{device.name}</h4>
                            {getConnectionIcon(device.connectionType)}
                          </div>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            {getTypeLabel(device.type)} • {device.provider}
                          </p>
                          {device.metadata.signalStrength && (
                            <p className="mt-1 text-xs text-zinc-500">
                              Signal: {device.metadata.signalStrength} dBm
                            </p>
                          )}
                          {device.capabilities.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {device.capabilities.slice(0, 3).map((cap) => (
                                <span
                                  key={cap}
                                  className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
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
                        <Button
                          size="sm"
                          onClick={() => handleConnect(device)}
                          className="ml-4"
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Ajouter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!discovering && devices.length === 0 && !error && (
            <p className="text-center text-sm text-zinc-500">
              Cliquez sur "Lancer la recherche" pour découvrir les devices disponibles
            </p>
          )}

          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="w-full">
              Annuler
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

