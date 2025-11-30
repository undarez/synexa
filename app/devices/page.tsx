"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Plus, Loader2, Wifi, Bluetooth, Settings, Trash2, Power } from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { DeviceDiscovery } from "@/app/components/DeviceDiscovery";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import type { Device } from "@prisma/client";
import type { DiscoveredDevice } from "@/app/lib/devices/discovery";
import { Footer } from "@/app/components/Footer";

export default function DevicesPage() {
  const { data: session, status } = useSession();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/?error=auth_required&redirect=/devices");
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDevices();
    }
  }, [status]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/devices");

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des devices");
      }

      const data = await response.json();
      setDevices(data.devices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceAdded = () => {
    setDiscoveryOpen(false);
    fetchDevices();
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce device ?")) {
      return;
    }

    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      fetchDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const handleCommand = async (deviceId: string, action: string) => {
    try {
      const response = await fetch(`/api/devices/${deviceId}/command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'exécution de la commande");
      }

      // Rafraîchir pour mettre à jour le statut
      fetchDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la commande");
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      LIGHT: "Ampoule",
      THERMOSTAT: "Thermostat",
      MEDIA: "Média",
      OUTLET: "Prise",
      SENSOR: "Capteur",
      OTHER: "Autre",
    };
    return labels[type] || type;
  };

  const getConnectionIcon = (capabilities: any) => {
    const connType = capabilities?.connectionType;
    if (connType === "WIFI") return <Wifi className="h-4 w-4" />;
    if (connType === "BLUETOOTH") return <Bluetooth className="h-4 w-4" />;
    return (
      <div className="flex gap-1">
        <Wifi className="h-4 w-4" />
        <Bluetooth className="h-4 w-4" />
      </div>
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Navigation />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navigation />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Mes devices
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Gérez vos devices connectés (WiFi, Bluetooth)
            </p>
          </div>
          <Button onClick={() => setDiscoveryOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un device
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {devices.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucun device</CardTitle>
              <CardDescription>
                Ajoutez votre premier device connecté pour commencer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setDiscoveryOpen(true)} variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Découvrir des devices
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {devices.map((device) => (
              <Card key={device.id} className="border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{device.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {getTypeLabel(device.type)} • {device.provider}
                      </CardDescription>
                    </div>
                    {getConnectionIcon(device.capabilities as any)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {device.room && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      📍 {device.room}
                    </p>
                  )}
                  
                  {device.lastSeenAt && (
                    <p className="text-xs text-zinc-500">
                      Vu il y a{" "}
                      {Math.floor(
                        (Date.now() - new Date(device.lastSeenAt).getTime()) / 60000
                      )}{" "}
                      min
                    </p>
                  )}

                  <div className="flex gap-2">
                    {(device.capabilities as any)?.actions?.includes("turn_on") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCommand(device.id, "turn_on")}
                        className="flex-1"
                      >
                        <Power className="mr-1 h-3 w-3" />
                        Allumer
                      </Button>
                    )}
                    {(device.capabilities as any)?.actions?.includes("turn_off") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCommand(device.id, "turn_off")}
                        className="flex-1"
                      >
                        <Power className="mr-1 h-3 w-3" />
                        Éteindre
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(device.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={discoveryOpen} onOpenChange={setDiscoveryOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un device</DialogTitle>
              <DialogDescription>
                Découvrez et connectez vos devices WiFi ou Bluetooth
              </DialogDescription>
            </DialogHeader>
            <DeviceDiscovery
              onDeviceSelect={handleDeviceAdded}
              onCancel={() => setDiscoveryOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}


