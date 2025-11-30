/**
 * Service météo utilisant Météo-France (gratuit, officiel pour la France)
 * Fallback: Open-Meteo (gratuit, international, pas besoin de clé)
 *
 * Météo-France est l'API officielle française, parfaite pour la géolocalisation en France
 */

export interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  icon?: string;
  date: string;
}

export interface WeatherForecast {
  current: WeatherData;
  forecast: Array<{
    date: string;
    temperature: {
      min: number;
      max: number;
    };
    description: string;
    icon?: string;
  }>;
}

/**
 * Récupère la météo actuelle et les prévisions
 * Utilise Open-Meteo par défaut (gratuit, fiable, fonctionne parfaitement pour la France)
 *
 * Open-Meteo est une excellente solution gratuite qui :
 * - Fonctionne sans clé API
 * - Fournit des données précises pour la France
 * - Supporte la géolocalisation (latitude/longitude)
 * - Offre des prévisions jusqu'à 16 jours
 * - Utilise des modèles météo européens (ECMWF) pour la France
 */
export async function getWeather(
  latitude: number,
  longitude: number,
  days: number = 5
): Promise<WeatherForecast> {
  // Utiliser Open-Meteo (gratuit, fiable, parfait pour la France)
  // Cette API utilise les modèles météo européens et est très précise pour la France
  return getWeatherOpenMeteo(latitude, longitude, days);
}

/**
 * Utilise Open-Meteo (gratuit, pas besoin de clé API, excellent pour la France)
 *
 * Open-Meteo utilise les modèles météo européens (ECMWF) qui sont très précis pour la France.
 * L'API est gratuite, sans limite de requêtes, et supporte parfaitement la géolocalisation.
 */
async function getWeatherOpenMeteo(
  latitude: number,
  longitude: number,
  days: number = 5
): Promise<WeatherForecast> {
  try {
    // Utiliser Open-Meteo (sans modèle spécifique pour éviter les erreurs)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=${days}`;

    console.log("[Weather] Appel Open-Meteo:", url);
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[Weather] Erreur API Open-Meteo:",
        response.status,
        errorText
      );
      throw new Error(`Erreur API Open-Meteo: ${response.status}`);
    }

    const data = await response.json();
    console.log(
      "[Weather] Données Open-Meteo reçues:",
      JSON.stringify(data, null, 2)
    );

    // Convertir weather_code en description
    const weatherDescriptions: Record<number, string> = {
      0: "ciel dégagé",
      1: "principalement dégagé",
      2: "partiellement nuageux",
      3: "nuageux",
      45: "brouillard",
      48: "brouillard givrant",
      51: "bruine légère",
      53: "bruine modérée",
      55: "bruine dense",
      56: "bruine verglaçante légère",
      57: "bruine verglaçante dense",
      61: "pluie légère",
      63: "pluie modérée",
      65: "pluie forte",
      66: "pluie verglaçante légère",
      67: "pluie verglaçante forte",
      71: "neige légère",
      73: "neige modérée",
      75: "neige forte",
      77: "grains de neige",
      80: "averses de pluie légères",
      81: "averses de pluie modérées",
      82: "averses de pluie fortes",
      85: "averses de neige légères",
      86: "averses de neige fortes",
      95: "orage",
      96: "orage avec grêle",
      99: "orage avec grêle forte",
    };

    // Vérifier que les données sont présentes
    if (!data.current || !data.daily) {
      console.error("[Weather] Structure de données invalide:", data);
      throw new Error("Structure de données Open-Meteo invalide");
    }

    const currentCode = data.current.weather_code || 0;
    const currentTemp = Math.round(data.current.temperature_2m || 0);

    const weatherResult = {
      current: {
        temperature: currentTemp,
        description: weatherDescriptions[currentCode] || "conditions météo",
        humidity: Math.round(data.current.relative_humidity_2m || 0),
        windSpeed: Math.round((data.current.wind_speed_10m || 0) * 3.6), // m/s -> km/h
        date: new Date().toISOString(),
      },
      forecast: (data.daily.time || []).map((date: string, index: number) => ({
        date,
        temperature: {
          min: Math.round(data.daily.temperature_2m_min[index] || 0),
          max: Math.round(data.daily.temperature_2m_max[index] || 0),
        },
        description:
          weatherDescriptions[data.daily.weather_code[index] || 0] ||
          "conditions météo",
      })),
    };

    console.log(
      "[Weather] Données formatées:",
      JSON.stringify(weatherResult, null, 2)
    );
    return weatherResult;
  } catch (error) {
    console.error("[Weather] Erreur Open-Meteo:", error);
    throw new Error("Impossible de récupérer la météo");
  }
}

/**
 * Formate la météo pour une réponse vocale/textuelle
 */
export function formatWeatherResponse(
  weather: WeatherForecast,
  question: string
): string {
  const lowerQuestion = question.toLowerCase();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Détecter si on demande pour demain
  if (lowerQuestion.includes("demain")) {
    const tomorrowForecast = weather.forecast[0];
    if (tomorrowForecast) {
      return `Demain, il fera entre ${tomorrowForecast.temperature.min} et ${tomorrowForecast.temperature.max} degrés, avec ${tomorrowForecast.description}.`;
    }
  }

  // Détecter si on demande pour aujourd'hui
  if (
    lowerQuestion.includes("aujourd'hui") ||
    lowerQuestion.includes("maintenant")
  ) {
    return `Aujourd'hui, il fait ${weather.current.temperature} degrés, avec ${weather.current.description}. L'humidité est de ${weather.current.humidity}% et le vent souffle à ${weather.current.windSpeed} km/h.`;
  }

  // Réponse par défaut (aujourd'hui + prévisions)
  let response = `Actuellement, il fait ${weather.current.temperature} degrés, avec ${weather.current.description}. `;

  if (weather.forecast.length > 0) {
    response += `Pour demain, prévu entre ${weather.forecast[0].temperature.min} et ${weather.forecast[0].temperature.max} degrés, avec ${weather.forecast[0].description}.`;
  }

  return response;
}
