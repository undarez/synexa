"use client";

import { useState } from "react";
import { LoginModal } from "./LoginModal";
import { RegisterModal } from "./RegisterModal";
import { Button } from "@/app/components/ui/button";

export function AuthMenu() {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const handleRegisterSuccess = () => {
    setRegisterModalOpen(false);
    setLoginModalOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => setLoginModalOpen(true)}
          className="text-zinc-700 dark:text-zinc-300"
        >
          Se connecter
        </Button>
        <Button
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

