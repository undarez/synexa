import { google, calendar_v3 } from "googleapis";

const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

export type GoogleCalendarCredentials = {
  accessToken: string;
  refreshToken: string;
  expiryDate?: number | null;
};

function getRedirectUri() {
  // Si GOOGLE_CALENDAR_REDIRECT_URI est défini, l'utiliser
  // Sinon, construire l'URI par défaut basée sur NEXTAUTH_URL
  const customUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (customUri && customUri.trim() !== "") {
    // Vérifier que ce n'est pas un scope (erreur commune)
    if (customUri.startsWith("https://www.googleapis.com/auth/")) {
      console.warn(
        "[Google Calendar] ⚠️ GOOGLE_CALENDAR_REDIRECT_URI semble être un scope OAuth au lieu d'une URI de redirection. Utilisation de l'URI par défaut."
      );
    } else {
      return customUri.trim();
    }
  }
  
  // URI par défaut : callback Google Calendar
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/api/auth/callback/google-calendar`;
}

export function createGoogleOAuthClient() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  );
  return client;
}

export function generateGoogleAuthUrl(state?: string) {
  const client = createGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: GOOGLE_CALENDAR_SCOPES,
    prompt: "consent",
    state,
  });
}

function getCalendarApi(credentials: GoogleCalendarCredentials) {
  const client = createGoogleOAuthClient();
  client.setCredentials({
    access_token: credentials.accessToken,
    refresh_token: credentials.refreshToken,
    expiry_date: credentials.expiryDate ?? undefined,
  });
  return google.calendar({ version: "v3", auth: client });
}

export async function exchangeCodeForTokens(code: string) {
  const client = createGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  return {
    accessToken: tokens.access_token ?? "",
    refreshToken: tokens.refresh_token ?? "",
    expiryDate: tokens.expiry_date ?? null,
  };
}

export async function listGoogleEvents(
  credentials: GoogleCalendarCredentials,
  params: { calendarId?: string; timeMin?: string; timeMax?: string } = {}
) {
  const calendar = getCalendarApi(credentials);
  const response = await calendar.events.list({
    calendarId: params.calendarId ?? "primary",
    timeMin: params.timeMin,
    timeMax: params.timeMax,
    singleEvents: true,
    orderBy: "startTime",
  });
  return response.data.items ?? [];
}

export async function upsertGoogleEvent(
  credentials: GoogleCalendarCredentials,
  payload: calendar_v3.Schema$Event & { calendarId?: string }
) {
  const calendar = getCalendarApi(credentials);
  const calendarId = payload.calendarId ?? "primary";

  if (payload.id) {
    const response = await calendar.events.update({
      calendarId,
      eventId: payload.id,
      requestBody: payload,
      sendUpdates: "all",
    });
    return response.data;
  }

  const response = await calendar.events.insert({
    calendarId,
    requestBody: payload,
    sendUpdates: "all",
  });
  return response.data;
}

export async function deleteGoogleEvent(
  credentials: GoogleCalendarCredentials,
  params: { calendarId?: string; eventId: string }
) {
  const calendar = getCalendarApi(credentials);
  await calendar.events.delete({
    calendarId: params.calendarId ?? "primary",
    eventId: params.eventId,
    sendUpdates: "all",
  });
}

export async function watchGoogleCalendar(
  credentials: GoogleCalendarCredentials,
  params: {
    calendarId?: string;
    webhookUrl: string;
    channelId: string;
    resourceId?: string;
  }
) {
  const calendar = getCalendarApi(credentials);
  const response = await calendar.events.watch({
    calendarId: params.calendarId ?? "primary",
    requestBody: {
      id: params.channelId,
      type: "web_hook",
      address: params.webhookUrl,
      params: { ttl: "3600" },
    },
  });
  return response.data;
}
