// app/lib/supabase/helpers.ts
// Helpers pour faciliter l'utilisation de Supabase

import { supabase } from './client';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Gère les erreurs Supabase de manière uniforme
 */
export function handleSupabaseError(error: PostgrestError | null): void {
  if (error) {
    console.error('[Supabase] Erreur:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Erreur Supabase: ${error.message}`);
  }
}

/**
 * Convertit une date JavaScript en format PostgreSQL
 */
export function toPostgresDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Convertit une date PostgreSQL en Date JavaScript
 */
export function fromPostgresDate(date: string | null | undefined): Date | null {
  if (!date) return null;
  return new Date(date);
}

/**
 * Récupère un utilisateur par ID
 */
export async function getUserById(userId: string) {
  const { data, error } = await supabase
    .from('User')
    .select('*')
    .eq('id', userId)
    .single();
  
  handleSupabaseError(error);
  return data;
}

/**
 * Récupère un utilisateur par email
 */
export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('User')
    .select('*')
    .eq('email', email)
    .single();
  
  handleSupabaseError(error);
  return data;
}

/**
 * Crée un nouvel utilisateur
 */
export async function createUser(userData: {
  id?: string;
  email?: string;
  name?: string;
  password?: string;
  image?: string;
  [key: string]: unknown;
}) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('User')
    // @ts-expect-error - Le type Database.Insert est any, mais TypeScript ne l'infère pas correctement
    .insert({
      ...userData,
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single();
  
  handleSupabaseError(error);
  return data;
}

/**
 * Met à jour un utilisateur
 */
export async function updateUser(userId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('User')
    // @ts-expect-error - Le type Database.Update est any, mais TypeScript ne l'infère pas correctement
    .update({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();
  
  handleSupabaseError(error);
  return data;
}

/**
 * Supprime un utilisateur
 */
export async function deleteUser(userId: string) {
  const { error } = await supabase
    .from('User')
    .delete()
    .eq('id', userId);
  
  handleSupabaseError(error);
}

/**
 * Convertit une valeur en format JSONB pour Supabase
 * Supabase accepte directement les objets JavaScript, mais cette fonction
 * peut être utile pour normaliser les valeurs null/undefined
 */
export function toJsonInput(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  // Supabase accepte directement les objets JavaScript pour JSONB
  return value;
}

/**
 * Génère un UUID pour les IDs de table
 */
export function generateId(): string {
  return crypto.randomUUID();
}

