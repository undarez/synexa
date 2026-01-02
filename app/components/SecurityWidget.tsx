"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Shield,
  Camera,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface SecurityDevice {
  id: string;
  name: string;
  type: string;
  status: string;
  isArmed: boolean;
  isEnabled: boolean;
  room: string | null;
}

export function SecurityWidget() {
  const [devices, setDevices] = useState<SecurityDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/security/devices");
      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error("Erreur chargement sécurité:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "CAMERA":
        return <Camera className="h-4 w-4" />;
      case "MOTION_DETECTOR":
        return <Activity className="h-4 w-4" />;
      case "SMOKE_DETECTOR":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ONLINE":
        return "bg-green-500";
      case "OFFLINE":
        return "bg-gray-500";
      case "ALARM":
      case "TRIGGERED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-10 w-10 text-[hsl(var(--primary))]" />
            <div>
              <h3 className="font-semibold text-lg">Sécurité</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Chargement...</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      </div>
    );
  }

  const onlineDevices = devices.filter((d) => d.status === "ONLINE");
  const armedDevices = devices.filter((d) => d.isArmed);
  const alerts = devices.filter((d) => d.status === "ALARM" || d.status === "TRIGGERED");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-10 w-10 text-[hsl(var(--primary))]" />
          <div>
            <h3 className="font-semibold text-lg">Sécurité</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {devices.length} appareil{devices.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Link href="/security">
          <Button variant="ghost" size="sm">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {devices.length === 0 ? (
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Aucun appareil configuré
          </p>
          <Link href="/security">
            <Button variant="outline" size="sm" className="mt-2">
              Configurer
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Statistiques rapides */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 text-center">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Actifs</p>
              <p className="text-lg font-bold">{onlineDevices.length}</p>
            </div>
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 text-center">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Armés</p>
              <p className="text-lg font-bold">{armedDevices.length}</p>
            </div>
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 text-center">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Alertes</p>
              <p className="text-lg font-bold text-red-500">{alerts.length}</p>
            </div>
          </div>

          {/* Liste des appareils */}
          <div className="space-y-2">
            {devices.slice(0, 3).map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3"
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getStatusColor(device.status)}`} />
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(device.type)}
                    <span className="text-sm font-medium">{device.name}</span>
                  </div>
                </div>
                <Badge variant={device.isArmed ? "default" : "secondary"} className="text-xs">
                  {device.isArmed ? "Armé" : "Désarmé"}
                </Badge>
              </div>
            ))}
          </div>

          {alerts.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  {alerts.length} alerte{alerts.length > 1 ? "s" : ""} active{alerts.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}

          <Link href="/security">
            <Button variant="outline" className="w-full" size="sm">
              Voir tous les appareils
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}

