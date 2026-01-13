/**
 * Formulaire de connexion avec email et mot de passe
 */

"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { signInWithEmail, resetPassword } from "@/app/lib/auth/email-password";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface EmailSignInFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function EmailSignInForm({ onSuccess, onError }: EmailSignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { session, error: signInError } = await signInWithEmail(email, password);

    if (signInError) {
      const errorMessage =
        signInError.message || "Une erreur est survenue lors de la connexion";
      setError(errorMessage);
      onError?.(errorMessage);
      setLoading(false);
      return;
    }

    if (session) {
      onSuccess?.();
      // Rediriger vers le dashboard
      router.push("/dashboard");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Veuillez entrer votre email d'abord");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setError(resetError.message || "Erreur lors de l'envoi de l'email");
      setLoading(false);
      return;
    }

    setResetEmailSent(true);
    setLoading(false);
  };

  if (resetEmailSent) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">
            Un email de réinitialisation a été envoyé à <strong>{email}</strong>
          </p>
          <p className="mt-2 text-xs text-green-600">
            Vérifiez votre boîte de réception et suivez les instructions.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setResetEmailSent(false);
            setError(null);
          }}
          className="w-full"
        >
          Retour à la connexion
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.com"
          required
          disabled={loading}
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Mot de passe</Label>
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-xs text-primary hover:underline"
            disabled={loading}
          >
            Mot de passe oublié ?
          </button>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Votre mot de passe"
          required
          disabled={loading}
          autoComplete="current-password"
        />
      </div>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connexion...
          </>
        ) : (
          "Se connecter"
        )}
      </Button>
    </form>
  );
}
