import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { getSmartHomeData } from "@/app/lib/services/ewelink";

/**
 * GET /api/smart-home/data
 * Récupère toutes les données de la Smart Home
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    // Récupérer les données depuis eWeLink
    const data = await getSmartHomeData(user.id);

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Smart Home API] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des données",
        // Données de démonstration en cas d'erreur
        overview: {
          temperature: 21,
          devicesOn: 3,
          devicesOff: 2,
          status: "Maison sécurisée",
        },
        rooms: [
          {
            id: "salon",
            name: "Salon",
            icon: "Home",
            color: "blue",
            deviceCount: 2,
          },
          {
            id: "cuisine",
            name: "Cuisine",
            icon: "Utensils",
            color: "green",
            deviceCount: 1,
          },
          {
            id: "chambre",
            name: "Chambre",
            icon: "Bed",
            color: "purple",
            deviceCount: 1,
          },
        ],
        devices: [
          {
            id: "light-1",
            name: "Lumière Salon",
            type: "light",
            room: "salon",
            status: "on",
            value: 75,
            icon: "Lightbulb",
          },
          {
            id: "plug-1",
            name: "Prise Cuisine",
            type: "plug",
            room: "cuisine",
            status: "off",
            icon: "Power",
          },
          {
            id: "light-2",
            name: "Lumière Chambre",
            type: "light",
            room: "chambre",
            status: "on",
            value: 50,
            icon: "Lightbulb",
          },
        ],
        routines: [
          {
            id: "bonsoir",
            name: "Bonsoir",
            icon: "Moon",
            description: "Éteint tout, baisse lumière, active alarme",
          },
          {
            id: "reveil",
            name: "Réveil",
            icon: "Sun",
            description: "Allume lumière douce + musique",
          },
          {
            id: "quitter",
            name: "Je quitte",
            icon: "LogOut",
            description: "Coupe tous les appareils",
          },
          {
            id: "cinema",
            name: "Mode Cinéma",
            icon: "Film",
            description: "Lumière basse + TV ON",
          },
          {
            id: "sport",
            name: "Mode Sport",
            icon: "Dumbbell",
            description: "Lumière blanche + musique énergie",
          },
        ],
      },
      { status: 500 }
    );
  }
}




