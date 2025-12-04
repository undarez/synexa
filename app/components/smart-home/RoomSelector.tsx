"use client";

import { Card, CardContent } from "@/app/components/ui/card";
import {
  Home,
  Utensils,
  Bed,
  Droplet,
  Car,
  TreePine,
  Building2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

interface Room {
  id: string;
  name: string;
  icon: string;
  color: string;
  deviceCount: number;
}

interface RoomSelectorProps {
  rooms: Room[];
  selectedRoom: string | null;
  onSelectRoom: (roomId: string | null) => void;
}

const iconMap: Record<string, any> = {
  Home,
  Utensils,
  Bed,
  Droplet,
  Car,
  TreePine,
  Building2,
};

const colorClasses: Record<string, string> = {
  blue: "from-blue-500 to-cyan-500",
  green: "from-green-500 to-emerald-500",
  purple: "from-purple-500 to-violet-500",
  orange: "from-orange-500 to-amber-500",
  pink: "from-pink-500 to-rose-500",
  indigo: "from-indigo-500 to-blue-500",
};

export function RoomSelector({
  rooms,
  selectedRoom,
  onSelectRoom,
}: RoomSelectorProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
      {/* Tous */}
      <Card
        className={cn(
          "min-w-[140px] cursor-pointer transition-all duration-200 border-2",
          selectedRoom === null
            ? "border-purple-500 shadow-lg scale-105"
            : "border-purple-200/50 dark:border-purple-800/50 hover:border-purple-300 dark:hover:border-purple-700"
        )}
        onClick={() => onSelectRoom(null)}
      >
        <CardContent className="p-6 bg-gradient-to-br from-white/90 via-purple-50/30 to-violet-50/40 dark:from-zinc-900/90 dark:via-purple-950/20 dark:to-violet-950/30 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-violet-500">
              <Home className="h-6 w-6 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Tous</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {rooms.reduce((sum, r) => sum + r.deviceCount, 0)} appareils
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pièces */}
      {rooms.map((room) => {
        const Icon = iconMap[room.icon] || Home;
        const colors = colorClasses[room.color] || colorClasses.purple;

        return (
          <Card
            key={room.id}
            className={cn(
              "min-w-[140px] cursor-pointer transition-all duration-200 border-2",
              selectedRoom === room.id
                ? "border-purple-500 shadow-lg scale-105"
                : "border-purple-200/50 dark:border-purple-800/50 hover:border-purple-300 dark:hover:border-purple-700"
            )}
            onClick={() => onSelectRoom(room.id)}
          >
            <CardContent className="p-6 bg-gradient-to-br from-white/90 via-purple-50/30 to-violet-50/40 dark:from-zinc-900/90 dark:via-purple-950/20 dark:to-violet-950/30 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className={`p-3 rounded-full bg-gradient-to-br ${colors}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm">{room.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {room.deviceCount} appareil{room.deviceCount > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}




