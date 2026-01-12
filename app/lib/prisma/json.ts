// app/lib/prisma/json.ts
// DEPRECATED: Utilisez @/app/lib/supabase/helpers à la place
// Ce fichier est conservé temporairement pour la compatibilité

/**
 * Convertit une valeur en format JSONB pour Supabase
 * @deprecated Utilisez toJsonInput de @/app/lib/supabase/helpers
 */
export function toJsonInput(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  // Supabase accepte directement les objets JavaScript pour JSONB
  return value;
}

