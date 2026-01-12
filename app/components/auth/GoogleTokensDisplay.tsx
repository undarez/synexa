// app/components/auth/GoogleTokensDisplay.tsx
// Composant pour afficher les tokens Google après connexion OAuth
// Permet de vérifier que provider_token et provider_refresh_token sont bien récupérés

"use client";

import { useAuth } from "@/app/lib/auth/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/app/components/ui/button";

/**
 * Composant pour afficher les tokens Google Calendar après connexion OAuth
 * Affiche provider_token et provider_refresh_token pour vérification
 * 
 * IMPORTANT : Ce composant est uniquement pour le développement
 * En production, ne JAMAIS afficher les tokens dans l'UI
 */
export function GoogleTokensDisplay() {
  const { session, loading } = useAuth();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Ne pas afficher en production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Ne pas afficher si pas de session
  if (loading || !session || !session.user) {
    return null;
  }

  // Vérifier si les tokens Google sont présents
  const hasProviderToken = !!session.provider_token;
  const hasProviderRefreshToken = !!session.provider_refresh_token;
  const hasAccessToken = !!session.access_token;

  // Ne pas afficher si aucun token Google n'est présent
  if (!hasProviderToken && !hasProviderRefreshToken) {
    return null;
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(type);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      console.error("[GoogleTokensDisplay] Erreur copie:", error);
    }
  };

  const maskToken = (token: string | null | undefined) => {
    if (!token) return "❌ Absent";
    return `${token.substring(0, 20)}...${token.substring(token.length - 10)}`;
  };

  return (
    <Card className="mt-4 border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-orange-900 dark:text-orange-100">
          🔑 Tokens Google Calendar (Mode Développement)
        </CardTitle>
        <CardDescription className="text-xs text-orange-700 dark:text-orange-300">
          Vérification des tokens après connexion OAuth Google
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Provider Token (Access Token Google) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-orange-900 dark:text-orange-100">
              provider_token (Google Access Token)
            </label>
            <Badge variant={hasProviderToken ? "default" : "destructive"} className="text-xs">
              {hasProviderToken ? "✅ Présent" : "❌ Absent"}
            </Badge>
          </div>
          {hasProviderToken && (
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-orange-100 px-2 py-1 text-xs text-orange-900 dark:bg-orange-900/50 dark:text-orange-100">
                {maskToken(session.provider_token)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => copyToClipboard(session.provider_token!, "provider_token")}
              >
                {copiedToken === "provider_token" ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          )}
          {!hasProviderToken && (
            <p className="text-xs text-orange-600 dark:text-orange-400">
              Le provider_token n'est pas présent. Vérifiez que les scopes sont correctement configurés.
            </p>
          )}
        </div>

        {/* Provider Refresh Token */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-orange-900 dark:text-orange-100">
              provider_refresh_token (Google Refresh Token)
            </label>
            <Badge variant={hasProviderRefreshToken ? "default" : "destructive"} className="text-xs">
              {hasProviderRefreshToken ? "✅ Présent" : "❌ Absent"}
            </Badge>
          </div>
          {hasProviderRefreshToken && (
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-orange-100 px-2 py-1 text-xs text-orange-900 dark:bg-orange-900/50 dark:text-orange-100">
                {maskToken(session.provider_refresh_token)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => copyToClipboard(session.provider_refresh_token!, "provider_refresh_token")}
              >
                {copiedToken === "provider_refresh_token" ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          )}
          {!hasProviderRefreshToken && (
            <p className="text-xs text-orange-600 dark:text-orange-400">
              ⚠️ Le provider_refresh_token est absent. Vérifiez que :
              <br />• access_type=offline est présent dans queryParams
              <br />• prompt=consent est présent dans queryParams
              <br />• L'utilisateur a bien donné son consentement
            </p>
          )}
        </div>

        {/* Supabase Access Token (pour info) */}
        {hasAccessToken && (
          <div className="space-y-1 border-t border-orange-200 pt-2 dark:border-orange-800">
            <label className="text-xs font-medium text-orange-900 dark:text-orange-100">
              Supabase access_token (pour info)
            </label>
            <code className="block rounded bg-orange-100 px-2 py-1 text-xs text-orange-900 dark:bg-orange-900/50 dark:text-orange-100">
              {maskToken(session.access_token)}
            </code>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-3 rounded border border-orange-200 bg-orange-100/50 p-2 dark:border-orange-800 dark:bg-orange-900/30">
          <p className="text-xs text-orange-800 dark:text-orange-200">
            <strong>💡 Utilisation :</strong> Utilisez <code className="text-xs">session.provider_token</code> pour
            appeler l'API Google Calendar. Utilisez <code className="text-xs">session.provider_refresh_token</code> pour
            rafraîchir le token quand il expire.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
