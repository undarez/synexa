"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, Zap, Brain, Heart } from "lucide-react";

interface LowerThirdProps {
  className?: string;
}

const messages = [
  { icon: Sparkles, text: "Synexa apprend de vos habitudes", color: "text-[hsl(var(--primary))]" },
  { icon: Zap, text: "Automatisez votre quotidien", color: "text-[hsl(var(--accent))]" },
  { icon: Brain, text: "Votre assistant intelligent", color: "text-[hsl(var(--gradient-end))]" },
  { icon: Heart, text: "Conçu pour vous simplifier la vie", color: "text-[hsl(var(--primary))]" },
];

const pathMessages: Record<string, string> = {
  "/dashboard": "Votre tableau de bord personnel",
  "/calendar": "Gérez votre agenda en toute simplicité",
  "/tasks": "Organisez vos tâches efficacement",
  "/reminders": "Ne manquez plus jamais un rappel",
  "/routines": "Automatisez vos routines quotidiennes",
  "/devices": "Contrôlez vos appareils connectés",
  "/news": "Restez informé en temps réel",
  "/traffic": "Optimisez vos trajets",
  "/profile": "Personnalisez votre expérience",
  "/about": "Découvrez toutes les fonctionnalités",
  "/contact": "Nous sommes là pour vous aider",
};

export function LowerThird({ className = "" }: LowerThirdProps) {
  const pathname = usePathname();
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const largeCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const largeAnimationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);
  const largeTimeRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Obtenir le message pour la page actuelle
  const getPageMessage = () => {
    return pathMessages[pathname] || messages[currentMessage].text;
  };

  // Afficher le lower third pendant 4 secondes à chaque changement de page
  useEffect(() => {
    // Réinitialiser le timer précédent si il existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Afficher le lower third avec un léger délai pour une transition douce
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    // Commencer la transition de sortie après 3.5 secondes (0.5s pour la transition)
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 3500);

    return () => {
      clearTimeout(showTimer);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname]);

  // Rotation des messages génériques (seulement pendant l'affichage)
  useEffect(() => {
    if (!pathMessages[pathname] && isVisible) {
      const interval = setInterval(() => {
        setCurrentMessage((prev) => (prev + 1) % messages.length);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [pathname, isVisible]);

  // Animation de la sphère (deux tailles : grande pour l'overlay, petite pour le lower third)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Détecter si c'est la grande sphère (overlay) ou la petite (lower third)
    const isLarge = canvas.offsetWidth > 80;
    const size = isLarge ? 120 : 60;

    const resizeCanvas = () => {
      canvas.width = size;
      canvas.height = size;
    };

    resizeCanvas();

    const draw = () => {
      timeRef.current += 0.02;
      const t = timeRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = isLarge ? 40 : 20;

      // Sphère principale avec gradient
      const gradient = ctx.createRadialGradient(
        centerX - 5,
        centerY - 5,
        0,
        centerX,
        centerY,
        radius
      );
      gradient.addColorStop(0, "rgba(99, 102, 241, 0.9)");
      gradient.addColorStop(0.5, "rgba(139, 92, 246, 0.7)");
      gradient.addColorStop(1, "rgba(99, 102, 241, 0.3)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Onde animée autour de la sphère
      for (let i = 0; i < 3; i++) {
        const waveRadius = radius + 5 + Math.sin(t * 2 + i * 1.5) * 3;
        const alpha = 0.3 - i * 0.1;
        
        ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Points lumineux qui tournent
      for (let i = 0; i < 4; i++) {
        const angle = (t * 0.5 + (i * Math.PI) / 2) % (Math.PI * 2);
        const x = centerX + Math.cos(angle) * (radius + 8);
        const y = centerY + Math.sin(angle) * (radius + 8);
        
        ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + Math.sin(t * 3) * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible]);

  // Animation de la grande sphère (overlay central)
  useEffect(() => {
    const canvas = largeCanvasRef.current;
    if (!canvas || !isVisible) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 120;
    canvas.height = 120;

    const draw = () => {
      largeTimeRef.current += 0.02;
      const t = largeTimeRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 40;

      const gradient = ctx.createRadialGradient(
        centerX - 10,
        centerY - 10,
        0,
        centerX,
        centerY,
        radius
      );
      gradient.addColorStop(0, "rgba(99, 102, 241, 0.9)");
      gradient.addColorStop(0.5, "rgba(139, 92, 246, 0.7)");
      gradient.addColorStop(1, "rgba(99, 102, 241, 0.3)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 3; i++) {
        const waveRadius = radius + 10 + Math.sin(t * 2 + i * 1.5) * 5;
        const alpha = 0.3 - i * 0.1;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let i = 0; i < 4; i++) {
        const angle = (t * 0.5 + (i * Math.PI) / 2) % (Math.PI * 2);
        const x = centerX + Math.cos(angle) * (radius + 16);
        const y = centerY + Math.sin(angle) * (radius + 16);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + Math.sin(t * 3) * 0.2})`;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      largeAnimationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (largeAnimationRef.current) {
        cancelAnimationFrame(largeAnimationRef.current);
      }
    };
  }, [isVisible]);


  const pageMessage = getPageMessage();
  const currentIcon = pathMessages[pathname] ? Sparkles : messages[currentMessage].icon;
  const Icon = currentIcon;
  const iconColor = pathMessages[pathname] 
    ? "text-[hsl(var(--primary))]" 
    : messages[currentMessage].color;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center lower-third-gradient ${className} transition-all duration-700 ease-in-out ${
        isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      style={{
        background: `radial-gradient(circle at 50% 50%, 
          hsl(var(--primary)) 0%, 
          hsl(var(--gradient-end)) 40%, 
          hsl(var(--primary)) 80%,
          hsl(var(--gradient-end)) 100%
        )`,
        backgroundSize: '300% 300%',
        backgroundPosition: 'center center',
      }}
    >
      {/* Overlay avec effet de flou dynamique */}
      <div 
        className={`absolute inset-0 bg-[hsl(var(--background))]/80 backdrop-blur-xl lower-third-fade transition-opacity duration-700 ease-in-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Contenu centré */}
      <div className={`relative z-10 flex flex-col items-center justify-center gap-6 transition-all duration-700 ease-in-out ${
        isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"
      }`}>
        {/* Sphère animée au centre (grande version) */}
        <div className="flex-shrink-0">
          <canvas
            ref={largeCanvasRef}
            className="h-[120px] w-[120px] drop-shadow-2xl"
            style={{ imageRendering: "auto" }}
          />
        </div>

        {/* Message */}
        <div className="flex items-center gap-3">
          <Icon className={`h-6 w-6 ${iconColor} animate-pulse`} />
          <span className="text-xl font-semibold text-white drop-shadow-lg whitespace-nowrap">
            {pageMessage}
          </span>
        </div>

        {/* Indicateur de mouvement */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-3 w-3 rounded-full bg-white/80 animate-pulse shadow-lg"
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: "1.5s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Lower third en bas */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 border-t-2 border-white/20 bg-[hsl(var(--background))]/90 backdrop-blur-md px-6 py-4 transition-all duration-700 ease-in-out ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
      >
        {/* Sphère animée au centre du lower third */}
        <div className="flex-shrink-0">
          <canvas
            ref={canvasRef}
            className="h-[60px] w-[60px]"
            style={{ imageRendering: "auto" }}
          />
        </div>

        {/* Message */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <Icon className={`h-5 w-5 ${iconColor} animate-pulse`} />
          <span className="text-base font-medium text-[hsl(var(--foreground))] whitespace-nowrap">
            {pageMessage}
          </span>
        </div>

        {/* Indicateur de mouvement */}
        <div className="flex gap-1 flex-shrink-0">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-[hsl(var(--primary))] animate-pulse"
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: "1.5s",
              }}
            />
          ))}
        </div>
      </div>

    </div>
  );
}

