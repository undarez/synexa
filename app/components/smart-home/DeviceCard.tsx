"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Lightbulb,
  Power,
  Camera,
  Wind,
  Tv,
  Thermometer,
  Settings,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface Device {
  id: string;
  name: string;
  type: string;
  room: string;
  status: "on" | "off";
  value?: number;
  icon: string;
  online?: boolean;
  model?: string;
  capabilities?: {
    brightness?: boolean;
    temperature?: boolean;
    power?: boolean;
    color?: boolean;
  };
}

interface DeviceCardProps {
  device: Device;
  onToggle: (deviceId: string) => void;
  onValueChange: (deviceId: string, value: number) => void;
}

const iconMap: Record<string, any> = {
  Lightbulb,
  Power,
  Camera,
  Wind,
  Tv,
  Thermometer,
};

export function DeviceCard({ device, onToggle, onValueChange }: DeviceCardProps) {
  const [localValue, setLocalValue] = useState(device.value || 0);
  const Icon = iconMap[device.icon] || Power;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    setLocalValue(newValue);
    onValueChange(device.id, newValue);
  };

  return (
    <Card className="border border-purple-200/50 dark:border-purple-800/50 bg-gradient-to-br from-white/90 via-purple-50/30 to-violet-50/40 dark:from-zinc-900/90 dark:via-purple-950/20 dark:to-violet-950/30 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                device.status === "on"
                  ? "bg-gradient-to-br from-blue-500 to-purple-500"
                  : "bg-gray-300 dark:bg-gray-700"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  device.status === "on" ? "text-white" : "text-gray-500"
                }`}
              />
            </div>
            <div>
              <CardTitle className="text-lg">{device.name}</CardTitle>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {device.room}
              </p>
            </div>
          </div>
          <Badge
            variant={device.status === "on" ? "default" : "secondary"}
            className="text-xs"
          >
            {device.status === "on" ? "ON" : "OFF"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle ON/OFF */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            État
          </span>
          <Button
            variant={device.status === "on" ? "default" : "outline"}
            size="sm"
            onClick={() => onToggle(device.id)}
            className={`${
              device.status === "on"
                ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                : ""
            }`}
          >
            {device.status === "on" ? "Éteindre" : "Allumer"}
          </Button>
        </div>

        {/* Slider pour variateurs */}
        {device.type === "light" && device.status === "on" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                Intensité
              </span>
              <span className="text-sm font-semibold">{localValue}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={localValue}
              onChange={handleSliderChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-500"
            />
          </div>
        )}

        {/* Bouton Configurer */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurer
          </div>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

