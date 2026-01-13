/**
 * Page de réinitialisation de mot de passe
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { updatePassword } from "@/app/lib/auth/email-password";
import { Loader2, CheckCircle2 } from "lucide-react";
import { getBrowserClient } from "@/app/lib/supabase/client-browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Vérifier si on a un token de réinitialisation valide
    const checkSession = async () => {
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsValidSession(!!session);
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      setLoading(false);
      return;
    }

    const { error: updateError } = await updatePassword(password);

    if (updateError) {
      setError(updateError.message || "Erreur lors de la mise à jour du mot de passe");
      setLoading(false);
      return;
    }

    setSuccess(true);
    // Rediriger vers la page de connexion après 2 secondes
    setTimeout(() => {
      router.push("/auth/signin");
    }, 2000);
  };

  if (!isValidSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="mb-4 text-2xl font-semibold text-black dark:text-zinc-50">
            Lien invalide
          </h1>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            Ce lien de réinitialisation n'est plus valide ou a expiré.
          </p>
          <Button onClick={() => router.push("/auth/signin")} className="w-full">
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-4" />
          <h1 className="mb-2 text-2xl font-semibold text-black dark:text-zinc-50">
            Mot de passe mis à jour
          </h1>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            Votre mot de passe a été mis à jour avec succès. Redirection vers la page de connexion...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-2 text-2xl font-semibold text-black dark:text-zinc-50">
          Réinitialiser le mot de passe
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Entrez votre nouveau mot de passe
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              required
              minLength={6}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Répétez le mot de passe"
              required
              minLength={6}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mise à jour...
              </>
            ) : (
              "Mettre à jour le mot de passe"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
