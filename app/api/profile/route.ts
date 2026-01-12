import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase/client";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
import { generateUserCode } from "@/app/lib/user-code";
import { encryptUserData, decryptUserData } from "@/app/lib/encryption-helpers";
import { logger } from "@/app/lib/logger";

export async function GET() {
  let user;
  try {
    user = await requireUser();
    
    // Récupérer le profil utilisateur avec Supabase
    const { data: userProfile, error: fetchError } = await supabase
      .from('User')
      .select('*')
      .eq('id', user.id)
      .single();

    // Si l'utilisateur n'existe pas, le créer avec les informations de la session
    if (fetchError || !userProfile) {
      const now = new Date().toISOString();
      const { data: newUser, error: createError } = await supabase
        .from('User')
        .insert({
          id: user.id,
          email: user.email || null,
          name: user.name || null,
          image: user.image || null,
          createdAt: now,
          updatedAt: now,
        })
        .select()
        .single();

      if (createError || !newUser) {
        console.error('[GET /profile] Erreur création utilisateur:', createError);
        return NextResponse.json(
          { error: 'Erreur lors de la création du profil', details: createError?.message },
          { status: 500 }
        );
      }

      // Déchiffrer les données sensibles avant de les retourner
      const decryptedProfile = decryptUserData(newUser as any);
      logger.info("Profil utilisateur créé", { userId: user.id });
      return NextResponse.json({ profile: decryptedProfile });
    }

    // Si l'utilisateur n'a pas de code, en générer un
    if (!userProfile.userCode) {
      try {
        let newCode: string | undefined;
        let isUnique = false;
        let attempts = 0;
        
        // S'assurer que le code est unique
        while (!isUnique && attempts < 10) {
          newCode = generateUserCode();
          const { data: existing } = await supabase
            .from('User')
            .select('id')
            .eq('userCode', newCode)
            .single();
          
          if (!existing) {
            isUnique = true;
          }
          attempts++;
        }
        
        if (isUnique && newCode) {
          await supabase
            .from('User')
            .update({ userCode: newCode, updatedAt: new Date().toISOString() })
            .eq('id', user.id);
          userProfile.userCode = newCode;
        }
      } catch (error: any) {
        // Ignorer les erreurs de génération de code
        logger.warn("Erreur lors de la génération du code utilisateur", error);
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
  let user;
  try {
    user = await requireUser();
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
      updateData.workLat = body.workLat ? parseFloat(body.workLat) : undefined;
    }
    if (body.workLng !== undefined) {
      updateData.workLng = body.workLng ? parseFloat(body.workLng) : undefined;
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
    const { data: existingUser, error: fetchError } = await supabase
      .from('User')
      .select('id, email, name, image')
      .eq('id', user.id)
      .single();

    if (fetchError || !existingUser) {
      // L'utilisateur n'existe pas dans la base de données, le créer
      const now = new Date().toISOString();
      const { data: newUser, error: createError } = await supabase
        .from('User')
        .insert({
          id: user.id,
          email: user.email || null,
          name: user.name || null,
          image: user.image || null,
          ...encryptedData,
          createdAt: now,
          updatedAt: now,
        })
        .select()
        .single();

      if (createError || !newUser) {
        console.error('[PATCH /profile] Erreur création utilisateur:', createError);
        return NextResponse.json(
          { error: 'Erreur lors de la création du profil', details: createError?.message },
          { status: 500 }
        );
      }

      // Déchiffrer les données sensibles avant de les retourner
      const decryptedProfile = decryptUserData(newUser as any);
      logger.info("Profil utilisateur créé", { userId: user.id });
      return NextResponse.json({ profile: decryptedProfile });
    }

    // Mettre à jour l'utilisateur
    const { data: updated, error: updateError } = await supabase
      .from('User')
      .update({
        ...encryptedData,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError || !updated) {
      console.error('[PATCH /profile] Erreur mise à jour:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du profil', details: updateError?.message },
        { status: 500 }
      );
    }

    // Déchiffrer les données sensibles avant de les retourner
    const decryptedProfile = decryptUserData(updated as any);

    logger.info("Profil utilisateur mis à jour", {
      userId: user.id,
      fieldsUpdated: Object.keys(updateData),
    });

    return NextResponse.json({ profile: decryptedProfile });
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


