import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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
  "/api/auth",
  "/api/push/vapid-key",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Vérifier si la route est publique
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Si c'est une route publique, laisser passer
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Vérifier si c'est une route protégée
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Vérifier le token JWT
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Si pas de token, rediriger vers la page d'accueil
    if (!token || !token.sub) {
      const url = new URL("/", request.url);
      url.searchParams.set("error", "auth_required");
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
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







