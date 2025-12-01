import Link from "next/link";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { Button } from "@/app/components/ui/button";
import {
  Calendar,
  CheckSquare,
  Zap,
  Mic,
  Cloud,
  Wifi,
  Bell,
  Sparkles,
  Shield,
  Lock,
  Clock,
  Target,
  Users,
  ArrowRight,
  CheckCircle2,
  Star,
  Heart,
  Brain,
  Smartphone,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

export default function AboutPage() {
  const features = [
    {
      icon: Calendar,
      title: "Calendrier Intelligent",
      description:
        "Gérez tous vos événements et rendez-vous en un seul endroit. Synchronisation automatique avec Google Calendar, création d'événements en langage naturel, et rappels intelligents qui tiennent compte de la météo et du trafic.",
      benefits: [
        "Plus jamais d'oubli de rendez-vous",
        "Synchronisation automatique avec vos calendriers existants",
        "Création d'événements simplement en parlant",
        "Rappels contextuels avec informations météo et trafic",
      ],
    },
    {
      icon: CheckSquare,
      title: "Gestion de Tâches Avancée",
      description:
        "Organisez vos tâches avec un système intelligent de priorités, contextes, durée estimée et niveau d'énergie requis. Regroupement automatique et suggestions personnalisées pour optimiser votre productivité.",
      benefits: [
        "Priorisation intelligente de vos tâches",
        "Organisation par contexte (travail, personnel, courses, etc.)",
        "Estimation de durée pour mieux planifier",
        "Suggestions basées sur votre niveau d'énergie",
      ],
    },
    {
      icon: Zap,
      title: "Automatisations Personnalisées",
      description:
        "Créez des routines personnalisées qui s'exécutent automatiquement selon vos déclencheurs (horaire, voix, géolocalisation). Contrôlez vos devices, créez des tâches, et déclenchez des actions complexes en une seule commande.",
      benefits: [
        "Automatisez vos routines quotidiennes",
        "Contrôle de vos devices connectés",
        "Déclenchement par voix, horaire ou géolocalisation",
        "Gain de temps considérable sur vos tâches répétitives",
      ],
    },
    {
      icon: Mic,
      title: "Commandes Vocales Naturelles",
      description:
        "Parlez à Synexa comme vous parleriez à un assistant humain. Créez des événements, des tâches et des routines simplement en parlant. Compréhension du langage naturel pour une interaction fluide et intuitive.",
      benefits: [
        "Interaction naturelle et intuitive",
        "Création rapide sans passer par des formulaires",
        "Disponible partout, à tout moment",
        "Compréhension du contexte et des intentions",
      ],
    },
    {
      icon: Cloud,
      title: "Météo & Géolocalisation",
      description:
        "Consultez la météo en temps réel basée sur votre position actuelle. Carte interactive avec prévisions détaillées. Informations météo intégrées dans vos rappels et suggestions.",
      benefits: [
        "Météo précise basée sur votre localisation",
        "Carte interactive avec prévisions",
        "Suggestions adaptées aux conditions météo",
        "Rappels intelligents tenant compte de la météo",
      ],
    },
    {
      icon: Wifi,
      title: "Domotique Intégrée",
      description:
        "Découvrez et contrôlez automatiquement vos devices WiFi et Bluetooth. Intégration transparente avec vos automatisations pour un contrôle unifié de votre environnement connecté.",
      benefits: [
        "Découverte automatique de vos devices",
        "Contrôle centralisé de tous vos appareils",
        "Intégration avec vos routines",
        "Gestion simplifiée de votre maison connectée",
      ],
    },
    {
      icon: Bell,
      title: "Notifications Multi-canal",
      description:
        "Recevez des notifications par email, push et SMS selon vos préférences. Rappels intelligents avec contexte météo et trafic pour ne jamais manquer un événement important.",
      benefits: [
        "Notifications sur tous vos appareils",
        "Rappels contextuels intelligents",
        "Personnalisation des canaux de notification",
        "Informations pertinentes au bon moment",
      ],
    },
    {
      icon: Sparkles,
      title: "Brief Quotidien Intelligent",
      description:
        "Recevez chaque matin un résumé personnalisé de votre journée avec suggestions proactives, météo, tâches prioritaires, rappels importants et recommandations de routines.",
      benefits: [
        "Vue d'ensemble de votre journée en un coup d'œil",
        "Suggestions proactives pour optimiser votre temps",
        "Météo et trafic pour vos déplacements",
        "Priorisation automatique de vos tâches",
      ],
    },
    {
      icon: Brain,
      title: "Assistant Conversationnel",
      description:
        "Posez n'importe quelle question à Synexa et obtenez des réponses intelligentes. Recherche d'informations sur le web, recherche de services, comparaison de prix, et bien plus encore.",
      benefits: [
        "Réponses à toutes vos questions",
        "Recherche d'informations en temps réel",
        "Aide pour trouver des services",
        "Comparaison de prix et recherche de produits",
      ],
    },
    {
      icon: Globe,
      title: "Actualités Personnalisées",
      description:
        "Restez informé avec des actualités personnalisées selon vos centres d'intérêt. Recherche d'articles par domaine, compatibilité avec les automatisations et les commandes vocales.",
      benefits: [
        "Actualités adaptées à vos intérêts",
        "Recherche par domaine ou sujet",
        "Intégration avec vos routines",
        "Accès via commandes vocales",
      ],
    },
    {
      icon: Smartphone,
      title: "Informations Trafic en Temps Réel",
      description:
        "Consultez le trafic en temps réel basé sur votre position actuelle. Intégration avec Waze pour une navigation optimale et suggestions d'itinéraires alternatifs.",
      benefits: [
        "Trafic en temps réel sur votre itinéraire",
        "Intégration avec Waze",
        "Suggestions d'itinéraires alternatifs",
        "Gain de temps sur vos trajets",
      ],
    },
  ];

  const values = [
    {
      icon: Shield,
      title: "Sécurité & Confidentialité",
      description:
        "Vos données sont protégées par un chiffrement de niveau professionnel. Nous respectons votre vie privée et ne partageons jamais vos informations personnelles.",
    },
    {
      icon: Lock,
      title: "Données Cryptées",
      description:
        "Toutes vos données sensibles (adresses, coordonnées, informations personnelles) sont cryptées avec AES-256-GCM, le standard de l'industrie.",
    },
    {
      icon: Clock,
      title: "Gain de Temps",
      description:
        "Automatisez vos tâches répétitives et gagnez plusieurs heures par semaine. Synexa s'occupe de l'organisation pour que vous puissiez vous concentrer sur l'essentiel.",
    },
    {
      icon: Target,
      title: "Productivité Optimisée",
      description:
        "Organisation intelligente de vos tâches selon votre niveau d'énergie, vos priorités et votre contexte. Maximisez votre efficacité chaque jour.",
    },
    {
      icon: Users,
      title: "Adapté à Votre Style de Vie",
      description:
        "Synexa s'adapte à vos habitudes et préférences. Plus vous l'utilisez, plus il apprend vos besoins et devient efficace.",
    },
    {
      icon: Heart,
      title: "Conçu pour Vous",
      description:
        "Une interface intuitive et chaleureuse, disponible en mode clair et sombre. Synexa est conçu pour être votre compagnon de confiance au quotidien.",
    },
  ];

  const testimonials = [
    {
      name: "Marie D.",
      role: "Entrepreneuse",
      content:
        "Synexa a transformé ma façon de gérer mon temps. Les automatisations me font gagner plusieurs heures par semaine.",
      rating: 5,
    },
    {
      name: "Thomas L.",
      role: "Étudiant",
      content:
        "L'assistant conversationnel est incroyable. Je peux poser n'importe quelle question et obtenir des réponses pertinentes instantanément.",
      rating: 5,
    },
    {
      name: "Sophie M.",
      role: "Professionnelle",
      content:
        "Les rappels intelligents avec météo et trafic m'ont sauvé plusieurs fois. Je ne rate plus jamais un rendez-vous important.",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-[hsl(var(--border))] bg-gradient-to-br from-[hsl(var(--primary))]/5 via-[hsl(var(--gradient-end))]/5 to-[hsl(var(--accent))]/5">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="text-center">
              <h1 className="mb-6 text-4xl font-bold tracking-tight text-[hsl(var(--foreground))] sm:text-5xl lg:text-6xl">
                Découvrez ce que Synexa
                <br />
                <span className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">
                  peut faire pour vous
                </span>
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-xl text-[hsl(var(--muted-foreground))]">
                Votre assistant personnel intelligent qui simplifie votre quotidien, organise votre temps et automatise vos tâches pour vous faire gagner du temps et réduire le stress.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link href="/auth/signin">
                  <Button size="lg" className="w-full sm:w-auto">
                    Commencer gratuitement
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Nous contacter
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Valeurs & Rassurance */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-[hsl(var(--foreground))] sm:text-4xl">
              Pourquoi faire confiance à Synexa ?
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[hsl(var(--muted-foreground))]">
              Nous mettons votre sécurité, votre confidentialité et votre bien-être au centre de tout ce que nous faisons.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card key={index} className="transition-all duration-200 hover:shadow-soft-lg">
                  <CardHeader>
                    <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-[hsl(var(--primary))]/10 to-[hsl(var(--gradient-end))]/10 p-3">
                      <Icon className="h-6 w-6 text-[hsl(var(--primary))]" />
                    </div>
                    <CardTitle className="text-xl">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {value.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Fonctionnalités Détaillées */}
        <section className="bg-[hsl(var(--muted))]/30 py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-[hsl(var(--foreground))] sm:text-4xl">
                Fonctionnalités Complètes
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-[hsl(var(--muted-foreground))]">
                Découvrez en détail toutes les fonctionnalités qui font de Synexa votre meilleur allié au quotidien.
              </p>
            </div>

            <div className="space-y-12">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="overflow-hidden transition-all duration-200 hover:shadow-soft-lg">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))]/10 to-[hsl(var(--gradient-end))]/10 p-4">
                          <Icon className="h-8 w-8 text-[hsl(var(--primary))]" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="mb-2 text-2xl">{feature.title}</CardTitle>
                          <CardDescription className="text-base">
                            {feature.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="ml-16 space-y-2">
                        <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                          Bénéfices pour vous :
                        </h4>
                        <ul className="space-y-2">
                          {feature.benefits.map((benefit, benefitIndex) => (
                            <li key={benefitIndex} className="flex items-start gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--success))]" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Témoignages */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-[hsl(var(--foreground))] sm:text-4xl">
              Ce que nos utilisateurs en disent
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[hsl(var(--muted-foreground))]">
              Découvrez comment Synexa transforme le quotidien de nos utilisateurs.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="transition-all duration-200 hover:shadow-soft-lg">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-[hsl(var(--accent))] text-[hsl(var(--accent))]" />
                    ))}
                  </div>
                  <CardDescription className="text-base italic">
                    "{testimonial.content}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10">
                      <Users className="h-5 w-5 text-[hsl(var(--primary))]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[hsl(var(--foreground))]">{testimonial.name}</p>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Final */}
        <section className="bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--gradient-end))] py-16 lg:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Prêt à transformer votre quotidien ?
            </h2>
            <p className="mb-8 text-lg text-white/90">
              Rejoignez Synexa dès aujourd'hui et découvrez comment un assistant intelligent peut simplifier votre vie.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/auth/signin">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                  Poser une question
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}



