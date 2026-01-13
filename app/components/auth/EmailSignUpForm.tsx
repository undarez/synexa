/**
 * Formulaire d'inscription avec email et mot de passe
 */

"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { signUpWithEmail } from "@/app/lib/auth/email-password";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface EmailSignUpFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function EmailSignUpForm({ onSuccess, onError }: EmailSignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const router = useRouter();

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

    const { user, error: signUpError, needsEmailVerification: needsVerification } =
      await signUpWithEmail(email, password);

    if (signUpError) {
      const errorMessage =
        signUpError.message || "Une erreur est survenue lors de l'inscription";
      setError(errorMessage);
      onError?.(errorMessage);
      setLoading(false);
      return;
    }

    if (needsVerification) {
      setNeedsEmailVerification(true);
      setSuccess(true);
      setLoading(false);
      return;
    }

    if (user) {
      setSuccess(true);
      onSuccess?.();
      // Rediriger vers le dashboard après un court délai
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    }
  };

  if (success && needsEmailVerification) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <div>
          <h3 className="text-lg font-semibold">Vérifiez votre email</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Un lien de confirmation a été envoyé à <strong>{email}</strong>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cliquez sur le lien pour activer votre compte.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <div>
          <h3 className="text-lg font-semibold">Inscription réussie !</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Redirection en cours...
          </p>
        </div>
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
        <Label htmlFor="password">Mot de passe</Label>
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
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Inscription...
          </>
        ) : (
          "S'inscrire"
        )}
      </Button>
    </form>
  );
}
