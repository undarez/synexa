import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { getHueLights, createHueUser } from "@/app/lib/domotique/hue";
import prisma from "@/app/lib/prisma";

/**
 * GET - Récupère les lumières Hue d'un pont
 * Query: bridgeIp, username (optionnel, si pas de username, on crée un utilisateur)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const bridgeIp = searchParams.get("bridgeIp");
    const username = searchParams.get("username");

    if (!bridgeIp) {
      return NextResponse.json(
        { error: "bridgeIp est requis" },
        { status: 400 }
      );
    }

    let hueUsername = username;

    // Si pas de username, essayer de créer un utilisateur
    if (!hueUsername) {
      try {
        hueUsername = await createHueUser(bridgeIp);
        if (!hueUsername) {
          return NextResponse.json(
            {
              error: "Impossible de créer un utilisateur. Appuyez sur le bouton du pont Hue puis réessayez.",
              requiresButtonPress: true,
            },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : "Erreur lors de la création de l'utilisateur",
            requiresButtonPress: true,
          },
          { status: 400 }
        );
      }
    }

    const lights = await getHueLights(bridgeIp, hueUsername);

    // Convertir en format pour l'interface
    const lightsArray = Object.entries(lights).map(([id, light]) => ({
      id,
      name: light.name,
      type: light.type,
      state: light.state,
      modelid: light.modelid,
      manufacturername: light.manufacturername,
      uniqueid: light.uniqueid,
    }));

    return NextResponse.json({
      success: true,
      lights: lightsArray,
      username: hueUsername, // Retourner le username pour le stocker
    });
  } catch (error) {
    console.error("[GET /api/domotique/hue/lights]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors de la récupération des lumières",
      },
      { status: 500 }
    );
  }
}

