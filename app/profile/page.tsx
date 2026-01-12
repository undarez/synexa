"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/app/lib/auth/mock-client";
import { redirect } from "next/navigation";
import { Save, Loader2, User as UserIcon, MapPin, Building2, Wifi, Bluetooth, Navigation as NavigationIcon } from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { PushNotificationManager } from "@/app/components/PushNotificationManager";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Footer } from "@/app/components/Footer";
import { HealthMetricForm } from "@/app/components/HealthMetricForm";
import { HealthSyncManager } from "@/app/components/HealthSyncManager";

interface UserProfile {
  id: string;
  userCode: string | null;
  pseudo: string | null;
  firstName: string | null;
  lastName: string | null;
  homeAddress: string | null;
  workAddress: string | null;
  workLat: number | null;
  workLng: number | null;
  email: string | null;
  image: string | null;
  wifiEnabled: boolean;
  wifiSSID: string | null;
  bluetoothEnabled: boolean;
  bluetoothDeviceName: string | null;
  mobileDataEnabled: boolean;
  meterSerialNumber: string | null;
  siceaRPM?: string | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    pseudo: "",
    firstName: "",
    lastName: "",
    homeAddress: "",
    workAddress: "",
    wifiEnabled: false,
    wifiSSID: "",
    bluetoothEnabled: false,
    bluetoothDeviceName: "",
    mobileDataEnabled: false,
    meterSerialNumber: "",
    siceaRPM: "",
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/?error=auth_required&redirect=/profile");
    }
  }, [status]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/profile");
      if (!response.ok) {
        throw new Error("Erreur lors du chargement du profil");
      }
      const data = await response.json();
      setProfile(data.profile);
      setFormData({
        pseudo: data.profile.pseudo || "",
        firstName: data.profile.firstName || "",
        lastName: data.profile.lastName || "",
        homeAddress: data.profile.homeAddress || "",
        workAddress: data.profile.workAddress || "",
        wifiEnabled: data.profile.wifiEnabled || false,
        wifiSSID: data.profile.wifiSSID || "",
        bluetoothEnabled: data.profile.bluetoothEnabled || false,
        bluetoothDeviceName: data.profile.bluetoothDeviceName || "",
        mobileDataEnabled: data.profile.mobileDataEnabled || false,
        meterSerialNumber: data.profile.meterSerialNumber || "",
        siceaRPM: data.profile.siceaRPM || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status]);

  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    try {
      setSaving(true);
      setLocationError(null);
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve(pos);
          },
          (error: GeolocationPositionError) => {
            // Passer directement l'erreur de géolocalisation
            reject(error);
          },
          { 
            enableHighAccuracy: true, 
            timeout: 15000, 
            maximumAge: 60000 
          }
        );
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      setUserLocation({ lat, lng });

      // Récupérer l'adresse depuis les coordonnées (géocodage inverse)
      try {
        const reverseGeocodeResponse = await fetch(
          `/api/geocode?address=${lat},${lng}&reverse=true`
        );

        if (reverseGeocodeResponse.ok) {
          const geocodeData = await reverseGeocodeResponse.json();
          if (geocodeData.displayName) {
            setFormData({ ...formData, workAddress: geocodeData.displayName });
          }
        }
      } catch (geocodeErr) {
        // Ignorer silencieusement les erreurs de géocodage inverse, on garde quand même les coordonnées
        // L'erreur est gérée silencieusement pour ne pas polluer la console
      }

      // Sauvegarder les coordonnées
      const saveResponse = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          workLat: lat,
          workLng: lng,
        }),
      });

      if (saveResponse.ok) {
        const saved = await saveResponse.json();
        setProfile(saved.profile);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const errorData = await saveResponse.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(errorData.error || "Erreur lors de la sauvegarde");
      }
    } catch (err: unknown) {
      // Logger l'erreur complète pour le débogage
      console.error("Erreur géolocalisation:", {
        error: err,
        type: typeof err,
        isGeolocationError: err instanceof GeolocationPositionError,
        code: (err as any)?.code,
        message: (err as any)?.message,
        stringified: JSON.stringify(err),
      });
      
      // Gérer les erreurs de géolocalisation
      const geoError = err as GeolocationPositionError;
      
      if (geoError && typeof geoError.code === 'number') {
        switch (geoError.code) {
          case 1: // PERMISSION_DENIED
            setLocationError("Permission de géolocalisation refusée. Veuillez autoriser l'accès dans les paramètres de votre navigateur.");
            break;
          case 2: // POSITION_UNAVAILABLE
            setLocationError("Position indisponible. Vérifiez votre connexion GPS ou votre connexion internet.");
            break;
          case 3: // TIMEOUT
            setLocationError("Délai d'attente dépassé. Veuillez réessayer.");
            break;
          default:
            setLocationError(`Erreur de géolocalisation (code ${geoError.code}): ${geoError.message || "Erreur inconnue"}`);
        }
      } else if (err instanceof Error) {
        setLocationError(err.message || "Erreur lors de la géolocalisation.");
      } else if (err && typeof err === 'object' && 'message' in err) {
        setLocationError(String((err as any).message));
      } else {
        setLocationError("Erreur lors de la géolocalisation. Veuillez réessayer ou utiliser le géocodage manuel.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleGeocodeWorkAddress = async () => {
    if (!formData.workAddress.trim()) {
      setError("Veuillez saisir une adresse");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      // Utiliser notre route API pour le géocodage
      const response = await fetch(
        `/api/geocode?address=${encodeURIComponent(formData.workAddress.trim())}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(errorData.error || "Erreur lors du géocodage");
      }

      const data = await response.json();
      const { lat, lng } = data;
      
      // Sauvegarder automatiquement les coordonnées
      const saveResponse = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          workLat: lat,
          workLng: lng,
        }),
      });

      if (saveResponse.ok) {
        const saved = await saveResponse.json();
        setProfile(saved.profile);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const errorData = await saveResponse.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(errorData.error || "Adresse géocodée mais erreur lors de la sauvegarde");
      }
    } catch (err) {
      console.error("Erreur géocodage:", err);
      setError(err instanceof Error ? err.message : "Erreur lors du géocodage. L'adresse sera utilisée sans coordonnées.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la sauvegarde");
      }

      const data = await response.json();
      setProfile(data.profile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
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
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Mon profil
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Gérez vos informations personnelles
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <p className="text-sm text-green-600 dark:text-green-400">
                ✅ Profil mis à jour avec succès !
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>
              {profile?.userCode && (
                <span className="mt-2 block text-sm font-mono text-zinc-500">
                  Code utilisateur : #{profile.userCode}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="pseudo">
                    Pseudo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pseudo"
                    value={formData.pseudo}
                    onChange={(e) =>
                      setFormData({ ...formData, pseudo: e.target.value })
                    }
                    placeholder="Votre pseudo"
                    required
                    disabled={saving}
                  />
                  <p className="text-xs text-zinc-500">
                    Ce pseudo sera affiché sur la page principale
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="Votre prénom"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  placeholder="Votre nom"
                  disabled={saving}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="homeAddress">
                  <MapPin className="mr-2 inline h-4 w-4" />
                  Adresse principale
                </Label>
                <Input
                  id="homeAddress"
                  value={formData.homeAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, homeAddress: e.target.value })
                  }
                  placeholder="Ex: 123 Rue de la Paix, 75001 Paris"
                  disabled={saving}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="workAddress">
                  <Building2 className="mr-2 inline h-4 w-4" />
                  Adresse travail
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="workAddress"
                    value={formData.workAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, workAddress: e.target.value })
                    }
                    placeholder="Ex: 456 Avenue des Champs-Élysées, 75008 Paris"
                    disabled={saving}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGeocodeWorkAddress}
                    disabled={saving || !formData.workAddress.trim()}
                    title="Géocoder l'adresse saisie"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Géocodage...
                      </>
                    ) : (
                      "Géocoder"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGetCurrentLocation}
                    disabled={saving}
                    title="Utiliser ma position actuelle"
                  >
                    <NavigationIcon className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-zinc-500">
                  Cette adresse sera utilisée pour calculer les informations trafic et météo.
                  Cliquez sur "Géocoder" pour obtenir les coordonnées GPS ou sur l'icône de navigation pour utiliser votre position actuelle.
                </p>
                {locationError && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    ⚠️ {locationError}
                  </p>
                )}
                {userLocation && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    📍 Position actuelle : {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                  </p>
                )}
                {profile?.workLat && profile?.workLng && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✅ Coordonnées sauvegardées : {profile.workLat.toFixed(4)}, {profile.workLng.toFixed(4)}
                  </p>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Connexions réseau</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-5 w-5" />
                      <Label htmlFor="wifiEnabled">WiFi</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="wifiEnabled"
                        checked={formData.wifiEnabled}
                        onChange={(e) =>
                          setFormData({ ...formData, wifiEnabled: e.target.checked })
                        }
                        disabled={saving}
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                      <Label htmlFor="wifiEnabled" className="cursor-pointer">
                        {formData.wifiEnabled ? "Activé" : "Désactivé"}
                      </Label>
                    </div>
                    {formData.wifiEnabled && (
                      <Input
                        id="wifiSSID"
                        value={formData.wifiSSID}
                        onChange={(e) =>
                          setFormData({ ...formData, wifiSSID: e.target.value })
                        }
                        placeholder="Nom du réseau WiFi (SSID)"
                        disabled={saving}
                      />
                    )}
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Bluetooth className="h-5 w-5" />
                      <Label htmlFor="bluetoothEnabled">Bluetooth</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="bluetoothEnabled"
                        checked={formData.bluetoothEnabled}
                        onChange={(e) =>
                          setFormData({ ...formData, bluetoothEnabled: e.target.checked })
                        }
                        disabled={saving}
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                      <Label htmlFor="bluetoothEnabled" className="cursor-pointer">
                        {formData.bluetoothEnabled ? "Activé" : "Désactivé"}
                      </Label>
                    </div>
                    {formData.bluetoothEnabled && (
                      <Input
                        id="bluetoothDeviceName"
                        value={formData.bluetoothDeviceName}
                        onChange={(e) =>
                          setFormData({ ...formData, bluetoothDeviceName: e.target.value })
                        }
                        placeholder="Nom du périphérique Bluetooth"
                        disabled={saving}
                      />
                    )}
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-5 w-5" />
                      <Label htmlFor="mobileDataEnabled">Données mobiles</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="mobileDataEnabled"
                        checked={formData.mobileDataEnabled}
                        onChange={(e) =>
                          setFormData({ ...formData, mobileDataEnabled: e.target.checked })
                        }
                        disabled={saving}
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                      <Label htmlFor="mobileDataEnabled" className="cursor-pointer">
                        {formData.mobileDataEnabled ? "Activé" : "Désactivé"}
                      </Label>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Ces informations permettent à l'application de détecter votre connexion réseau et vos périphériques.
                </p>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Compteurs électriques</h3>
                
                {/* Enedis */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-2 text-[hsl(var(--muted-foreground))]">Enedis</h4>
                  <div className="grid gap-2">
                    <Label htmlFor="meterSerialNumber">
                      Numéro de série du compteur
                    </Label>
                    <Input
                      id="meterSerialNumber"
                      value={formData.meterSerialNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, meterSerialNumber: e.target.value })
                      }
                      placeholder="Ex: 12345678901234"
                      disabled={saving}
                    />
                    <p className="text-xs text-zinc-500">
                      Ce numéro permet de récupérer automatiquement vos données de consommation depuis l'API Enedis.
                      Vous le trouvez sur votre facture d'électricité ou directement sur votre compteur.
                    </p>
                  </div>
                </div>

                {/* SICEA */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2 text-[hsl(var(--muted-foreground))]">SICEA</h4>
                  <div className="grid gap-2">
                    <Label htmlFor="siceaRPM">
                      Numéro RPM (PRM) du compteur
                    </Label>
                    <Input
                      id="siceaRPM"
                      value={formData.siceaRPM || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, siceaRPM: e.target.value })
                      }
                      placeholder="Ex: 79204853174236"
                      disabled={saving}
                    />
                    <p className="text-xs text-zinc-500">
                      Le numéro RPM (PRM - Point de Référence de Mesure) permet d'identifier précisément votre compteur SICEA.
                      Vous le trouvez sur votre facture d'électricité SICEA ou dans votre espace client.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Notifications Push</Label>
                    <p className="text-sm text-zinc-500 mt-1">
                      Recevez des notifications dans votre navigateur pour vos rappels
                    </p>
                  </div>
                  <PushNotificationManager />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="submit" disabled={saving || !formData.pseudo.trim()}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-6">
          <HealthSyncManager />
          <HealthMetricForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}

