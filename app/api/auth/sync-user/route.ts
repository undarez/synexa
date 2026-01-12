// app/api/auth/sync-user/route.ts
// Route API pour synchroniser un utilisateur Supabase Auth avec la table User
// Crée l'utilisateur dans la table User s'il n'existe pas déjà

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/app/lib/supabase/client";

/**
 * POST - Synchronise un utilisateur Supabase Auth avec la table User
 * Crée l'utilisateur dans la table User s'il n'existe pas déjà
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, name, image } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId et email sont requis" },
        { status: 400 }
      );
    }

    // Utiliser le service role key pour bypasser RLS si disponible
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      return NextResponse.json(
        { error: "Variables d'environnement Supabase manquantes" },
        { status: 500 }
      );
    }

    // Utiliser le service role key si disponible, sinon l'anon key
    const supabase = createClient<Database>(
      supabaseUrl,
      serviceRoleKey || anonKey!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Vérifier si l'utilisateur existe déjà dans la table User (par ID ou email)
    type UserData = { id: string; name: string | null; email: string | null; image: string | null; [key: string]: unknown };
    const { data: existingUser, error: fetchError } = await supabase
      .from('User')
      .select('*')
      .or(`id.eq.${userId},email.eq.${email}`)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      if (process.env.NODE_ENV === 'development') {
        console.error("[Sync User] Erreur lors de la vérification:", fetchError);
      }
    }

    const typedExistingUser = existingUser as UserData | null;

    if (typedExistingUser) {
      // Mettre à jour le nom si l'utilisateur existe mais n'a pas de nom (ou si un nouveau nom est fourni)
      const needsUpdate = (!typedExistingUser.name && name) || 
                         (name && typedExistingUser.name !== name) ||
                         (image && typedExistingUser.image !== image);
      
      if (needsUpdate) {
        const updateData: Record<string, unknown> = {
          updatedAt: new Date().toISOString(),
        };
        
        if (name && typedExistingUser.name !== name) {
          updateData.name = name;
        }
        
        if (image && typedExistingUser.image !== image) {
          updateData.image = image;
        }

        if (email && typedExistingUser.email !== email) {
          updateData.email = email;
        }

        // @ts-ignore - Supabase infère 'never' mais les données sont valides
        const { data: updatedUser, error: updateError } = await supabase
          .from('User')
          // @ts-ignore
          .update(updateData as any)
          .eq('id', userId)
          .select()
          .single();

        if (!updateError && updatedUser) {
          const typedUpdatedUser = updatedUser as UserData;
          if (process.env.NODE_ENV === 'development') {
            console.log("[Sync User] ✅ Utilisateur mis à jour:", typedUpdatedUser.id, "nom:", typedUpdatedUser.name);
          }
          return NextResponse.json({ user: typedUpdatedUser, created: false, updated: true }, { status: 200 });
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log("[Sync User] ✅ Utilisateur déjà existant:", typedExistingUser.id, "nom:", typedExistingUser.name);
      }
      return NextResponse.json({ user: typedExistingUser, created: false, updated: false }, { status: 200 });
    }

    // Créer l'utilisateur dans la table User
    const now = new Date().toISOString();
    type NewUserData = { id: string; email: string | null; name: string | null; image: string | null; [key: string]: unknown };
    const { data: newUser, error: createError } = await supabase
      .from('User')
      .insert({
        id: userId, // Utiliser l'ID de Supabase Auth
        email: email || null,
        name: name || email?.split('@')[0] || null,
        image: image || null,
        emailVerified: new Date(), // L'email est vérifié via OAuth
        wifiEnabled: false,
        bluetoothEnabled: false,
        mobileDataEnabled: true,
        createdAt: now,
        updatedAt: now,
      } as any)
      .select()
      .single();

    if (createError) {
      // Si l'utilisateur existe déjà (contrainte unique), le récupérer
      if (createError.code === '23505' || createError.message.includes('duplicate key') || createError.message.includes('unique')) {
        const { data: existingUser } = await supabase
          .from('User')
          .select('*')
          .or(`id.eq.${userId},email.eq.${email}`)
          .maybeSingle();
        
        if (existingUser) {
          return NextResponse.json({ user: existingUser as UserData, created: false }, { status: 200 });
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.error("[Sync User] Erreur lors de la création de l'utilisateur:", createError);
      }
      return NextResponse.json(
        { error: createError.message, code: createError.code },
        { status: 500 }
      );
    }

    const typedNewUser = newUser as NewUserData | null;
    if (process.env.NODE_ENV === 'development') {
      console.log("[Sync User] ✅ Utilisateur créé dans la table User:", typedNewUser?.id);
    }

    return NextResponse.json({ user: typedNewUser, created: true }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("[Sync User] Erreur inattendue:", error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inattendue" },
      { status: 500 }
    );
  }
}
