"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

interface RegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RegisterModal({ open, onOpenChange, onSuccess }: RegisterModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue lors de l'inscription");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
        setSuccess(false);
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      setError("Une erreur est survenue lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Inscription</DialogTitle>
          <DialogDescription>
            Créez votre compte pour accéder à Synexa
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <svg
                className="h-6 w-6 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              Compte créé avec succès !
            </p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Vous pouvez maintenant vous connecter
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-zinc-900 dark:text-zinc-50"
              >
                Nom complet
              </label>
              <input
                id="name"
                type="text"
                placeholder="Jean Dupont"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-zinc-900 dark:text-zinc-50"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-zinc-900 dark:text-zinc-50"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={8}
                className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-500"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Minimum 8 caractères
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-zinc-900 dark:text-zinc-50"
              >
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
                className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              {isLoading ? "Inscription..." : "Créer mon compte"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

