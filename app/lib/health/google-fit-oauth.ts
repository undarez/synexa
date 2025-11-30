/**
 * OAuth Flow pour Google Fit
 * 
 * Google Fit utilise OAuth 2.0 avec les mêmes credentials que Google Calendar
 * mais nécessite des scopes spécifiques pour accéder aux données de fitness
 */

export interface GoogleFitOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Génère l'URL d'autorisation Google Fit
 * Utilise les mêmes credentials que Google Calendar mais avec des scopes fitness
 */
export function getGoogleFitAuthUrl(config: GoogleFitOAuthConfig, state?: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: [
      "https://www.googleapis.com/auth/fitness.activity.read",
      "https://www.googleapis.com/auth/fitness.heart_rate.read",
      "https://www.googleapis.com/auth/fitness.sleep.read",
      "https://www.googleapis.com/auth/fitness.body.read",
      "https://www.googleapis.com/auth/fitness.location.read",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state: state || Math.random().toString(36).substring(7),
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Échange le code d'autorisation contre un access token
 */
export async function exchangeGoogleFitCode(
  code: string,
  config: GoogleFitOAuthConfig
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || "Erreur lors de l'échange du code");
  }

  return await response.json();
}

/**
 * Rafraîchit un access token Google Fit
 */
export async function refreshGoogleFitToken(
  refreshToken: string,
  config: GoogleFitOAuthConfig
): Promise<{
  access_token: string;
  expires_in: number;
  token_type: string;
}> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || "Erreur lors du rafraîchissement du token");
  }

  return await response.json();
}

