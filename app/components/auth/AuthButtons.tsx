"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { LoginModal } from "./LoginModal";
import { RegisterModal } from "./RegisterModal";

export default function AuthButtons() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const handleGoogleSignIn = () => {
    console.log("🔵 [AUTHBUTTONS] Clic sur Google Sign In");
    setIsLoading(true);
    signIn("google", { 
      callbackUrl: "/dashboard",
      redirect: true,
    }).catch((error) => {
      console.error("🔵 [AUTHBUTTONS] Erreur lors de la connexion Google:", error);
      setIsLoading(false);
    });
  };

  const handleFacebookSignIn = () => {
    setIsLoading(true);
    signIn("facebook", { callbackUrl: "/dashboard" });
  };

  const handleRegisterSuccess = () => {
    setRegisterModalOpen(false);
    setLoginModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Google */}
      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continuer avec Google
      </button>

      {/* Facebook */}
      <button
        onClick={handleFacebookSignIn}
        disabled={isLoading}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
      >
        <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        Continuer avec Facebook
      </button>

      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <p className="mb-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Ou utilisez votre email et mot de passe
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setLoginModalOpen(true)}
            disabled={isLoading}
            className="h-12 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
          >
            Se connecter
          </button>
          <button
            onClick={() => setRegisterModalOpen(true)}
            disabled={isLoading}
            className="h-12 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            Créer un compte
          </button>
        </div>
      </div>

      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
      <RegisterModal
        open={registerModalOpen}
        onOpenChange={setRegisterModalOpen}
        onSuccess={handleRegisterSuccess}
      />
    </div>
  );
}

