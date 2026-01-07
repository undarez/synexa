import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
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
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà" },
        { status: 400 }
      );
    }

    // Hasher le mot de passe avec bcrypt (10 rounds par défaut)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

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

