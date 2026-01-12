import { NextRequest, NextResponse } from "next/server";
// @ts-expect-error - bcrypt n'a pas de types TypeScript par défaut
import bcrypt from "bcrypt";
import { supabase } from "@/app/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    // Vérifier que DATABASE_URL est configuré
    if (!process.env.DATABASE_URL) {
      console.error("❌ [REGISTER] DATABASE_URL non configuré");
      return NextResponse.json(
        { error: "Configuration de la base de données manquante" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { name, email, password } = body;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe déjà
    let existingUser;
    try {
      const { data: user, error: fetchError } = await supabase
        .from('User')
        .select('id, email')
        .eq('email', email)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      existingUser = user;
    } catch (dbError) {
      console.error("❌ [REGISTER] Erreur de connexion à la base de données:", dbError);
      if (dbError instanceof Error) {
        if (dbError.message.includes("ECONNREFUSED")) {
          console.error("💡 [REGISTER] La connexion à PostgreSQL est refusée.");
          console.error("   → Vérifiez que DATABASE_URL est configuré dans .env.local");
          console.error("   → Vérifiez que la base de données PostgreSQL est accessible");
          return NextResponse.json(
            { 
              error: "Impossible de se connecter à la base de données. Vérifiez que DATABASE_URL est configuré dans .env.local" 
            },
            { status: 503 }
          );
        }
        if (dbError.message.includes("Unique constraint")) {
          return NextResponse.json(
            { error: "Un compte avec cet email existe déjà" },
            { status: 400 }
          );
        }
      }
      throw dbError;
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà" },
        { status: 400 }
      );
    }

    // Hasher le mot de passe avec bcrypt (10 rounds par défaut)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    type NewUser = { id: string; name: string; email: string; createdAt: string };
    let user: NewUser | null = null;
    try {
      const now = new Date().toISOString();
      const { data: newUser, error: createError } = await supabase
        .from('User')
        .insert({
          name,
          email,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        } as any)
        .select('id, name, email, createdAt')
        .single();

      if (createError || !newUser) {
        throw createError || new Error('Erreur lors de la création de l\'utilisateur');
      }

      user = newUser as NewUser;
    } catch (dbError) {
      console.error("❌ [REGISTER] Erreur lors de la création de l'utilisateur:", dbError);
      if (dbError instanceof Error && dbError.message.includes("ECONNREFUSED")) {
        return NextResponse.json(
          { error: "Impossible de se connecter à la base de données. Vérifiez votre configuration." },
          { status: 503 }
        );
      }
      throw dbError;
    }

    console.log("✅ [REGISTER] Utilisateur créé:", {
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ [REGISTER] Erreur:", error);
    
    if (error instanceof Error) {
      // Erreur Prisma (contrainte unique, etc.)
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "Un compte avec cet email existe déjà" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'inscription" },
      { status: 500 }
    );
  }
}

