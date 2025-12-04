"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Home,
  Thermometer,
  Lightbulb,
  Power,
  Camera,
  Wind,
  Tv,
  Sparkles,
  Zap,
  Moon,
  Sun,
  Coffee,
  Film,
  Dumbbell,
  LogOut,
  Shield,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { DeviceCard } from "@/app/components/smart-home/DeviceCard";
import { RoomSelector } from "@/app/components/smart-home/RoomSelector";
import { RoutineButton } from "@/app/components/smart-home/RoutineButton";
import { EWeLinkSetup } from "@/app/components/smart-home/EWeLinkSetup";
import { useDevicesStore } from "@/app/lib/stores/smart-home/devices";
import { useRoomsStore } from "@/app/lib/stores/smart-home/rooms";
import { useLogsStore } from "@/app/lib/stores/smart-home/logs";

export default function SmartHomePage() {
  const { data: session, status } = useSession();
  const { devices, loading, error, fetchDevices, toggleDevice: toggleDeviceStore, updateDevice } = useDevicesStore();
  const { rooms, selectedRoom, selectRoom, fetchRooms } = useRoomsStore();
  const { addLog } = useLogsStore();
  const [overview, setOverview] = useState<any>(null);
  const [routines, setRoutines] = useState<any[]>([]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchAllData();
    }
  }, [status]);

  const fetchAllData = async () => {
    try {
      const response = await fetch("/api/smart-home/data");
      const result = await response.json();
      
      // Mettre à jour les stores
      useDevicesStore.getState().setDevices(result.devices || []);
      useRoomsStore.getState().setRooms(result.rooms || []);
      setOverview(result.overview);
      setRoutines(result.routines || []);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
      addLog({
        type: "system",
        action: "fetch_data",
        status: "error",
        details: { error: (error as Error).message },
      });
    }
  };

  const toggleDevice = async (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    if (!device) return;

    // Optimistic update
    toggleDeviceStore(deviceId);
    addLog({
      type: "device",
      action: "toggle",
      deviceId,
      status: "pending",
      details: { newStatus: device.status === "on" ? "off" : "on" },
    });

    try {
      await fetch(`/api/smart-home/devices/${deviceId}/toggle`, {
        method: "POST",
      });
      await fetchAllData();
      addLog({
        type: "device",
        action: "toggle",
        deviceId,
        status: "success",
      });
    } catch (error) {
      // Revert on error
      toggleDeviceStore(deviceId);
      addLog({
        type: "device",
        action: "toggle",
        deviceId,
        status: "error",
        details: { error: (error as Error).message },
      });
    }
  };

  const updateDeviceValue = async (deviceId: string, value: number) => {
    updateDevice(deviceId, { value });
    addLog({
      type: "device",
      action: "update_value",
      deviceId,
      status: "pending",
      details: { value },
    });

    try {
      await fetch(`/api/smart-home/devices/${deviceId}/value`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      addLog({
        type: "device",
        action: "update_value",
        deviceId,
        status: "success",
      });
    } catch (error) {
      addLog({
        type: "device",
        action: "update_value",
        deviceId,
        status: "error",
        details: { error: (error as Error).message },
      });
    }
  };

  const executeRoutine = async (routineId: string) => {
    addLog({
      type: "routine",
      action: "execute",
      routineId,
      status: "pending",
    });

    try {
      await fetch(`/api/smart-home/routines/${routineId}/execute`, {
        method: "POST",
      });
      await fetchAllData();
      addLog({
        type: "routine",
        action: "execute",
        routineId,
        status: "success",
      });
    } catch (error) {
      addLog({
        type: "routine",
        action: "execute",
        routineId,
        status: "error",
        details: { error: (error as Error).message },
      });
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))] mx-auto mb-4"></div>
          <p className="text-[hsl(var(--muted-foreground))]">Chargement...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const filteredDevices = selectedRoom
    ? devices.filter((d) => d.room === selectedRoom)
    : devices;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50/20 to-violet-50/30 dark:from-zinc-900 dark:via-purple-950/10 dark:to-violet-950/20">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Home className="h-8 w-8 text-[hsl(var(--primary))]" />
              <h1 className="text-4xl font-bold text-[hsl(var(--foreground))]">
                Smart Home
              </h1>
            </div>
          </div>
          <p className="text-lg text-[hsl(var(--muted-foreground))] mb-4">
            Contrôlez votre maison intelligente en un coup d'œil
          </p>
          
          {/* Configuration eWeLink */}
          <div className="mb-6">
            <EWeLinkSetup />
          </div>
        </div>

        {/* Section 1 : Vue d'ensemble - Style Fratech95 (simple et clair) */}
        {overview && (
          <section className="mb-8">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">
                  Vue d'ensemble
                </h2>
                <Badge
                  variant={overview.status.includes("sécurisée") ? "default" : "secondary"}
                  className="text-xs"
                >
                  {overview.status}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Température */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                  <Thermometer className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Température</p>
                    <p className="text-xl font-bold text-[hsl(var(--foreground))]">
                      {overview.temperature ? `${overview.temperature}°C` : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Appareils allumés */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Allumés</p>
                    <p className="text-xl font-bold text-[hsl(var(--foreground))]">
                      {overview.devicesOn}
                    </p>
                  </div>
                </div>

                {/* Appareils éteints */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <Power className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Éteints</p>
                    <p className="text-xl font-bold text-[hsl(var(--foreground))]">
                      {overview.devicesOff}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 2 : Pièces - Style Fratech95 */}
        {rooms.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))] mb-4">
              Pièces
            </h2>
            <RoomSelector
              rooms={rooms}
              selectedRoom={selectedRoom}
              onSelectRoom={selectRoom}
            />
          </section>
        )}

        {/* Section 3 : Appareils - Style Fratech95 (cartes simples) */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">
              Appareils
            </h2>
            {selectedRoom && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectRoom(null)}
              >
                Voir tous
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDevices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onToggle={toggleDevice}
                onValueChange={updateDeviceValue}
              />
            ))}
          </div>
          {filteredDevices.length === 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 p-12 text-center">
              <AlertCircle className="h-12 w-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
              <p className="text-lg font-medium text-[hsl(var(--foreground))] mb-2">
                Aucun appareil trouvé
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Ajoutez des appareils dans les paramètres
              </p>
            </div>
          )}
        </section>

        {/* Section 4 : Scénarios rapides - Style Fratech95 (boutons ronds) */}
        {routines.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))] mb-4">
              Routines Synexa
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {routines.map((routine) => (
                <RoutineButton
                  key={routine.id}
                  routine={routine}
                  onExecute={executeRoutine}
                />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

