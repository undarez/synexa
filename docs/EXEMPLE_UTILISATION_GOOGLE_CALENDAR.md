# 📅 Exemple d'utilisation Google Calendar avec Supabase

## 🎯 Utilisation des tokens Google Calendar

### 1. Récupérer les événements du calendrier

```typescript
import { getGoogleCalendarEvents } from "@/app/lib/google-calendar/supabase";

// Dans un composant client
"use client";

export function CalendarEvents() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    async function loadEvents() {
      const calendarEvents = await getGoogleCalendarEvents('primary', 10);
      if (calendarEvents) {
        setEvents(calendarEvents);
      }
    }

    loadEvents();
  }, []);

  return (
    <div>
      {events.map((event) => (
        <div key={event.id}>
          <h3>{event.summary}</h3>
          <p>{event.start.dateTime || event.start.date}</p>
        </div>
      ))}
    </div>
  );
}
```

### 2. Créer un événement dans Google Calendar

```typescript
import { createGoogleCalendarEvent } from "@/app/lib/google-calendar/supabase";

async function handleCreateEvent() {
  const event = await createGoogleCalendarEvent({
    summary: "Réunion importante",
    description: "Réunion avec l'équipe",
    start: {
      dateTime: "2024-01-15T10:00:00",
      timeZone: "Europe/Paris",
    },
    end: {
      dateTime: "2024-01-15T11:00:00",
      timeZone: "Europe/Paris",
    },
    location: "Bureau principal",
  });

  if (event) {
    console.log("Événement créé !", event.id);
  }
}
```

### 3. Vérifier l'accès Google Calendar

```typescript
import { hasGoogleCalendarAccess } from "@/app/lib/google-calendar/supabase";

async function checkAccess() {
  const hasAccess = await hasGoogleCalendarAccess();
  
  if (hasAccess) {
    console.log("✅ Accès Google Calendar disponible");
  } else {
    console.log("❌ Accès Google Calendar non disponible");
    console.log("Vérifiez que vous vous êtes connecté avec Google Calendar");
  }
}
```

## 🔄 Rafraîchir le token Google (si expiré)

### Route API pour rafraîchir le token

**Fichier : `app/api/google-calendar/refresh-token/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getBrowserClient } from "@/app/lib/supabase/client-browser";

export async function POST(request: NextRequest) {
  try {
    const supabase = getBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.provider_refresh_token) {
      return NextResponse.json(
        { error: "Refresh token non disponible" },
        { status: 400 }
      );
    }

    // Vérifier que les variables d'environnement sont présentes
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Variables d'environnement Google manquantes" },
        { status: 500 }
      );
    }

    // Rafraîchir le token Google
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: session.provider_refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
      return NextResponse.json(
        { error: "Erreur lors du rafraîchissement du token", details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inattendue" },
      { status: 500 }
    );
  }
}
```

### Utilisation de la route API

```typescript
async function refreshGoogleToken() {
  const response = await fetch('/api/google-calendar/refresh-token', {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Erreur lors du rafraîchissement du token');
  }

  const { access_token, expires_at } = await response.json();
  
  // Utiliser le nouveau access_token pour les appels API
  return access_token;
}
```

## 📋 Variables d'environnement requises

**Fichier : `.env.local`**

```env
# Supabase (déjà configuré)
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Google OAuth (pour rafraîchir les tokens côté serveur)
GOOGLE_CLIENT_ID=...googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# ⚠️ IMPORTANT : Ne PAS utiliser NEXT_PUBLIC_ pour GOOGLE_CLIENT_SECRET
# Le secret doit rester côté serveur uniquement
```

## ✅ Checklist de vérification

- [x] Google Calendar API activée dans Google Cloud Console
- [x] Scopes Calendar ajoutés dans `signInWithOAuth()`
- [x] `access_type=offline` et `prompt=consent` dans queryParams
- [x] `provider_token` présent dans la session après connexion
- [x] `provider_refresh_token` présent dans la session après connexion
- [x] Route API pour rafraîchir le token (si nécessaire)
- [x] Variables d'environnement Google configurées (si nécessaire)
- [x] Code d'appel Google Calendar API testé

## 🎉 Résultat Final

Après toutes ces configurations :

✅ **Connexion Google** → Demande automatiquement l'accès Calendar  
✅ **Tokens récupérés** → `provider_token` et `provider_refresh_token` disponibles  
✅ **Appels API Calendar** → Fonctionnent avec `provider_token`  
✅ **Rafraîchissement** → Possibilité de rafraîchir le token avec `provider_refresh_token`  

**Votre application peut maintenant gérer Google Calendar ! 🚀**
