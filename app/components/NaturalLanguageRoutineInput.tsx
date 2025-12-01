"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Loader2, Sparkles, X } from "lucide-react";
import type { ParsedRoutine } from "@/app/lib/ai/routine-parser";

interface NaturalLanguageRoutineInputProps {
  onParse: (routine: ParsedRoutine) => void;
  onCancel?: () => void;
  placeholder?: string;
}

export function NaturalLanguageRoutineInput({
  onParse,
  onCancel,
  placeholder = "Ex: Quand je dis 'Bonjour', allumer les lumières et lire les nouvelles",
}: NaturalLanguageRoutineInputProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!text.trim()) {
      setError("Veuillez entrer un texte");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/routines/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors du parsing");
      }

      const data = await response.json();
      onParse(data.routine);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleParse();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={loading}
            className="pl-10 pr-10"
          />
          {text && (
            <button
              type="button"
              onClick={() => {
                setText("");
                setError(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          onClick={handleParse}
          disabled={loading || !text.trim()}
          className="flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyse...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Créer
            </>
          )}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <p className="text-xs text-zinc-500">
        💡 Exemples : "Quand je dis 'Bonjour', allumer les lumières" | "Tous les matins à 7h, allumer le chauffage" | "Quand je rentre, allumer les lumières"
      </p>
    </div>
  );
}




