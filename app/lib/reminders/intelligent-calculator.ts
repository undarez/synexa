import prisma from "@/app/lib/prisma";

interface TrafficInfo {
  duration: number; // en minutes
  distance: number; // en km
  status: "normal" | "slow" | "heavy" | "unknown";
  polyline?: string; // pour afficher sur la carte
}

interface WeatherInfo {
  temperature: number;
  condition: string;
  description: string;
  dailyForecast?: Array<{
    date: string;
    tempMin: number;
    tempMax: number;
    condition: string;
  }>;
}

interface ReminderCalculation {
  shouldSend: boolean;
  recommendedSendTime: Date;
  trafficInfo?: TrafficInfo;
  weatherInfo?: WeatherInfo;
  message: string;
}

/**
 * Calcule le moment optimal pour envoyer un rappel en tenant compte du trafic et de la météo
 */
export async function calculateIntelligentReminder(
  userId: string,
  eventId: string,
  reminderMinutesBefore: number
): Promise<ReminderCalculation> {
  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    include: { user: true },
  });

  if (!event) {
    throw new Error("Événement introuvable");
  }

  const user = event.user;
  const eventStart = new Date(event.start);
  const now = new Date();

  // Calculer l'heure de départ recommandée
  let recommendedSendTime = new Date(eventStart);
  recommendedSendTime.setMinutes(recommendedSendTime.getMinutes() - reminderMinutesBefore);

  let trafficInfo: TrafficInfo | undefined;
  let weatherInfo: WeatherInfo | undefined;
  let message = `Rappel : ${event.title} dans ${reminderMinutesBefore} minutes`;

  // Si l'événement a un lieu et que l'utilisateur a une adresse de travail
  if (event.location && user.workAddress && user.workLat && user.workLng) {
    try {
      // Calculer le temps de trajet
      trafficInfo = await calculateTrafficTime(
        user.workLat,
        user.workLng,
        event.location
      );

      // Ajuster l'heure de départ recommandée en fonction du trafic
      if (trafficInfo.duration > 0) {
        const bufferMinutes = 10; // Buffer de sécurité
        recommendedSendTime = new Date(eventStart);
        recommendedSendTime.setMinutes(
          recommendedSendTime.getMinutes() - trafficInfo.duration - bufferMinutes
        );
        
        message += `\n\n🚗 Trafic : ${trafficInfo.duration} minutes de trajet`;
        if (trafficInfo.status === "heavy") {
          message += ` (trafic dense - prévoyez plus de temps)`;
        } else if (trafficInfo.status === "slow") {
          message += ` (trafic ralenti)`;
        }
      }
    } catch (error) {
      console.error("[calculateIntelligentReminder] Erreur calcul trafic:", error);
    }
  }

  // Si l'utilisateur a une adresse de travail, récupérer la météo
  if (user.workLat && user.workLng) {
    try {
      weatherInfo = await getWeatherInfo(user.workLat, user.workLng);
      
      if (weatherInfo) {
        message += `\n\n🌤️ Météo : ${weatherInfo.temperature}°C, ${weatherInfo.description}`;
        
        // Suggestions vestimentaires basiques
        if (weatherInfo.temperature < 10) {
          message += `\n💡 Pensez à prendre un manteau`;
        } else if (weatherInfo.temperature > 25) {
          message += `\n💡 Il fait chaud, habillez-vous léger`;
        }
        
        if (weatherInfo.condition.includes("pluie") || weatherInfo.condition.includes("rain")) {
          message += `\n☔ N'oubliez pas votre parapluie !`;
        }
      }
    } catch (error) {
      console.error("[calculateIntelligentReminder] Erreur météo:", error);
    }
  }

  // Vérifier si on doit envoyer maintenant
  const shouldSend = recommendedSendTime <= now;

  return {
    shouldSend,
    recommendedSendTime,
    trafficInfo,
    weatherInfo,
    message,
  };
}

/**
 * Calcule le temps de trajet en tenant compte du trafic
 */
async function calculateTrafficTime(
  fromLat: number,
  fromLng: number,
  destination: string
): Promise<TrafficInfo> {
  try {
    // Utiliser l'API de trafic simulée
    // En production, utiliser une vraie API comme Google Directions API
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/traffic?fromLat=${fromLat}&fromLng=${fromLng}&destination=${encodeURIComponent(destination)}`
    );

    if (response.ok) {
      const data = await response.json();
      return {
        duration: data.duration || 0,
        distance: data.distance || 0,
        status: data.status || "unknown",
        polyline: data.polyline,
      };
    }
  } catch (error) {
    console.error("[calculateTrafficTime]", error);
  }

  // Fallback : estimation basique
  return {
    duration: 15, // 15 minutes par défaut
    distance: 0,
    status: "unknown",
  };
}

/**
 * Récupère les informations météo
 */
async function getWeatherInfo(lat: number, lng: number): Promise<WeatherInfo | undefined> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/weather?lat=${lat}&lng=${lng}`);

    if (response.ok) {
      const data = await response.json();
      return {
        temperature: data.current?.temp || 0,
        condition: data.current?.condition || "unknown",
        description: data.current?.description || "",
        dailyForecast: data.daily,
      };
    }
  } catch (error) {
    console.error("[getWeatherInfo]", error);
  }

  return undefined;
}

