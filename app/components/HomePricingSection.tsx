/**
 * Section Pricing sur la landing page
 */

"use client";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Check, X, Zap, Crown, Sparkles } from "lucide-react";
import Link from "next/link";
import { PRICING_PLANS, type SubscriptionPlan } from "@/app/lib/services/pricing-config";

export function HomePricingSection() {
  const plans: SubscriptionPlan[] = ["FREE", "PLUS", "PRO"];

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mb-16 text-center">
        <h2 className="mb-4 text-3xl font-bold text-[hsl(var(--foreground))] sm:text-4xl">
          Choisissez votre plan
        </h2>
        <p className="text-lg text-[hsl(var(--muted-foreground))]">
          Des fonctionnalités adaptées à vos besoins. Commencez gratuitement, évoluez selon vos besoins.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((planKey) => {
          const plan = PRICING_PLANS[planKey];
          const isPopular = plan.popular;

          // Couleurs selon le plan
          const colorClasses = {
            FREE: {
              border: "border-green-500/30",
              bg: "bg-green-500/5",
              text: "text-green-600",
              button: "bg-green-600 hover:bg-green-700",
            },
            PLUS: {
              border: "border-blue-500/30",
              bg: "bg-blue-500/5",
              text: "text-blue-600",
              button: "bg-blue-600 hover:bg-blue-700",
            },
            PRO: {
              border: "border-purple-500/30",
              bg: "bg-purple-500/5",
              text: "text-purple-600",
              button: "bg-purple-600 hover:bg-purple-700",
            },
          };

          const colors = colorClasses[planKey];

          return (
            <Card
              key={planKey}
              className={`relative flex flex-col transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                isPopular
                  ? `${colors.border} ${colors.bg} border-2 shadow-lg`
                  : "border-border"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className={`${colors.button} text-white`}>
                    Le plus populaire
                  </Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {plan.description}
                    </CardDescription>
                  </div>
                  {planKey === "FREE" && (
                    <Sparkles className={`h-6 w-6 ${colors.text}`} />
                  )}
                  {planKey === "PLUS" && (
                    <Zap className={`h-6 w-6 ${colors.text}`} />
                  )}
                  {planKey === "PRO" && (
                    <Crown className={`h-6 w-6 ${colors.text}`} />
                  )}
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    {plan.price === 0 ? "Gratuit" : `€${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground"> / {plan.pricePeriod}</span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm">
                      <strong>{plan.limits.devices === -1 ? "Illimité" : plan.limits.devices}</strong> devices
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm">
                      <strong>{plan.limits.automations === -1 ? "Illimité" : plan.limits.automations}</strong> automatisations
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    {plan.features.voiceSimple || plan.features.voiceFull ? (
                      <Check className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="mt-0.5 h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                    <span className="text-sm">
                      {plan.features.voiceFull
                        ? "Assistant vocal complet"
                        : plan.features.voiceSimple
                        ? "Commandes vocales simples"
                        : "Pas de voix"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm">
                      Historique:{" "}
                      {plan.limits.historyDays === -1
                        ? "Illimité"
                        : `${plan.limits.historyDays} jours`}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm">
                      {plan.features.iaConversational
                        ? "IA conversationnelle (Grok)"
                        : "IA texte simple"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    {plan.features.securityAdvanced ? (
                      <Check className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : plan.features.securityBasic ? (
                      <Check className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="mt-0.5 h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                    <span className="text-sm">
                      {plan.features.securityAdvanced
                        ? "Sécurité avancée"
                        : plan.features.securityBasic
                        ? "Sécurité basique"
                        : "Pas de sécurité"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    {plan.features.intelligentRoutines ? (
                      <Check className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="mt-0.5 h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                    <span className="text-sm">Routines intelligentes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    {plan.features.premiumConnectors ? (
                      <Check className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="mt-0.5 h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                    <span className="text-sm">Connecteurs premium</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <Link href="/auth/signup" className="w-full">
                  <Button
                    className={`w-full ${colors.button} text-white`}
                    size="lg"
                  >
                    {planKey === "FREE" ? "Commencer gratuitement" : "Choisir ce plan"}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Lien vers la page pricing complète */}
      <div className="mt-12 text-center">
        <Link href="/pricing">
          <Button variant="outline" size="lg">
            Voir tous les détails des plans
          </Button>
        </Link>
      </div>
    </section>
  );
}
