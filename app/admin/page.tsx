"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "@/app/lib/auth/mock-client";
import { redirect } from "next/navigation";
import { 
  Users, 
  Shield, 
  Database, 
  Activity, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Badge } from "@/app/components/ui/badge";
import { Footer } from "@/app/components/Footer";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface User {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  _count: {
    calendarEvents: number;
    tasks: number;
    reminders: number;
    energyConsumptions: number;
  };
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalEnergyData: number;
  totalCalendarEvents: number;
  totalTasks: number;
  securityLogs: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState("users");
  const hasLoadedRef = useRef(false);
  const userEmailRef = useRef<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/?error=auth_required&redirect=/admin");
    }
  }, [status]);

  useEffect(() => {
    // Ne traiter que si authentifié
    if (status !== "authenticated") {
      return;
    }

    // Lire l'email une seule fois pour éviter les re-renders
    const currentEmail = session?.user?.email;
    
    if (!currentEmail) {
      return;
    }

    // Vérifier si l'utilisateur est admin
    if (currentEmail.toLowerCase() !== "fortuna77320@gmail.com") {
      setError("Accès refusé : droits administrateur requis");
      setLoading(false);
      hasLoadedRef.current = false;
      userEmailRef.current = null;
      return;
    }

    // Éviter les rechargements inutiles : vérifier si déjà chargé pour cet email
    if (hasLoadedRef.current && userEmailRef.current === currentEmail) {
      // Déjà chargé, ne rien faire
      return;
    }

    // Charger les données uniquement si pas encore chargées ou email différent
    const loadAdminData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [usersRes, statsRes, logsRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/stats"),
          fetch("/api/admin/security-logs"),
        ]);

        if (!usersRes.ok || !statsRes.ok || !logsRes.ok) {
          throw new Error("Erreur lors du chargement des données");
        }

        const [usersData, statsData, logsData] = await Promise.all([
          usersRes.json(),
          statsRes.json(),
          logsRes.json(),
        ]);

        setUsers(usersData.users || []);
        setStats(statsData.stats || null);
        setSecurityLogs(logsData.logs || []);
        
        // Marquer comme chargé pour cet email
        hasLoadedRef.current = true;
        userEmailRef.current = currentEmail;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue");
        hasLoadedRef.current = false;
        userEmailRef.current = null;
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, [status]); // ✅ Utiliser uniquement status comme dépendance


  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      // Recharger les données après suppression
      hasLoadedRef.current = false;
      const [usersRes, statsRes, logsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/stats"),
        fetch("/api/admin/security-logs"),
      ]);

      if (usersRes.ok && statsRes.ok && logsRes.ok) {
        const [usersData, statsData, logsData] = await Promise.all([
          usersRes.json(),
          statsRes.json(),
          logsRes.json(),
        ]);

        setUsers(usersData.users || []);
        setStats(statsData.stats || null);
        setSecurityLogs(logsData.logs || []);
        hasLoadedRef.current = true;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error && error.includes("Accès refusé")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-12 w-12 text-red-500" />
              <p className="text-center">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Administration Synexa</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Gestion des utilisateurs, données et sécurité
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistiques globales */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Utilisateurs</p>
                    <p className="text-2xl font-bold">{stats.totalUsers}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      {stats.activeUsers} actifs
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Données énergie</p>
                    <p className="text-2xl font-bold">{stats.totalEnergyData.toLocaleString()}</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Événements</p>
                    <p className="text-2xl font-bold">{stats.totalCalendarEvents.toLocaleString()}</p>
                  </div>
                  <Database className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Logs sécurité</p>
                    <p className="text-2xl font-bold">{stats.securityLogs.toLocaleString()}</p>
                  </div>
                  <Shield className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="data">Données Synexa</TabsTrigger>
            <TabsTrigger value="security">Sécurité</TabsTrigger>
          </TabsList>

          {/* Onglet Utilisateurs */}
          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des utilisateurs</CardTitle>
                <CardDescription>
                  Liste de tous les utilisateurs de l'application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Nom</th>
                        <th className="text-left p-2">Inscription</th>
                        <th className="text-left p-2">Données</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b">
                          <td className="p-2">{user.email || "N/A"}</td>
                          <td className="p-2">{user.name || "N/A"}</td>
                          <td className="p-2 text-sm text-[hsl(var(--muted-foreground))]">
                            {format(new Date(user.createdAt), "dd MMM yyyy", { locale: fr })}
                          </td>
                          <td className="p-2">
                            <div className="flex flex-col gap-1 text-xs">
                              <span>📅 {user._count.calendarEvents}</span>
                              <span>✅ {user._count.tasks}</span>
                              <span>⚡ {user._count.energyConsumptions}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Données */}
          <TabsContent value="data" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Données Synexa</CardTitle>
                <CardDescription>
                  Statistiques et gestion des données de l'application
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Tâches totales</p>
                        <p className="text-2xl font-bold">{stats.totalTasks.toLocaleString()}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Données énergie</p>
                        <p className="text-2xl font-bold">{stats.totalEnergyData.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Sécurité */}
          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Logs de sécurité</CardTitle>
                <CardDescription>
                  Événements de sécurité et accès système
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {securityLogs.map((log, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{log.eventType}</span>
                        <Badge
                          variant={
                            log.severity === "critical"
                              ? "destructive"
                              : log.severity === "error"
                              ? "destructive"
                              : log.severity === "warning"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {log.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {log.timestamp && format(new Date(log.timestamp), "dd MMM yyyy HH:mm", { locale: fr })}
                      </p>
                      {log.details && (
                        <p className="text-xs mt-1 text-[hsl(var(--muted-foreground))]">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

