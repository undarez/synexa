import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { generateUserCode } from "@/app/lib/user-code";
import { encryptUserData, decryptUserData } from "@/app/lib/encryption-helpers";
import { logger } from "@/app/lib/logger";

export async function GET() {
  let user;
  try {
    user = await requireUser();
    
    // Essayer de récupérer avec les nouveaux champs, avec fallback si les colonnes n'existent pas
    let userProfile;
    try {
      userProfile = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          userCode: true,
          pseudo: true,
          firstName: true,
          lastName: true,
          homeAddress: true,
          workAddress: true,
          workLat: true,
          workLng: true,
          email: true,
          image: true,
          wifiEnabled: true,
          wifiSSID: true,
          bluetoothEnabled: true,
          bluetoothDeviceName: true,
          mobileDataEnabled: true,
          meterSerialNumber: true,
          siceaRPM: true,
        },
      });

      // Si l'utilisateur n'existe pas, le créer avec les informations de la session
      if (!userProfile) {
        userProfile = await prisma.user.create({
          data: {
            id: user.id,
            email: user.email || null,
            name: user.name || null,
            image: user.image || null,
          },
          select: {
            id: true,
            userCode: true,
            pseudo: true,
            firstName: true,
            lastName: true,
            homeAddress: true,
            workAddress: true,
            workLat: true,
            workLng: true,
            email: true,
            image: true,
          },
        });
      }
    } catch (error: any) {
      // Si les colonnes n'existent pas encore, utiliser les champs de base
      if (error?.code === "P2022" || error?.message?.includes("does not exist")) {
        userProfile = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            image: true,
            name: true,
          },
        });
        
        // Si l'utilisateur n'existe toujours pas, le créer
        if (!userProfile) {
          userProfile = await prisma.user.create({
            data: {
              id: user.id,
              email: user.email || null,
              name: user.name || null,
              image: user.image || null,
            },
            select: {
              id: true,
              email: true,
              image: true,
              name: true,
            },
          });
        }
        
        // Ajouter les champs manquants avec null
        if (userProfile) {
          (userProfile as any).userCode = null;
          (userProfile as any).pseudo = null;
          (userProfile as any).firstName = null;
          (userProfile as any).lastName = null;
          (userProfile as any).homeAddress = null;
          (userProfile as any).workAddress = null;
          (userProfile as any).workLat = null;
          (userProfile as any).workLng = null;
        }
      } else {
        throw error;
      }
    }

    // Si l'utilisateur n'a pas de code, en générer un (seulement si la colonne existe)
    if (userProfile && !(userProfile as any).userCode) {
      try {
        let newCode: string;
        let isUnique = false;
        let attempts = 0;
        
        // S'assurer que le code est unique
        while (!isUnique && attempts < 10) {
          newCode = generateUserCode();
          const existing = await prisma.user.findUnique({
            where: { userCode: newCode },
          });
          if (!existing) {
            isUnique = true;
          }
          attempts++;
        }
        
        if (isUnique && newCode!) {
          await prisma.user.update({
            where: { id: user.id },
            data: { userCode: newCode },
          });
          (userProfile as any).userCode = newCode;
        }
      } catch (error: any) {
        // Si la colonne userCode n'existe pas encore, ignorer l'erreur
        if (error?.code !== "P2022" && !error?.message?.includes("does not exist")) {
          throw error;
        }
      }
    }

    // Déchiffrer les données sensibles avant de les retourner
    const decryptedProfile = decryptUserData(userProfile as any);

    logger.info("Profil utilisateur récupéré", { userId: user.id });
    return NextResponse.json({ profile: decryptedProfile });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      logger.warn("Tentative d'accès non autorisé au profil");
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    logger.error("Erreur lors de la récupération du profil", error, {
      userId: user?.id,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const updateData: {
      pseudo?: string;
      firstName?: string;
      lastName?: string;
      homeAddress?: string;
      workAddress?: string;
      workLat?: number;
      workLng?: number;
      wifiEnabled?: boolean;
      wifiSSID?: string;
      bluetoothEnabled?: boolean;
      bluetoothDeviceName?: string;
      mobileDataEnabled?: boolean;
      meterSerialNumber?: string;
      siceaRPM?: string;
    } = {};

    if (body.pseudo !== undefined) {
      updateData.pseudo = body.pseudo.trim() || null;
    }
    if (body.firstName !== undefined) {
      updateData.firstName = body.firstName.trim() || null;
    }
    if (body.lastName !== undefined) {
      updateData.lastName = body.lastName.trim() || null;
    }
    if (body.homeAddress !== undefined) {
      updateData.homeAddress = body.homeAddress.trim() || null;
    }
    if (body.workAddress !== undefined) {
      updateData.workAddress = body.workAddress.trim() || null;
    }
    if (body.workLat !== undefined) {
      updateData.workLat = body.workLat ? parseFloat(body.workLat) : null;
    }
    if (body.workLng !== undefined) {
      updateData.workLng = body.workLng ? parseFloat(body.workLng) : null;
    }
    if (body.wifiEnabled !== undefined) {
      updateData.wifiEnabled = Boolean(body.wifiEnabled);
    }
    if (body.wifiSSID !== undefined) {
      updateData.wifiSSID = body.wifiSSID.trim() || null;
    }
    if (body.bluetoothEnabled !== undefined) {
      updateData.bluetoothEnabled = Boolean(body.bluetoothEnabled);
    }
    if (body.bluetoothDeviceName !== undefined) {
      updateData.bluetoothDeviceName = body.bluetoothDeviceName.trim() || null;
    }
    if (body.mobileDataEnabled !== undefined) {
      updateData.mobileDataEnabled = Boolean(body.mobileDataEnabled);
    }
    if (body.meterSerialNumber !== undefined) {
      updateData.meterSerialNumber = body.meterSerialNumber.trim() || null;
    }
    if (body.siceaRPM !== undefined) {
      updateData.siceaRPM = body.siceaRPM.trim() || null;
    }

    // Chiffrer les données sensibles avant sauvegarde
    const encryptedData = encryptUserData(updateData);

    // Vérifier d'abord si l'utilisateur existe, sinon le créer
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
        },
      });
    } catch (error: any) {
      // Si les colonnes n'existent pas encore, essayer sans select
      if (error?.code === "P2022" || error?.message?.includes("does not exist")) {
        existingUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          },
        });
      } else {
        throw error;
      }
    }

    if (!existingUser) {
      // L'utilisateur n'existe pas dans la base de données (probablement après une réinitialisation)
      // Le créer avec les informations de la session
      existingUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email || null,
          name: user.name || null,
          image: user.image || null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
        },
      });
    }

    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: encryptedData,
        select: {
          id: true,
          userCode: true,
          pseudo: true,
          firstName: true,
          lastName: true,
          homeAddress: true,
          workAddress: true,
          workLat: true,
          workLng: true,
          email: true,
          image: true,
          wifiEnabled: true,
          wifiSSID: true,
          bluetoothEnabled: true,
          bluetoothDeviceName: true,
          mobileDataEnabled: true,
          meterSerialNumber: true,
          siceaRPM: true,
        },
      });

      // Déchiffrer les données sensibles avant de les retourner
      const decryptedProfile = decryptUserData(updated as any);

      logger.info("Profil utilisateur mis à jour", {
        userId: user.id,
        fieldsUpdated: Object.keys(updateData),
      });

      return NextResponse.json({ profile: decryptedProfile });
    } catch (error: any) {
      // Si les colonnes n'existent pas encore, retourner une erreur explicite
      if (error?.code === "P2022" || error?.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "La base de données doit être mise à jour. Veuillez exécuter: npx prisma db push" 
          },
          { status: 500 }
        );
      }
      // Gérer l'erreur P2025 (utilisateur non trouvé)
      if (error?.code === "P2025") {
        return NextResponse.json(
          { 
            error: "Votre session n'est plus valide. Veuillez vous déconnecter et vous reconnecter." 
          },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      logger.warn("Tentative de mise à jour non autorisée du profil");
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    logger.error("Erreur lors de la mise à jour du profil", error, {
      userId: user?.id,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}


