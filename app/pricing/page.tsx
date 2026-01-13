/**
 * Page Pricing - Comparaison des plans d'abonnement
 */

"use client";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Check, X, Zap, Crown, Sparkles } from "lucide-react";
import Link from "next/link";
import { PRICING_PLANS, type SubscriptionPlan } from "@/app/lib/services/pricing-config";

export default function PricingPage() {
  const plans: SubscriptionPlan[] = ["FREE", "PLUS", "PRO"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold">
              Cinexa
            </Link>
            <div className="flex gap-4">
              <Link href="/auth/signin">
                <Button variant="ghost">Se connecter</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Commencer</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          Choisissez votre plan
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
          Des fonctionnalités adaptées à vos besoins. Commencez gratuitement, évoluez selon vos besoins.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-16">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
        {plans.map((planKey) => {
          const plan = PRICING_PLANS[planKey];
          const isPopular = plan.popular;

          // Couleurs selon le plan (bleu/indigo avec accents vert/violet)
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
                      {plan.features.iaConversational ? (
                        <Check className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Check className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                      )}
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
                    <div className="flex items-start gap-2">
                      {plan.features.supportPremium ? (
                        <Check className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : plan.features.supportPriority ? (
                        <Check className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <X className="mt-0.5 h-5 w-5 text-red-600 flex-shrink-0" />
                      )}
                      <span className="text-sm">
                        {plan.features.supportPremium
                          ? "Support premium"
                          : plan.features.supportPriority
                          ? "Support prioritaire"
                          : "Support standard"}
                      </span>
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

        {/* Note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Tous les plans incluent un essai gratuit de 14 jours. Aucune carte bancaire requise pour commencer.
          </p>
        </div>
      </div>
    </div>
  );
}
