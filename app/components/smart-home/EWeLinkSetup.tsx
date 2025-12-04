"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";

export function EWeLinkSetup() {
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    appId: "",
    appSecret: "",
    region: "eu",
  });

  const checkConfiguration = async () => {
    try {
      const response = await fetch("/api/smart-home/auth");
      const data = await response.json();
      setConfigured(data.configured || false);
      if (data.expired) {
        setError("Vos credentials eWeLink ont expiré. Veuillez vous reconnecter.");
      }
    } catch (error) {
      console.error("Erreur vérification:", error);
    }
  };

  useEffect(() => {
    checkConfiguration();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/smart-home/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la configuration");
      }

      setSuccess(true);
      setConfigured(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Êtes-vous sûr de vouloir déconnecter votre compte eWeLink ?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/smart-home/auth", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la déconnexion");
      }

      setConfigured(false);
      setSuccess(true);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (configured === null) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (configured) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <CardTitle>eWeLink configuré</CardTitle>
          </div>
          <CardDescription>
            Votre compte eWeLink est connecté et fonctionnel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleDisconnect} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Déconnexion...
              </>
            ) : (
              "Déconnecter"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration eWeLink</CardTitle>
        <CardDescription>
          Connectez votre compte eWeLink pour contrôler vos appareils Sonoff
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Vous devez créer une application sur{" "}
              <a
                href="https://developers.sonoff.tech/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(var(--primary))] hover:underline inline-flex items-center gap-1"
              >
                eWeLink Developer
                <ExternalLink className="h-3 w-3" />
              </a>{" "}
              pour obtenir votre App ID et App Secret.
            </AlertDescription>
          </Alert>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Configuration réussie ! Redirection en cours...
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email eWeLink</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              placeholder="votre@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe eWeLink</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appId">App ID</Label>
            <Input
              id="appId"
              value={formData.appId}
              onChange={(e) =>
                setFormData({ ...formData, appId: e.target.value })
              }
              required
              placeholder="Votre App ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appSecret">App Secret</Label>
            <Input
              id="appSecret"
              type="password"
              value={formData.appSecret}
              onChange={(e) =>
                setFormData({ ...formData, appSecret: e.target.value })
              }
              required
              placeholder="Votre App Secret"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Région</Label>
            <select
              id="region"
              value={formData.region}
              onChange={(e) =>
                setFormData({ ...formData, region: e.target.value })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="eu">Europe (EU)</option>
              <option value="us">États-Unis (US)</option>
              <option value="cn">Chine (CN)</option>
            </select>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connexion...
              </>
            ) : (
              "Connecter"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

