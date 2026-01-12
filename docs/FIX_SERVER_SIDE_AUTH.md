# 🔧 Correction de l'authentification côté serveur

## ❌ Problème actuel

Le dashboard utilise un **Server Component** qui essaie de récupérer la session Supabase depuis les cookies HTTP, mais Supabase stocke la session dans `localStorage` côté client par défaut.

**Résultat :** `[getCurrentUser] Aucun access token trouvé dans les cookies`

## ✅ Solution : Installer @supabase/ssr

Pour que les Server Components puissent accéder à la session Supabase, il faut installer `@supabase/ssr` et configurer un middleware qui synchronise la session de `localStorage` (client) vers les cookies HTTP (serveur).

### 1. Installer @supabase/ssr

```bash
npm install @supabase/ssr
```

### 2. Créer un middleware pour synchroniser la session

Créer/modifier `app/middleware.ts` :

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Vérifier la session et la rafraîchir si nécessaire
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 3. Mettre à jour `getCurrentUser()` pour utiliser les cookies synchronisés

Modifier `app/lib/auth/server.ts` :

```typescript
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from '@/app/lib/supabase/client'

export async function getCurrentUser() {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Les cookies peuvent être définis uniquement dans les Server Actions
            // Ne rien faire ici
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Les cookies peuvent être supprimés uniquement dans les Server Actions
            // Ne rien faire ici
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || null,
  }
}
```

## 📋 Checklist

- [ ] Installer `@supabase/ssr` : `npm install @supabase/ssr`
- [ ] Mettre à jour `app/middleware.ts` avec le code ci-dessus
- [ ] Mettre à jour `app/lib/auth/server.ts` avec `createServerClient` de `@supabase/ssr`
- [ ] Redémarrer le serveur : `npm run dev`
- [ ] Tester la connexion Google et vérifier que le dashboard détecte la session

## 🔍 Vérification

Après l'installation, vous devriez voir :
1. Les cookies Supabase dans les DevTools (Application → Cookies)
2. Le dashboard détecte la session sans rediriger vers `/auth/signin`
3. Le nom Google s'affiche au lieu de "Utilisateur"

## 📚 Documentation officielle

- [Supabase SSR avec Next.js App Router](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [@supabase/ssr sur npm](https://www.npmjs.com/package/@supabase/ssr)
