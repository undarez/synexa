"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Loader2,
  Settings,
  Calendar,
  DollarSign,
  Activity,
} from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

interface ConsumptionData {
  date: string;
  consumption: number;
  cost: number;
  peakHours?: number;
  offPeakHours?: number;
}

interface ConsumptionStats {
  total: number;
  average: number;
  min: number;
  max: number;
  totalCost: number;
  trend: number;
}

export default function EnergyPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState<ConsumptionData[]>([]);
  const [stats, setStats] = useState<ConsumptionStats | null>(null);
  const [peaks, setPeaks] = useState<ConsumptionData[]>([]);
  const [optimizations, setOptimizations] = useState<Array<{ type: string; message: string; savings?: number }>>([]);
  const [meterSerialNumber, setMeterSerialNumber] = useState("");
  const [rpm, setRpm] = useState("");
  const [linkyToken, setLinkyToken] = useState("");
  const [enedisConfigured, setEnedisConfigured] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/?error=auth_required&redirect=/energy");
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      checkEnedisConfig();
      fetchConsumption();
    }
  }, [status, period]);

  const checkEnedisConfig = async () => {
    try {
      const response = await fetch("/api/energy/enedis");
      if (response.ok) {
        const result = await response.json();
        if (result.credentials) {
          setEnedisConfigured(true);
          setMeterSerialNumber(result.credentials.meterSerialNumber || "");
          setRpm(result.credentials.rpm || "");
          setLinkyToken(result.credentials.hasLinkyToken ? "***" : ""); // Ne pas afficher le token complet
          setConsentGiven(result.credentials.consentGiven || false);
        }
      }
    } catch (error) {
      console.error("Erreur vérification Enedis:", error);
    }
  };

  const fetchConsumption = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/energy/consumption?period=${period}`);
      if (response.ok) {
        const result = await response.json();
        setData(result.data || []);
        setStats(result.stats || null);
        setPeaks(result.peaks || []);
        setOptimizations(result.optimizations || []);
      } else if (response.status === 400) {
        // Compteur non configuré
        setEnedisConfigured(false);
      }
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureEnedis = async () => {
    if (!consentGiven) {
      setShowConsentError(true);
      return;
    }

    try {
      setConfiguring(true);
      setShowConsentError(false);
      const response = await fetch("/api/energy/enedis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          meterSerialNumber,
          rpm: rpm || undefined,
          linkyToken: linkyToken || undefined,
          consentGiven: true,
        }),
      });

      if (response.ok) {
        setEnedisConfigured(true);
        await fetchConsumption();
      } else {
        const errorData = await response.json();
        if (errorData.requiresConsent) {
          setShowConsentError(true);
        }
      }
    } catch (error) {
      console.error("Erreur configuration Enedis:", error);
    } finally {
      setConfiguring(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Zap className="h-8 w-8 text-[hsl(var(--primary))]" />
              Consommation électrique
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Suivez et optimisez votre consommation d'électricité
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 dernières heures</SelectItem>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="1m">1 mois</SelectItem>
                <SelectItem value="1y">1 an</SelectItem>
              </SelectContent>
            </Select>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Configuration Enedis</DialogTitle>
                  <DialogDescription>
                    Configurez votre compteur pour récupérer vos données de consommation depuis l'API Enedis
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="meterSerialNumber">
                      Numéro de série du compteur <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="meterSerialNumber"
                      value={meterSerialNumber}
                      onChange={(e) => setMeterSerialNumber(e.target.value)}
                      placeholder="Ex: 12345678901234"
                    />
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      Trouvez ce numéro sur votre facture d'électricité ou directement sur votre compteur
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="rpm">
                      Numéro RPM (Relevé de Puissance Maximale) <span className="text-xs text-[hsl(var(--muted-foreground))]">(optionnel mais recommandé)</span>
                    </Label>
                    <Input
                      id="rpm"
                      value={rpm}
                      onChange={(e) => setRpm(e.target.value)}
                      placeholder="Ex: 12345678901"
                    />
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      Le RPM permet une identification plus précise de votre compteur. 
                      Vous le trouvez sur votre facture d'électricité.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="linkyToken">
                      Token Linky <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="linkyToken"
                      type="password"
                      value={linkyToken}
                      onChange={(e) => setLinkyToken(e.target.value)}
                      placeholder="Votre token Linky"
                    />
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      Ce token est nécessaire pour récupérer vos données de consommation depuis l'API Enedis.
                      <br />
                      <a 
                        href="https://conso.vercel.app/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[hsl(var(--primary))] hover:underline"
                      >
                        Générez votre token gratuitement ici
                      </a>
                    </p>
                  </div>

                  {/* Consentement RGPD */}
                  <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="consent"
                        checked={consentGiven}
                        onChange={(e) => {
                          setConsentGiven(e.target.checked);
                          setShowConsentError(false);
                        }}
                        className="mt-1 h-4 w-4 rounded border-[hsl(var(--border))]"
                      />
                      <div className="flex-1">
                        <Label htmlFor="consent" className="cursor-pointer font-medium">
                          J'accepte l'utilisation de mes données de compteur
                        </Label>
                        <div className="mt-2 space-y-2 text-xs text-[hsl(var(--muted-foreground))]">
                          <p>
                            <strong>Conformité RGPD :</strong> En cochant cette case, vous acceptez que Synexa :
                          </p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Stocke et chiffre vos données de compteur (numéro de série et RPM) de manière sécurisée</li>
                            <li>Utilise ces données pour récupérer vos informations de consommation via l'API Enedis</li>
                            <li>Conserve ces données uniquement pour vous fournir le service de suivi de consommation</li>
                          </ul>
                          <p className="mt-2">
                            <strong>🔒 Sécurité :</strong> Vos données sensibles (numéro de série et RPM) sont <strong>chiffrées</strong> dans notre base de données et ne sont jamais transmises en clair.
                          </p>
                          <p className="mt-2">
                            Vous pouvez retirer votre consentement et supprimer vos données à tout moment depuis votre profil.
                          </p>
                        </div>
                      </div>
                    </div>
                    {showConsentError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-3">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          ⚠️ Vous devez accepter l'utilisation de vos données pour continuer (conformité RGPD)
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleConfigureEnedis}
                    disabled={!meterSerialNumber || !linkyToken || !consentGiven || configuring}
                    className="w-full"
                  >
                    {configuring ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Configuration...
                      </>
                    ) : (
                      "Enregistrer et activer"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!enedisConfigured && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    Compteur non configuré
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Configurez votre numéro de série de compteur pour accéder à vos données de consommation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {enedisConfigured && stats && (
          <>
            {/* Statistiques principales */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Aujourd'hui</p>
                      <p className="text-2xl font-bold">
                        {data.length > 0 ? `${data[data.length - 1].consumption.toFixed(1)} kWh` : "N/A"}
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-[hsl(var(--primary))]" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Période</p>
                      <p className="text-2xl font-bold">{stats.total.toFixed(1)} kWh</p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Coût estimé</p>
                      <p className="text-2xl font-bold">{stats.totalCost.toFixed(2)} €</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Tendance</p>
                      <p className="text-2xl font-bold flex items-center gap-1">
                        {stats.trend > 0 ? (
                          <>
                            <TrendingUp className="h-5 w-5 text-red-500" />
                            +{stats.trend.toFixed(1)}%
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-5 w-5 text-green-500" />
                            {stats.trend.toFixed(1)}%
                          </>
                        )}
                      </p>
                    </div>
                    {stats.trend > 0 ? (
                      <TrendingUp className="h-8 w-8 text-red-500" />
                    ) : (
                      <TrendingDown className="h-8 w-8 text-green-500" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Graphique de consommation (simplifié) */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Consommation</CardTitle>
                <CardDescription>Évolution de votre consommation sur la période sélectionnée</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-1">
                  {data.map((item, index) => {
                    const maxValue = Math.max(...data.map((d) => d.consumption));
                    const height = (item.consumption / maxValue) * 100;
                    return (
                      <div
                        key={index}
                        className="flex-1 bg-[hsl(var(--primary))] rounded-t transition-all hover:opacity-80"
                        style={{ height: `${height}%` }}
                        title={`${item.date}: ${item.consumption} kWh`}
                      />
                    );
                  })}
                </div>
                <div className="mt-4 flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
                  <span>{data[0]?.date}</span>
                  <span>{data[data.length - 1]?.date}</span>
                </div>
              </CardContent>
            </Card>

            {/* Optimisations */}
            {optimizations.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-[hsl(var(--primary))]" />
                    Optimisations suggérées
                  </CardTitle>
                  <CardDescription>
                    Suggestions de Synexa pour réduire votre consommation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {optimizations.map((opt, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
                      >
                        <div className="flex items-start gap-3">
                          <Lightbulb className="h-5 w-5 text-[hsl(var(--primary))] mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm">{opt.message}</p>
                            {opt.savings && (
                              <Badge variant="outline" className="mt-2">
                                Économie potentielle: {opt.savings}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pics de consommation */}
            {peaks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Pics de consommation détectés
                  </CardTitle>
                  <CardDescription>
                    Jours avec une consommation anormalement élevée
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {peaks.map((peak, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          <span className="font-medium">{peak.date}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">
                            {peak.consumption.toFixed(1)} kWh
                          </span>
                          <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/20">
                            {peak.cost.toFixed(2)} €
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

