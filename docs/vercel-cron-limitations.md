# ⚠️ Limitations Vercel Cron Jobs (Plan Hobby)

## 🚫 Limitation du plan Hobby

Le plan **Hobby (gratuit)** de Vercel limite les cron jobs à **une seule exécution par jour maximum**.

### ❌ Expressions non autorisées sur Hobby

- `*/5 * * * *` (toutes les 5 minutes) ❌
- `0 * * * *` (toutes les heures) ❌
- `0 */6 * * *` (toutes les 6 heures) ❌
- `*/30 * * * *` (toutes les 30 minutes) ❌

### ✅ Expressions autorisées sur Hobby

- `0 2 * * *` (une fois par jour à 2h) ✅
- `0 0 * * *` (une fois par jour à minuit) ✅
- `0 12 * * *` (une fois par jour à midi) ✅

## 🔧 Solution : Cron jobs combinés

Pour contourner cette limitation, vous avez plusieurs options :

### Option 1 : Un seul endpoint qui gère tout (Recommandé)

Créez un endpoint unique qui exécute toutes les tâches :

**Créer `/api/cron/daily/route.ts` :**

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { decryptSiceaData } from "@/app/lib/encryption/sicea-encryption";
import { scrapeSiceaConsumption } from "@/app/lib/services/sicea-scraper";
import { syncAllHealthSources } from "@/app/lib/health/sync";
import { sendReminderNotification } from "@/app/lib/reminders/notifications";
import { ReminderStatus } from "@prisma/client";
import { logger } from "@/app/lib/logger";
import { subDays } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const results: Record<string, any> = {};

    // 1. Scraping SICEA
    try {
      const activeCredentials = await prisma.siceaCredentials.findMany({
        where: { isActive: true, consentGiven: true },
      });

      for (const credentials of activeCredentials) {
        const decrypted = decryptSiceaData({
          username: credentials.username,
          password: credentials.password,
        });

        if (decrypted.username && decrypted.password) {
          const endDate = new Date();
          const startDate = subDays(endDate, 7);
          
          const scrapeResult = await scrapeSiceaConsumption(
            decrypted.username,
            decrypted.password,
            startDate,
            endDate
          );

          results.sicea = { success: scrapeResult.success };
        }
      }
    } catch (error) {
      results.sicea = { error: error instanceof Error ? error.message : "Erreur" };
    }

    // 2. Sync santé
    try {
      const users = await prisma.user.findMany({
        where: {
          preferences: {
            some: {
              key: {
                in: ["health_sync_apple_health", "health_sync_fitbit", "health_sync_google_fit"],
              },
              value: { path: ["enabled"], equals: true },
            },
          },
        },
      });

      for (const user of users) {
        await syncAllHealthSources(user.id);
      }
      results.health = { success: true, usersProcessed: users.length };
    } catch (error) {
      results.health = { error: error instanceof Error ? error.message : "Erreur" };
    }

    // 3. Traitement des rappels
    try {
      const now = new Date();
      const pendingReminders = await prisma.reminder.findMany({
        where: {
          status: ReminderStatus.PENDING,
          scheduledFor: { lte: now },
        },
        include: { user: true, calendarEvent: true },
      });

      for (const reminder of pendingReminders) {
        await sendReminderNotification(reminder);
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: ReminderStatus.SENT, sentAt: new Date() },
        });
      }
      results.reminders = { success: true, processed: pendingReminders.length };
    } catch (error) {
      results.reminders = { error: error instanceof Error ? error.message : "Erreur" };
    }

    // 4. Sync calendrier
    try {
      const usersWithGoogle = await prisma.user.findMany({
        where: {
          accounts: {
            some: {
              provider: "google",
              access_token: { not: null },
            },
          },
        },
      });

      // Logique de sync calendrier...
      results.calendar = { success: true, usersProcessed: usersWithGoogle.length };
    } catch (error) {
      results.calendar = { error: error instanceof Error ? error.message : "Erreur" };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    logger.error("Erreur cron quotidien", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
```

**Mettre à jour `vercel.json` :**

```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Option 2 : Utiliser cron-job.org pour les autres (Gratuit)

Gardez seulement le scraping SICEA sur Vercel, et utilisez cron-job.org pour les autres :

**`vercel.json` (garder seulement SICEA) :**
```json
{
  "crons": [
    {
      "path": "/api/energy/sicea/auto-scrape",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Configurer cron-job.org pour :**
- `/api/health/sync/auto` → Toutes les 6h
- `/api/reminders/process` → Toutes les 5 min
- `/api/calendar/auto-sync` → Toutes les heures

### Option 3 : Passer au plan Pro Vercel

Le plan Pro permet des cron jobs illimités avec n'importe quelle fréquence.

## 📋 Configuration actuelle

Le fichier `vercel.json` a été modifié pour ne garder que le scraping SICEA (une fois par jour à 2h).

Pour les autres tâches, utilisez cron-job.org (gratuit) ou créez l'endpoint combiné `/api/cron/daily`.

## 🔐 Sécurité

N'oubliez pas d'ajouter `CRON_SECRET` dans les variables d'environnement Vercel pour sécuriser les endpoints.

