"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "@/app/lib/auth/mock-client";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
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
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { format, subDays, subMonths, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

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
  totalCostHT?: number;
  dailyCost?: number;
  dailyCostHT?: number;
  monthlyCost?: number;
  monthlyCostHT?: number;
  quarterlyCost?: number;
  quarterlyCostHT?: number;
  subscriptionCost?: number;
  subscriptionCostHT?: number;
  subscriptionDailyCost?: number;
  subscriptionDailyCostHT?: number;
  trend: number;
}

interface MeterInfo {
  peakIndex?: number;
  peakIndexDate?: string | null;
  offPeakIndex?: number;
  offPeakIndexDate?: string | null;
  maxPower?: number;
  maxPowerDate?: string | null;
  subscribedPower?: number;
  prm?: string;
  meterNumber?: string;
}

export default function EnergyPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState<ConsumptionData[]>([]);
  const [stats, setStats] = useState<ConsumptionStats | null>(null);
  const [peaks, setPeaks] = useState<ConsumptionData[]>([]);
  const [optimizations, setOptimizations] = useState<Array<{ type: string; message: string; savings?: number }>>([]);
  const [scrapingError, setScrapingError] = useState<string | null>(null);
  const [meterInfo, setMeterInfo] = useState<MeterInfo | null>(null);
  const [previousPeriodData, setPreviousPeriodData] = useState<ConsumptionData[]>([]);
  const [showComparison, setShowComparison] = useState(true);
  // État Enedis
  const [meterSerialNumber, setMeterSerialNumber] = useState("");
  const [rpm, setRpm] = useState("");
  const [linkyToken, setLinkyToken] = useState("");
  const [enedisConfigured, setEnedisConfigured] = useState(false);
  
  // État SICEA
  const [siceaLogin, setSiceaLogin] = useState("");
  const [siceaPassword, setSiceaPassword] = useState("");
  const [siceaPRM, setSiceaPRM] = useState("");
  const [siceaConfigured, setSiceaConfigured] = useState(false);
  
  // État commun
  const [configuring, setConfiguring] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<"enedis" | "sicea" | "both">("both");
  const [activeProvider, setActiveProvider] = useState<"enedis" | "sicea" | null>(null);
  const hasCheckedProviders = useRef(false);
  const isFetching = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/?error=auth_required&redirect=/energy");
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated" && !hasCheckedProviders.current) {
      hasCheckedProviders.current = true;
      checkProvidersConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchConsumption();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, period, selectedProvider]);

  const checkProvidersConfig = async () => {
    try {
      let hasEnedis = false;
      let hasSicea = false;

      // Vérifier Enedis
      const enedisResponse = await fetch("/api/energy/enedis");
      if (enedisResponse.ok) {
        const enedisResult = await enedisResponse.json();
        if (enedisResult.credentials) {
          hasEnedis = true;
          setEnedisConfigured(true);
          setMeterSerialNumber(enedisResult.credentials.meterSerialNumber || "");
          setRpm(enedisResult.credentials.rpm || "");
          setLinkyToken(enedisResult.credentials.hasLinkyToken ? "***" : "");
          if (!activeProvider) setActiveProvider("enedis");
        } else {
          setEnedisConfigured(false);
        }
      } else {
        setEnedisConfigured(false);
      }

      // Vérifier SICEA
      const siceaResponse = await fetch("/api/energy/sicea");
      if (siceaResponse.ok) {
        const siceaResult = await siceaResponse.json();
        if (siceaResult.credentials && siceaResult.credentials.isActive) {
          hasSicea = true;
          setSiceaConfigured(true);
          if (!activeProvider) setActiveProvider("sicea");
          
          // Afficher l'erreur de scraping si elle existe
          if (siceaResult.credentials.lastError) {
            setScrapingError(siceaResult.credentials.lastError);
          } else {
            setScrapingError(null);
          }
        } else {
          setSiceaConfigured(false);
          setScrapingError(null);
        }
      } else {
        setSiceaConfigured(false);
        setScrapingError(null);
      }

      // Déterminer le fournisseur actif en utilisant les valeurs réelles, pas les états
      let newProvider: "enedis" | "sicea" | "both";
      if (hasEnedis && hasSicea) {
        newProvider = "both";
      } else if (hasEnedis) {
        newProvider = "enedis";
      } else if (hasSicea) {
        newProvider = "sicea";
      } else {
        newProvider = "both"; // Par défaut si aucun n'est configuré
      }
      
      // Ne modifier que si la valeur a changé pour éviter les boucles
      if (selectedProvider !== newProvider) {
        setSelectedProvider(newProvider);
      }
    } catch (error) {
      console.error("Erreur vérification fournisseurs:", error);
    }
  };

  const fetchConsumption = async () => {
    // Éviter les appels multiples simultanés
    if (isFetching.current) {
      return;
    }
    
    try {
      isFetching.current = true;
      setLoading(true);
      // Utiliser le fournisseur sélectionné ou les deux
      const sourceParam = selectedProvider === "both" ? "" : `&source=${selectedProvider}`;
      const response = await fetch(`/api/energy/consumption?period=${period}${sourceParam}`);
      if (response.ok) {
        const result = await response.json();
        setData(result.data || []);
        setStats(result.stats || null);
        setPeaks(result.peaks || []);
        setOptimizations(result.optimizations || []);
        setMeterInfo(result.meterInfo || null);
        
        // Réinitialiser l'erreur si les données sont récupérées avec succès
        if (result.data && result.data.length > 0) {
          setScrapingError(null);
        }
        
        // Charger les données de la période précédente pour comparaison
        if (showComparison && result.data && result.data.length > 0) {
          await loadPreviousPeriodData();
        }
      } else if (response.status === 400) {
        // Aucun fournisseur configuré
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error?.includes("Enedis")) {
          setEnedisConfigured(false);
        }
        if (errorData.error?.includes("SICEA")) {
          setSiceaConfigured(false);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  const loadPreviousPeriodData = async () => {
    try {
      // Calculer la période précédente
      let daysOffset = 7;
      
      switch (period) {
        case "7d":
          daysOffset = 7;
          break;
        case "30d":
          daysOffset = 30;
          break;
        case "1m":
          daysOffset = 30;
          break;
        case "1y":
          daysOffset = 365;
          break;
      }
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - daysOffset);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - daysOffset);
      
      const sourceParam = selectedProvider === "both" ? "" : `&source=${selectedProvider}`;
      const response = await fetch(
        `/api/energy/consumption?period=${period}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}${sourceParam}`
      );
      
      if (response.ok) {
        const result = await response.json();
        setPreviousPeriodData(result.data || []);
      }
    } catch (error) {
      console.error("Erreur chargement période précédente:", error);
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
        setActiveProvider("enedis");
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

  const handleConfigureSicea = async () => {
    if (!consentGiven) {
      setShowConsentError(true);
      return;
    }

    if (!siceaLogin || !siceaPassword) {
      return;
    }

    try {
      setConfiguring(true);
      setShowConsentError(false);
      const response = await fetch("/api/energy/sicea/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          login: siceaLogin,
          password: siceaPassword,
          prm: siceaPRM || undefined,
          consentGiven: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSiceaConfigured(true);
        setActiveProvider("sicea");
        
        // Afficher un message informatif si le test a été skip ou est en attente
        if (result.testStatus === "skipped" || result.testStatus === "pending") {
          // Optionnel: afficher une notification à l'utilisateur
          console.log("SICEA configuré:", result.message);
        }
        
        await fetchConsumption();
      } else {
        const errorData = await response.json();
        if (errorData.requiresConsent) {
          setShowConsentError(true);
        } else {
          // Afficher l'erreur à l'utilisateur
          console.error("Erreur configuration SICEA:", errorData.error || errorData.details);
          alert(`Erreur: ${errorData.error || errorData.details || "Erreur inconnue"}`);
        }
      }
    } catch (error) {
      console.error("Erreur configuration SICEA:", error);
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
                  <DialogTitle>Configuration fournisseur d'énergie</DialogTitle>
                  <DialogDescription>
                    Configurez Enedis ou SICEA pour récupérer vos données de consommation
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="enedis" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="enedis">Enedis</TabsTrigger>
                    <TabsTrigger value="sicea">SICEA</TabsTrigger>
                  </TabsList>
                  
                  {/* Configuration Enedis */}
                  <TabsContent value="enedis" className="space-y-4 mt-4">
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
                        "Enregistrer et activer Enedis"
                      )}
                    </Button>
                  </TabsContent>

                  {/* Configuration SICEA */}
                  <TabsContent value="sicea" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="siceaLogin">
                        Identifiant SICEA <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="siceaLogin"
                        value={siceaLogin}
                        onChange={(e) => setSiceaLogin(e.target.value)}
                        placeholder="Votre identifiant SICEA"
                      />
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        Identifiant utilisé pour vous connecter au portail SICEA
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="siceaPassword">
                        Mot de passe SICEA <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="siceaPassword"
                        type="password"
                        value={siceaPassword}
                        onChange={(e) => setSiceaPassword(e.target.value)}
                        placeholder="Votre mot de passe SICEA"
                      />
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        Mot de passe de votre compte SICEA
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="siceaPRM">
                        PRM (Point de Référence de Mesure) <span className="text-xs text-[hsl(var(--muted-foreground))]">(optionnel mais recommandé)</span>
                      </Label>
                      <Input
                        id="siceaPRM"
                        value={siceaPRM}
                        onChange={(e) => setSiceaPRM(e.target.value)}
                        placeholder="Ex: 14xxxxxxxxxxxx"
                      />
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        Le PRM permet une identification plus précise de votre compteur. 
                        Vous le trouvez sur votre facture SICEA (14 chiffres).
                      </p>
                    </div>

                    {/* Consentement RGPD pour SICEA */}
                    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="consentSicea"
                          checked={consentGiven}
                          onChange={(e) => {
                            setConsentGiven(e.target.checked);
                            setShowConsentError(false);
                          }}
                          className="mt-1 h-4 w-4 rounded border-[hsl(var(--border))]"
                        />
                        <div className="flex-1">
                          <Label htmlFor="consentSicea" className="cursor-pointer font-medium">
                            J'accepte l'utilisation de mes données SICEA
                          </Label>
                          <div className="mt-2 space-y-2 text-xs text-[hsl(var(--muted-foreground))]">
                            <p>
                              <strong>Conformité RGPD :</strong> En cochant cette case, vous acceptez que Synexa :
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              <li>Stocke et chiffre vos identifiants SICEA de manière sécurisée</li>
                              <li>Utilise ces identifiants pour récupérer vos données de consommation via scraping</li>
                              <li>Conserve ces données uniquement pour vous fournir le service de suivi de consommation</li>
                            </ul>
                            <p className="mt-2">
                              <strong>🔒 Sécurité :</strong> Vos identifiants sont <strong>chiffrés</strong> dans notre base de données et ne sont jamais transmis en clair.
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
                      onClick={handleConfigureSicea}
                      disabled={!siceaLogin || !siceaPassword || !consentGiven || configuring}
                      className="w-full"
                    >
                      {configuring ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Configuration...
                        </>
                      ) : (
                        "Enregistrer et activer SICEA"
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!enedisConfigured && !siceaConfigured && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    Aucun fournisseur configuré
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Configurez Enedis ou SICEA pour accéder à vos données de consommation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {(enedisConfigured || siceaConfigured) && stats && (
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
                      {data.length > 0 && data[data.length - 1].cost && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                          {data[data.length - 1].cost.toFixed(2)} €
                        </p>
                      )}
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
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        {stats.totalCost.toFixed(2)} €
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500" />
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
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Moyenne/jour</p>
                      <p className="text-2xl font-bold">{stats.average.toFixed(1)} kWh</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        {(stats.totalCost / (data.length || 1)).toFixed(2)} €/jour
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coûts estimés détaillés */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    Coût journalier estimé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold">
                      {stats.dailyCost ? stats.dailyCost.toFixed(2) : (data.length > 0 ? (stats.totalCost / (data.length || 1)).toFixed(2) : "0.00")}
                    </p>
                    <p className="text-lg text-[hsl(var(--muted-foreground))]">€</p>
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
                    Basé sur {data.length} jour{data.length > 1 ? "s" : ""} de données
                    {stats.subscriptionDailyCost && (
                      <span className="block mt-1 text-xs">
                        + Abonnement: {stats.subscriptionDailyCost.toFixed(2)} €/jour TTC
                        {stats.subscriptionDailyCostHT && (
                          <span className="block">({stats.subscriptionDailyCostHT.toFixed(2)} € HT)</span>
                        )}
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                    Coût mensuel estimé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold">
                      {stats.monthlyCost ? (stats.monthlyCost + (stats.subscriptionCost || 0)).toFixed(2) : (data.length > 0 ? ((stats.totalCost / (data.length || 1)) * 30).toFixed(2) : "0.00")}
                    </p>
                    <p className="text-lg text-[hsl(var(--muted-foreground))]">€</p>
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
                    {stats.monthlyCost && stats.subscriptionCost ? (
                      <>
                        <span className="block">Consommation: {stats.monthlyCost.toFixed(2)} € TTC</span>
                        {stats.monthlyCostHT && (
                          <span className="block text-xs">({stats.monthlyCostHT.toFixed(2)} € HT)</span>
                        )}
                        <span className="block mt-1">+ Abonnement: {stats.subscriptionCost.toFixed(2)} € TTC</span>
                        {stats.subscriptionCostHT && (
                          <span className="block text-xs">({stats.subscriptionCostHT.toFixed(2)} € HT)</span>
                        )}
                        <span className="block mt-1 font-semibold">
                          Total: {(stats.monthlyCost + stats.subscriptionCost).toFixed(2)} € TTC
                          {stats.monthlyCostHT && stats.subscriptionCostHT && (
                            <span className="block text-xs font-normal">
                              ({(stats.monthlyCostHT + stats.subscriptionCostHT).toFixed(2)} € HT)
                            </span>
                          )}
                        </span>
                      </>
                    ) : (
                      "Projection sur 30 jours"
                    )}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-orange-500" />
                    Coût trimestriel estimé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold">
                      {stats.quarterlyCost ? (stats.quarterlyCost + ((stats.subscriptionCost || 0) * 3)).toFixed(2) : (data.length > 0 ? ((stats.totalCost / (data.length || 1)) * 90).toFixed(2) : "0.00")}
                    </p>
                    <p className="text-lg text-[hsl(var(--muted-foreground))]">€</p>
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
                    {stats.quarterlyCost && stats.subscriptionCost ? (
                      <>
                        <span className="block">Consommation: {stats.quarterlyCost.toFixed(2)} € TTC</span>
                        {stats.quarterlyCostHT && (
                          <span className="block text-xs">({stats.quarterlyCostHT.toFixed(2)} € HT)</span>
                        )}
                        <span className="block mt-1">+ Abonnement: {(stats.subscriptionCost * 3).toFixed(2)} € TTC</span>
                        {stats.subscriptionCostHT && (
                          <span className="block text-xs">({(stats.subscriptionCostHT * 3).toFixed(2)} € HT)</span>
                        )}
                        <span className="block mt-1 font-semibold">
                          Total: {(stats.quarterlyCost + (stats.subscriptionCost * 3)).toFixed(2)} € TTC
                          {stats.quarterlyCostHT && stats.subscriptionCostHT && (
                            <span className="block text-xs font-normal">
                              ({(stats.quarterlyCostHT + (stats.subscriptionCostHT * 3)).toFixed(2)} € HT)
                            </span>
                          )}
                        </span>
                      </>
                    ) : (
                      "Projection sur 3 mois"
                    )}
                  </p>
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
                {data.length === 0 ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <AlertTriangle className="h-12 w-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
                      <p className="text-[hsl(var(--muted-foreground))]">
                        Aucune donnée disponible pour cette période
                      </p>
                      {scrapingError && (
                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <p className="text-sm text-yellow-500 font-medium mb-1">
                            Erreur de scraping SICEA
                          </p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {scrapingError}
                          </p>
                        </div>
                      )}
                      {!scrapingError && siceaConfigured && data.length === 0 && (
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
                          Les données seront disponibles après le premier scraping réussi.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Contrôle de comparaison */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="showComparison"
                          checked={showComparison}
                          onChange={(e) => {
                            setShowComparison(e.target.checked);
                            if (e.target.checked) {
                              loadPreviousPeriodData();
                            }
                          }}
                          className="rounded"
                        />
                        <label htmlFor="showComparison" className="text-sm text-[hsl(var(--muted-foreground))] cursor-pointer">
                          Comparer avec la période précédente
                        </label>
                      </div>
                    </div>
                    
                    {/* Graphique style bourse avec Recharts */}
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={data.map((item, index) => {
                            const prevItem = previousPeriodData.find(p => p.date === item.date);
                            let formattedDate = item.date;
                            try {
                              formattedDate = format(parseISO(item.date), "dd/MM", { locale: fr });
                            } catch (e) {
                              // Si le parsing échoue, utiliser la date telle quelle
                              formattedDate = item.date.split("T")[0].split("-").reverse().slice(0, 2).join("/");
                            }
                            return {
                              date: formattedDate,
                              consumption: item.consumption,
                              previous: prevItem?.consumption || null,
                              cost: item.cost,
                            };
                          })}
                          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                        >
                          <defs>
                            <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                            </linearGradient>
                            {showComparison && (
                              <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.05} />
                              </linearGradient>
                            )}
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                            opacity={0.3}
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            tickFormatter={(value) => `${value} kWh`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={(value: any, name?: string) => {
                              if (name === "consumption") return [`${value.toFixed(2)} kWh`, "Consommation actuelle"];
                              if (name === "previous") return [`${value.toFixed(2)} kWh`, "Période précédente"];
                              return [value, name || ""];
                            }}
                          />
                          {showComparison && previousPeriodData.length > 0 && (
                            <Area
                              type="monotone"
                              dataKey="previous"
                              stroke="hsl(var(--muted-foreground))"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              fill="url(#colorPrevious)"
                              name="previous"
                            />
                          )}
                          <Area
                            type="monotone"
                            dataKey="consumption"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fill="url(#colorConsumption)"
                            name="consumption"
                          />
                          {showComparison && previousPeriodData.length > 0 && (
                            <Legend
                              formatter={(value) => {
                                if (value === "consumption") return "Consommation actuelle";
                                if (value === "previous") return "Période précédente";
                                return value;
                              }}
                            />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Informations du compteur */}
            {meterInfo && (
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                {meterInfo.peakIndex && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">Index HEURE PLEINE</p>
                          <p className="text-2xl font-bold">{meterInfo.peakIndex.toLocaleString()}</p>
                          {meterInfo.peakIndexDate && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                              {meterInfo.peakIndexDate}
                            </p>
                          )}
                        </div>
                        <Zap className="h-8 w-8 text-[hsl(var(--primary))]" />
                      </div>
                    </CardContent>
                  </Card>
                )}
                {meterInfo.offPeakIndex && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">Index HEURE CREUSE</p>
                          <p className="text-2xl font-bold">{meterInfo.offPeakIndex.toLocaleString()}</p>
                          {meterInfo.offPeakIndexDate && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                              {meterInfo.offPeakIndexDate}
                            </p>
                          )}
                        </div>
                        <Activity className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                )}
                {meterInfo.maxPower && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">Puissance maximum</p>
                          <p className="text-2xl font-bold">{meterInfo.maxPower.toFixed(2)} kVA</p>
                          {meterInfo.maxPowerDate && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                              {meterInfo.maxPowerDate}
                            </p>
                          )}
                          {meterInfo.subscribedPower && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                              Souscrite: {meterInfo.subscribedPower} kVA
                            </p>
                          )}
                        </div>
                        <TrendingUp className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Recommandations Synexa */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-[hsl(var(--primary))]" />
                  Recommandations Synexa
                </CardTitle>
                <CardDescription>
                  Conseils personnalisés pour optimiser votre consommation et réduire votre impact écologique
                </CardDescription>
              </CardHeader>
              <CardContent>
                {optimizations.length > 0 ? (
                  <div className="space-y-4">
                    {optimizations.map((opt, index) => (
                      <div
                        key={index}
                        className="p-4 bg-[hsl(var(--muted))] rounded-lg border border-[hsl(var(--border))]"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-[hsl(var(--foreground))]">{opt.message}</p>
                            {opt.savings && (
                              <p className="text-sm text-green-500 mt-1">
                                Économie estimée: {opt.savings.toFixed(2)} €/mois
                              </p>
                            )}
                          </div>
                          <Badge variant={opt.type === "urgent" ? "destructive" : "default"}>
                            {opt.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Lightbulb className="h-12 w-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
                    <p className="text-[hsl(var(--muted-foreground))]">
                      Analysez votre consommation pour recevoir des recommandations personnalisées
                    </p>
                  </div>
                )}
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

