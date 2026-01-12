/**
 * Permission Service - Gestion centralisée des permissions IoT
 * 
 * Responsabilités :
 * - Vérifier si un utilisateur peut contrôler un device
 * - Gérer les permissions par device (read, control, automate, admin)
 * - Être appelé avant toute action IoT
 * 
 * ⚠️ IMPORTANT : Ce service est appelé AVANT toute action sur un device.
 * Si la permission est refusée, l'action ne doit pas être exécutée.
 */

import { createServerComponentClient } from "@/app/lib/supabase/server-client";

/**
 * Niveaux de permission pour un device
 */
export type DevicePermission = "read" | "control" | "automate" | "admin";

/**
 * Vérifie si un utilisateur peut lire l'état d'un device
 */
export async function canUserReadDevice(
  userId: string,
  deviceId: string
): Promise<boolean> {
  return canUserPerformAction(userId, deviceId, "read");
}

/**
 * Vérifie si un utilisateur peut contrôler un device (turn on/off, set value)
 */
export async function canUserControlDevice(
  userId: string,
  deviceId: string
): Promise<boolean> {
  return canUserPerformAction(userId, deviceId, "control");
}

/**
 * Vérifie si un utilisateur peut créer des automatisations pour un device
 */
export async function canUserAutomateDevice(
  userId: string,
  deviceId: string
): Promise<boolean> {
  return canUserPerformAction(userId, deviceId, "automate");
}

/**
 * Vérifie si un utilisateur peut administrer un device (delete, configure)
 */
export async function canUserAdminDevice(
  userId: string,
  deviceId: string
): Promise<boolean> {
  return canUserPerformAction(userId, deviceId, "admin");
}

/**
 * Vérifie si un utilisateur peut effectuer une action sur un device
 * 
 * Hiérarchie des permissions :
 * - read < control < automate < admin
 * 
 * Si l'utilisateur a "admin", il a automatiquement toutes les permissions inférieures.
 */
async function canUserPerformAction(
  userId: string,
  deviceId: string,
  requiredPermission: DevicePermission
): Promise<boolean> {
  try {
    const supabase = await createServerComponentClient();

    // 1. Vérifier que le device appartient à l'utilisateur
    const { data: device, error: deviceError } = await supabase
      .from("Device")
      .select("userId, metadata")
      .eq("id", deviceId)
      .single();

    if (deviceError || !device) {
      console.warn(`[Permission Service] Device ${deviceId} non trouvé`);
      return false;
    }

    // 2. Si le device appartient à l'utilisateur, il a toutes les permissions par défaut
    if (device.userId === userId) {
      return true;
    }

    // 3. Vérifier les permissions partagées (si le device est partagé)
    // Pour l'instant, seul le propriétaire peut contrôler
    // TODO: Implémenter le partage de devices avec permissions granulaires
    const sharedPermissions = device.metadata?.sharedPermissions as
      | Record<string, DevicePermission[]>
      | undefined;

    if (sharedPermissions && sharedPermissions[userId]) {
      const userPermissions = sharedPermissions[userId];
      const permissionHierarchy: DevicePermission[] = ["read", "control", "automate", "admin"];

      const requiredIndex = permissionHierarchy.indexOf(requiredPermission);
      const hasPermission = userPermissions.some((perm) => {
        const permIndex = permissionHierarchy.indexOf(perm);
        return permIndex >= requiredIndex;
      });

      return hasPermission;
    }

    // 4. Par défaut, refuser l'accès
    return false;
  } catch (error) {
    console.error("[Permission Service] Erreur vérification permission:", error);
    // En cas d'erreur, refuser l'accès par sécurité
    return false;
  }
}

/**
 * Obtient toutes les permissions d'un utilisateur pour un device
 */
export async function getUserDevicePermissions(
  userId: string,
  deviceId: string
): Promise<DevicePermission[]> {
  try {
    const supabase = await createServerComponentClient();

    const { data: device } = await supabase
      .from("Device")
      .select("userId, metadata")
      .eq("id", deviceId)
      .single();

    if (!device) {
      return [];
    }

    // Propriétaire a toutes les permissions
    if (device.userId === userId) {
      return ["read", "control", "automate", "admin"];
    }

    // Permissions partagées
    const sharedPermissions = device.metadata?.sharedPermissions as
      | Record<string, DevicePermission[]>
      | undefined;

    return sharedPermissions?.[userId] || [];
  } catch (error) {
    console.error("[Permission Service] Erreur récupération permissions:", error);
    return [];
  }
}

/**
 * Vérifie si un utilisateur est le propriétaire d'un device
 */
export async function isDeviceOwner(userId: string, deviceId: string): Promise<boolean> {
  try {
    const supabase = await createServerComponentClient();

    const { data: device } = await supabase
      .from("Device")
      .select("userId")
      .eq("id", deviceId)
      .single();

    return device?.userId === userId;
  } catch (error) {
    console.error("[Permission Service] Erreur vérification propriétaire:", error);
    return false;
  }
}
