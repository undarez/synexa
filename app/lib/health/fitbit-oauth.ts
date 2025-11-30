/**
 * OAuth Flow pour Fitbit
 * 
 * Fitbit utilise OAuth 2.0 avec authorization code flow
 */

export interface FitbitOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Génère l'URL d'autorisation Fitbit
 */
export function getFitbitAuthUrl(config: FitbitOAuthConfig, state?: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: "activity heartrate sleep weight",
    state: state || Math.random().toString(36).substring(7),
  });

  return `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Échange le code d'autorisation contre un access token
 */
export async function exchangeFitbitCode(
  code: string,
  config: FitbitOAuthConfig
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  const response = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || "Erreur lors de l'échange du code");
  }

  return await response.json();
}

/**
 * Rafraîchit un access token Fitbit
 */
export async function refreshFitbitToken(
  refreshToken: string,
  config: FitbitOAuthConfig
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  const response = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || "Erreur lors du rafraîchissement du token");
  }

  return await response.json();
}

