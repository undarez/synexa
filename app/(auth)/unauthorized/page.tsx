/**
 * Page 401 - Non autorisé
 * Affichée quand un utilisateur non authentifié tente d'accéder à une route protégée
 */

import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Lock } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <Lock className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-bold">401</h1>
          <h2 className="text-2xl font-semibold">Non autorisé</h2>
          <p className="text-muted-foreground">
            Vous devez être connecté pour accéder à cette page.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth/signin">
            <Button size="lg">Se connecter</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="lg">
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
