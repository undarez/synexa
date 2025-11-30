import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/session";
import { getWeather, formatWeatherResponse } from "@/app/lib/services/weather";

/**
 * Récupère la météo pour l'utilisateur
 * GET /api/weather?lat=48.8566&lon=2.3522&question=quel temps fera-t-il demain
 */
export async function GET(request: NextRequest) {
  try {
    await requireUser();

    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const question = searchParams.get("question") || "";

    if (!lat || !lon) {
      return NextResponse.json(
        { error: "Latitude et longitude requises" },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: "Coordonnées invalides" },
        { status: 400 }
      );
    }

    console.log("[API Weather] Récupération météo pour:", latitude, longitude);
    const weather = await getWeather(latitude, longitude);
    console.log(
      "[API Weather] Météo récupérée:",
      JSON.stringify(weather, null, 2)
    );

    const response = formatWeatherResponse(weather, question);

    // Adapter le format pour la page météo
    const weatherData = {
      current: weather.current,
      forecast: weather.forecast,
      location: {
        lat: latitude,
        lon: longitude,
      },
    };

    console.log(
      "[API Weather] Données envoyées:",
      JSON.stringify(weatherData, null, 2)
    );

    return NextResponse.json({
      success: true,
      weather: weatherData,
      response,
    });
  } catch (error) {
    console.error("[GET /api/weather]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la récupération de la météo",
      },
      { status: 400 }
    );
  }
}
