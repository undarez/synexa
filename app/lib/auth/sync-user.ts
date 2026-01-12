// app/lib/auth/sync-user.ts
// Synchronise l'utilisateur Supabase Auth avec la table User

import { supabase } from '@/app/lib/supabase/client';
import { createUser, getUserByEmail } from '@/app/lib/supabase/helpers';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';

/**
 * Synchronise un utilisateur Supabase Auth avec la table User
 * Crée l'utilisateur dans la table User s'il n'existe pas déjà
 */
export async function syncSupabaseUserToUserTable(authUser: SupabaseAuthUser) {
  try {
    // Vérifier si l'utilisateur existe déjà dans la table User
    const existingUser = await getUserByEmail(authUser.email || '').catch(() => null);

    if (existingUser) {
      // L'utilisateur existe déjà, on peut le mettre à jour si nécessaire
      if (process.env.NODE_ENV === 'development') {
        console.log('[Sync User] Utilisateur déjà existant:', existingUser.id);
      }
      return existingUser;
    }

    // Créer l'utilisateur dans la table User
    const now = new Date().toISOString();
    const { data: newUser, error: createError } = await supabase
      .from('User')
      .insert({
        id: authUser.id, // Utiliser l'ID de Supabase Auth
        email: authUser.email || null,
        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || null,
        image: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
        emailVerified: authUser.email_confirmed_at ? new Date(authUser.email_confirmed_at) : null,
        wifiEnabled: false,
        bluetoothEnabled: false,
        mobileDataEnabled: true,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (createError) {
      // Si l'utilisateur existe déjà (contrainte unique), le récupérer
      if (createError.code === '23505' || createError.message.includes('duplicate key')) {
        const existingUser = await getUserByEmail(authUser.email || '').catch(() => null);
        if (existingUser) {
          return existingUser;
        }
      }
      throw createError;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Sync User] Utilisateur créé dans la table User:', newUser.id);
    }

    return newUser;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Sync User] Erreur lors de la synchronisation:', error);
    }
    throw error;
  }
}
