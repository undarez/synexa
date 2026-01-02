"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Évite le flash de contenu non stylé
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Sun className="h-4 w-4" />
        <span className="sr-only">Changer de thème</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-lg border border-[hsl(var(--border))] bg-gradient-to-br from-white to-[hsl(var(--muted))]/30 dark:from-zinc-800 dark:to-zinc-900 hover:bg-gradient-to-br hover:from-[hsl(var(--primary))]/10 hover:to-[hsl(var(--primary))]/5 dark:hover:from-zinc-700 dark:hover:to-zinc-800 shadow-sm hover:shadow-md transition-all duration-200"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Changer de thème"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-amber-500 transition-all duration-200" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400 transition-all duration-200" />
      )}
      <span className="sr-only">Changer de thème</span>
    </Button>
  );
}







