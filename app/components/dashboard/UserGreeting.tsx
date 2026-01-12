// app/components/dashboard/UserGreeting.tsx
// Composant pour afficher "Bonjour {prénom} {nom}" dans le Dashboard

import { formatUserDisplayName, formatUserFirstName } from "@/app/lib/utils/user-display";
import type { ServerUser } from "@/app/lib/auth/server";

interface UserGreetingProps {
  user: ServerUser;
  variant?: "full" | "first";
}

/**
 * Composant pour afficher le message de bienvenue personnalisé
 * 
 * @param user - Utilisateur avec firstName, lastName, fullName, etc.
 * @param variant - "full" pour "Bonjour Prénom Nom" ou "first" pour "Bonjour Prénom"
 */
export function UserGreeting({ user, variant = "full" }: UserGreetingProps) {
  const displayName = variant === "first" 
    ? formatUserFirstName(user)
    : formatUserDisplayName(user);

  return (
    <h1 className="text-4xl sm:text-5xl font-bold mb-2 text-foreground">
      Bonjour {displayName}{" "}
      <span className="inline-block animate-wave">👋</span>
    </h1>
  );
}
