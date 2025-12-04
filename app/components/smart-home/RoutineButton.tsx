"use client";

import { Button } from "@/app/components/ui/button";
import {
  Moon,
  Sun,
  LogOut,
  Film,
  Dumbbell,
  Coffee,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface Routine {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface RoutineButtonProps {
  routine: Routine;
  onExecute: (routineId: string) => void;
}

const iconMap: Record<string, any> = {
  Moon,
  Sun,
  LogOut,
  Film,
  Dumbbell,
  Coffee,
  Zap,
};

export function RoutineButton({ routine, onExecute }: RoutineButtonProps) {
  const [loading, setLoading] = useState(false);
  const Icon = iconMap[routine.icon] || Zap;

  const handleClick = async () => {
    setLoading(true);
    try {
      await onExecute(routine.id);
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className="h-auto p-6 rounded-2xl bg-gradient-to-br from-white/90 via-purple-50/40 to-violet-50/50 dark:from-zinc-900/90 dark:via-purple-950/20 dark:to-violet-950/30 backdrop-blur-sm border-2 border-purple-200/50 dark:border-purple-800/50 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-lg transition-all duration-200 flex flex-col items-center gap-3"
    >
      <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-violet-500">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-base">{routine.name}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
          {routine.description}
        </p>
      </div>
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      )}
    </Button>
  );
}




