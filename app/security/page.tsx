"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  Shield,
  Camera,
  Activity,
  AlertTriangle,
  DoorOpen,
  Square,
  Radio,
  Plus,
  Settings,
  Power,
  PowerOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Video,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

interface SecurityDevice {
  id: string;
  name: string;
  type: string;
  provider: string;
  room: string | null;
  status: string;
  isArmed: boolean;
  isEnabled: boolean;
  connectionType: string | null;
  connectionUrl: string | null;
  lastSeenAt: string | null;
  lastTriggeredAt: string | null;
}

export default function SecurityPage() {
  const { data: session, status } = useSession();
  const [devices, setDevices] = useState<SecurityDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingDevice, setAddingDevice] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: "",
    type: "CAMERA",
    provider: "RTSP",
    room: "",
    connectionType: "rtsp",
    connectionUrl: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/?error=auth_required&redirect=/security");
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
      const response = await fetch("/api/security/devices");
      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des appareils:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async () => {
    try {
      setAddingDevice(true);
      const response = await fetch("/api/security/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDevice.name,
          type: newDevice.type,
          provider: newDevice.provider,
          room: newDevice.room || undefined,
          connectionType: newDevice.connectionType,
          connectionUrl: newDevice.connectionUrl || undefined,
          credentials: {
            username: newDevice.username,
            password: newDevice.password,
          },
        }),
      });

      if (response.ok) {
        await fetchDevices();
        setNewDevice({
          name: "",
          type: "CAMERA",
          provider: "RTSP",
          room: "",
          connectionType: "rtsp",
          connectionUrl: "",
          username: "",
          password: "",
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'appareil:", error);
    } finally {
      setAddingDevice(false);
    }
  };

  const handleToggleArm = async (deviceId: string, currentArmed: boolean) => {
    try {
      await fetch(`/api/security/devices/${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArmed: !currentArmed }),
      });
      await fetchDevices();
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
    }
  };

  const handleToggleEnabled = async (deviceId: string, currentEnabled: boolean) => {
    try {
      await fetch(`/api/security/devices/${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !currentEnabled }),
      });
      await fetchDevices();
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "CAMERA":
        return <Camera className="h-5 w-5" />;
      case "MOTION_DETECTOR":
        return <Activity className="h-5 w-5" />;
      case "SMOKE_DETECTOR":
        return <AlertTriangle className="h-5 w-5" />;
      case "DOOR_SENSOR":
        return <DoorOpen className="h-5 w-5" />;
      case "WINDOW_SENSOR":
        return <Square className="h-5 w-5" />;
      default:
        return <Radio className="h-5 w-5" />;
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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Shield className="h-8 w-8 text-[hsl(var(--primary))]" />
              Sécurité du logement
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Centre de contrôle centralisé pour vos appareils de sécurité
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Ajouter un appareil
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Ajouter un appareil de sécurité</DialogTitle>
                <DialogDescription>
                  Configurez votre caméra, détecteur ou capteur de sécurité
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nom de l'appareil</Label>
                  <Input
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    placeholder="Ex: Caméra salon"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={newDevice.type}
                      onValueChange={(value) => setNewDevice({ ...newDevice, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAMERA">Caméra</SelectItem>
                        <SelectItem value="MOTION_DETECTOR">Détecteur de mouvement</SelectItem>
                        <SelectItem value="SMOKE_DETECTOR">Détecteur de fumée</SelectItem>
                        <SelectItem value="DOOR_SENSOR">Capteur de porte</SelectItem>
                        <SelectItem value="WINDOW_SENSOR">Capteur de fenêtre</SelectItem>
                        <SelectItem value="ALARM">Alarme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Provider</Label>
                    <Select
                      value={newDevice.provider}
                      onValueChange={(value) => setNewDevice({ ...newDevice, provider: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RTSP">RTSP</SelectItem>
                        <SelectItem value="ONVIF">ONVIF</SelectItem>
                        <SelectItem value="TUYA">Tuya</SelectItem>
                        <SelectItem value="ZIGBEE">Zigbee</SelectItem>
                        <SelectItem value="SONOFF">Sonoff</SelectItem>
                        <SelectItem value="EZVIZ">EZVIZ</SelectItem>
                        <SelectItem value="NETATMO">Netatmo</SelectItem>
                        <SelectItem value="SOMFY">Somfy</SelectItem>
                        <SelectItem value="LEGRAND">Legrand</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Pièce (optionnel)</Label>
                  <Input
                    value={newDevice.room}
                    onChange={(e) => setNewDevice({ ...newDevice, room: e.target.value })}
                    placeholder="Ex: Salon, Chambre, etc."
                  />
                </div>
                {(newDevice.type === "CAMERA" && (newDevice.provider === "RTSP" || newDevice.provider === "ONVIF")) && (
                  <>
                    <div>
                      <Label>URL de connexion (RTSP/ONVIF)</Label>
                      <Input
                        value={newDevice.connectionUrl}
                        onChange={(e) => setNewDevice({ ...newDevice, connectionUrl: e.target.value })}
                        placeholder="rtsp://192.168.1.100:554/stream"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nom d'utilisateur</Label>
                        <Input
                          value={newDevice.username}
                          onChange={(e) => setNewDevice({ ...newDevice, username: e.target.value })}
                          type="text"
                        />
                      </div>
                      <div>
                        <Label>Mot de passe</Label>
                        <Input
                          value={newDevice.password}
                          onChange={(e) => setNewDevice({ ...newDevice, password: e.target.value })}
                          type="password"
                        />
                      </div>
                    </div>
                  </>
                )}
                <Button
                  onClick={handleAddDevice}
                  disabled={!newDevice.name || addingDevice}
                  className="w-full"
                >
                  {addingDevice ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter l'appareil
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Vue d'ensemble */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Appareils actifs</p>
                  <p className="text-2xl font-bold">{devices.filter((d) => d.status === "ONLINE").length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Appareils armés</p>
                  <p className="text-2xl font-bold">{devices.filter((d) => d.isArmed).length}</p>
                </div>
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Alertes</p>
                  <p className="text-2xl font-bold">{devices.filter((d) => d.status === "ALARM" || d.status === "TRIGGERED").length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Total</p>
                  <p className="text-2xl font-bold">{devices.length}</p>
                </div>
                <Radio className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des appareils */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <Card key={device.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[hsl(var(--primary))]/10 p-2">
                      {getDeviceIcon(device.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{device.name}</CardTitle>
                      <CardDescription>
                        {device.room || "Aucune pièce"} • {device.provider}
                      </CardDescription>
                    </div>
                  </div>
                  <div className={`h-3 w-3 rounded-full ${getStatusColor(device.status)}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">Statut</span>
                    <Badge variant={device.status === "ONLINE" ? "default" : "secondary"}>
                      {device.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">Armé</span>
                    <Button
                      size="sm"
                      variant={device.isArmed ? "default" : "outline"}
                      onClick={() => handleToggleArm(device.id, device.isArmed)}
                    >
                      {device.isArmed ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">Activé</span>
                    <Button
                      size="sm"
                      variant={device.isEnabled ? "default" : "outline"}
                      onClick={() => handleToggleEnabled(device.id, device.isEnabled)}
                    >
                      {device.isEnabled ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </Button>
                  </div>
                  {device.type === "CAMERA" && device.connectionUrl && (
                    <Button variant="outline" className="w-full" size="sm">
                      <Video className="mr-2 h-4 w-4" />
                      Voir le flux
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {devices.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))]" />
              <p className="mt-4 text-[hsl(var(--muted-foreground))]">
                Aucun appareil de sécurité configuré. Ajoutez votre premier appareil pour commencer.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}

