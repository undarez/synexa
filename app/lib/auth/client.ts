// app/lib/auth/client.ts
// Hook d'authentification côté client avec gestion du loader
// Réexporte useAuth depuis use-auth.ts pour une architecture claire

"use client";

// Réexporter useAuth et ses types depuis use-auth.ts
export { useAuth, type UseAuthReturn, type AuthSession } from "./use-auth";
