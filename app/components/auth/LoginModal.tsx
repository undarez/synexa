"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou mot de passe incorrect");
      } else if (result?.ok) {
        onOpenChange(false);
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError("Une erreur est survenue lors de la connexion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connexion</DialogTitle>
          <DialogDescription>
            Connectez-vous avec votre email et mot de passe
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

