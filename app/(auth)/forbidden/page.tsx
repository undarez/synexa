/**
 * Page 403 - Accès refusé
 * Affichée quand un utilisateur authentifié n'a pas les permissions nécessaires
 */

import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { ShieldX } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <ShieldX className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-bold">403</h1>
          <h2 className="text-2xl font-semibold">Accès refusé</h2>
          <p className="text-muted-foreground">
            Vous n'avez pas la permission d'accéder à cette ressource.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button size="lg">Retour au dashboard</Button>
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
