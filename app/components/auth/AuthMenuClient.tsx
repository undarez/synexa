"use client";

import { useState, useEffect } from "react";
import { LoginModal } from "./LoginModal";
import { RegisterModal } from "./RegisterModal";
import { Button } from "@/app/components/ui/button";

interface AuthMenuClientProps {
  user: { id: string; email?: string | null } | null;
}

export function AuthMenuClient({ user }: AuthMenuClientProps) {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Éviter l'erreur d'hydratation en ne rendant que côté client
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRegisterSuccess = () => {
    setRegisterModalOpen(false);
    setLoginModalOpen(true);
  };

  if (!mounted) {
    // Rendre un placeholder pendant l'hydratation
    return (
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" disabled>
          Se connecter
        </Button>
        <Button size="sm" disabled>
          Créer un compte
        </Button>
      </div>
    );
  }

  if (user) {
    return null; // L'utilisateur est connecté, pas besoin du menu
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLoginModalOpen(true)}
          className="text-zinc-700 dark:text-zinc-300"
        >
          Se connecter
        </Button>
        <Button
          size="sm"
          onClick={() => setRegisterModalOpen(true)}
          className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          Créer un compte
        </Button>
      </div>

      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
      <RegisterModal
        open={registerModalOpen}
        onOpenChange={setRegisterModalOpen}
        onSuccess={handleRegisterSuccess}
      />
    </>
  );
}





