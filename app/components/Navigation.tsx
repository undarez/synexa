"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/app/components/ui/sheet";
import { Button } from "@/app/components/ui/button";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import {
  ChevronDown,
  Calendar,
  Bell,
  CheckSquare,
  User,
  LogOut,
  Wifi,
  Menu,
  Home,
  Newspaper,
  Navigation as NavigationIcon,
  Cloud,
  Activity,
  Zap,
  Wallet,
  Bot,
} from "lucide-react";

export function Navigation() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Menu hamburger mobile */}
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Link
                href="/"
                className="text-xl font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent hover:opacity-80 transition-opacity"
              >
                Synexa
              </Link>
              <nav className="hidden gap-4 sm:flex">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
              >
                Dashboard
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]">
                  Organisation
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/calendar" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Calendrier
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/reminders" className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Rappels
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/tasks" className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Tâches
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]">
                  Domotique
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/synexa" className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Synexa
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/routines" className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Automatisations
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/devices" className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      Devices
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link
                href="/news"
                className="flex items-center gap-1 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
              >
                <Newspaper className="h-4 w-4" />
                Actualités
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]">
                  Environnement
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/traffic" className="flex items-center gap-2">
                      <NavigationIcon className="h-4 w-4" />
                      Trafic
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/weather" className="flex items-center gap-2">
                      <Cloud className="h-4 w-4" />
                      Météo
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]">
                  Bien-être
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/health" className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Santé
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/finance" className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Finance
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden gap-4 sm:flex">
              <Link
                href="/about"
                className="text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
              >
                En savoir plus
              </Link>
              <Link
                href="/contact"
                className="text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
              >
                Contact
              </Link>
            </nav>
            <ThemeToggle />
            {session?.user && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-3 focus:outline-none">
                  <Avatar>
                    <AvatarImage
                      src={session.user.image || undefined}
                      alt={session.user.name || "User"}
                    />
                    <AvatarFallback>
                      {session.user.name?.charAt(0).toUpperCase() ||
                        session.user.email?.charAt(0).toUpperCase() ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm text-[hsl(var(--foreground))] sm:inline">
                    {session.user.name || session.user.email}
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-[hsl(var(--muted-foreground))] sm:inline" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session.user.name || "Utilisateur"}
                      </p>
                      <p className="text-xs leading-none text-[hsl(var(--muted-foreground))]">
                        {session.user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                    className="flex items-center gap-2 text-[hsl(var(--destructive))] focus:text-[hsl(var(--destructive))]"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>

    {/* Menu mobile */}
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetContent onClose={() => setMobileMenuOpen(false)}>
        <div className="space-y-4">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              Menu
            </h2>
          </div>

          <nav className="space-y-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
            >
              <Home className="h-5 w-5" />
              Accueil
            </Link>
            <Link
              href="/synexa"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
            >
              <Bot className="h-5 w-5" />
              Synexa
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
            >
              En savoir plus
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
            >
              Contact
            </Link>

            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">
                Organisation
              </p>
              <Link
                href="/calendar"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <Calendar className="h-5 w-5" />
                Calendrier
              </Link>
              <Link
                href="/reminders"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <Bell className="h-5 w-5" />
                Rappels
              </Link>
              <Link
                href="/tasks"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <CheckSquare className="h-5 w-5" />
                Tâches
              </Link>
            </div>

            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">
                Domotique
              </p>
              <Link
                href="/synexa"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <Bot className="h-5 w-5" />
                Synexa
              </Link>
              <Link
                href="/routines"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <Zap className="h-5 w-5" />
                Automatisations
              </Link>
              <Link
                href="/devices"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <Wifi className="h-5 w-5" />
                Devices
              </Link>
            </div>
            <Link
              href="/news"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
            >
              <Newspaper className="h-5 w-5" />
              Actualités
            </Link>
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">
                Environnement
              </p>
              <Link
                href="/traffic"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <NavigationIcon className="h-5 w-5" />
                Trafic
              </Link>
              <Link
                href="/weather"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <Cloud className="h-5 w-5" />
                Météo
              </Link>
            </div>
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">
                Bien-être
              </p>
              <Link
                href="/health"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <Activity className="h-5 w-5" />
                Santé
              </Link>
              <Link
                href="/finance"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <Wallet className="h-5 w-5" />
                Finance
              </Link>
            </div>
          </nav>

          {session?.user && (
            <div className="mt-8 space-y-2 border-t border-[hsl(var(--border))] pt-4">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  {session.user.name || "Utilisateur"}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {session.user.email}
                </p>
              </div>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <User className="h-5 w-5" />
                Profil
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: "/auth/signin" });
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--destructive))] transition-colors hover:bg-[hsl(var(--destructive))]/10"
              >
                <LogOut className="h-5 w-5" />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}
