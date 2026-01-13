/**
 * Service d'authentification Email/Password
 * 
 * Gère l'inscription, la connexion et la réinitialisation de mot de passe
 * via Supabase Auth.
 */

"use client";

import { getBrowserClient } from "@/app/lib/supabase/client-browser";
import type { User, Session } from "@supabase/supabase-js";

export interface SignUpResult {
  user: User | null;
  error: Error | null;
  needsEmailVerification?: boolean;
}

export interface SignInResult {
  session: Session | null;
  error: Error | null;
}

export interface ResetPasswordResult {
  error: Error | null;
}

/**
 * Inscription avec email et mot de passe
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<SignUpResult> {
  try {
    const supabase = getBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return {
        user: null,
        error: error as Error,
        needsEmailVerification: false,
      };
    }

    // Si l'email nécessite une vérification
    const needsEmailVerification = data.user && !data.session;

    return {
      user: data.user,
      error: null,
      needsEmailVerification,
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error : new Error(String(error)),
      needsEmailVerification: false,
    };
  }
}

/**
 * Connexion avec email et mot de passe
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<SignInResult> {
  try {
    const supabase = getBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        session: null,
        error: error as Error,
      };
    }

    return {
      session: data.session,
      error: null,
    };
  } catch (error) {
    return {
      session: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Demande de réinitialisation de mot de passe
 */
export async function resetPassword(email: string): Promise<ResetPasswordResult> {
  try {
    const supabase = getBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      return {
        error: error as Error,
      };
    }

    return {
      error: null,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Met à jour le mot de passe après réinitialisation
 */
export async function updatePassword(
  newPassword: string
): Promise<{ error: Error | null }> {
  try {
    const supabase = getBrowserClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return {
        error: error as Error,
      };
    }

    return {
      error: null,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
