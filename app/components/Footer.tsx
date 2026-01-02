"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
  // Utiliser useState pour éviter les erreurs d'hydratation
  // L'année est définie côté client après le montage
  const [currentYear, setCurrentYear] = useState(2024);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Logo et description */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="mb-4 text-lg font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">
              Synexa
            </h3>
            <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
              Votre assistant personnel intelligent pour organiser votre quotidien,
              gérer votre agenda, vos tâches et automatiser vos actions.
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Liens rapides */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-[hsl(var(--foreground))]">
              Liens rapides
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
                >
                  Accueil
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
                >
                  En savoir plus
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/signin"
                  className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
                >
                  Connexion
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-[hsl(var(--foreground))]">
              Support
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="/contact"
                  className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
                >
                  <Mail className="mr-2 inline h-4 w-4" />
                  Contactez-nous
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-[hsl(var(--border))] pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              © {currentYear} Synexa. Tous droits réservés.
            </p>
            <div className="flex gap-6 text-sm text-[hsl(var(--muted-foreground))]">
              <Link
                href="#"
                className="transition-colors hover:text-[hsl(var(--primary))]"
              >
                Mentions légales
              </Link>
              <Link
                href="#"
                className="transition-colors hover:text-[hsl(var(--primary))]"
              >
                Politique de confidentialité
              </Link>
              <Link
                href="#"
                className="transition-colors hover:text-[hsl(var(--primary))]"
              >
                CGU
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

