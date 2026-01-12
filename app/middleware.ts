import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/app/lib/supabase/client";

/**
 * Routes protégées nécessitant une authentification
 */
const protectedRoutes = [
  "/dashboard",
  "/calendar",
  "/tasks",
  "/reminders",
  "/routines",
  "/devices",
  "/profile",
  "/admin",
  "/api/calendar",
  "/api/tasks",
  "/api/reminders",
  "/api/routines",
  "/api/devices",
  "/api/assistant",
  "/api/voice",
  "/api/contact",
  "/api/admin",
];

/**
 * Routes publiques (accessibles sans authentification)
 */
const publicRoutes = [
  "/",
  "/auth/signin",
  "/auth/signup",
  "/auth/error",
  "/contact",
  "/api/push/vapid-key",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Créer un client Supabase avec @supabase/ssr pour synchroniser la session
  // Ce client synchronise automatiquement la session de localStorage (client) vers les cookies HTTP (serveur)
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Mettre à jour les cookies de la requête et de la réponse
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // Supprimer les cookies de la requête et de la réponse
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // Vérifier la session et la rafraîchir si nécessaire
  // Cela synchronise automatiquement la session de localStorage vers les cookies HTTP
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Vérifier si la route est publique
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Si c'est une route publique, laisser passer
  if (isPublicRoute) {
    return response;
  }

  // Vérifier si c'est une route protégée
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Si c'est une route protégée et qu'il n'y a pas d'utilisateur authentifié, rediriger vers la page de connexion
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};







