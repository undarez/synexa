import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth/session";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import SynexaChat from "@/app/components/SynexaChat";

export default async function SynexaPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/?error=auth_required&redirect=/synexa");
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navigation />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">
            Synexa
          </h1>
          <p className="mt-2 text-[hsl(var(--muted-foreground))]">
            Ton assistante personnelle vocale et textuelle
          </p>
        </div>

        <SynexaChat />
      </main>
      <Footer />
    </div>
  );
}

