"use client";

import { useEffect, useRef } from "react";

interface ConversationSphereProps {
  isSpeaking?: boolean;
  className?: string;
}

export function ConversationSphere({
  isSpeaking = false,
  className = "",
}: ConversationSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const dimensionsRef = useRef({ width: 200, height: 200 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ajuster la taille du canvas
    const updateDimensions = () => {
      const container = canvas.parentElement;
      if (container) {
        const size = Math.min(container.clientWidth, container.clientHeight, 200);
        dimensionsRef.current = { width: size, height: size };
        canvas.width = size;
        canvas.height = size;
      }
    };

    updateDimensions();
    const handleResize = () => {
      updateDimensions();
    };
    
    window.addEventListener("resize", handleResize);

    // Variables d'animation
    let time = 0;

    // Variables pour les ondes vocales
    const waves: Array<{
      radius: number;
      opacity: number;
      speed: number;
    }> = [];

    const draw = () => {
      // Calculer les dimensions à chaque frame
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = Math.min(canvas.width, canvas.height) * 0.15;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fond avec gradient
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        canvas.width / 2
      );
      gradient.addColorStop(0, "rgba(59, 130, 246, 0.1)");
      gradient.addColorStop(1, "rgba(59, 130, 246, 0.01)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dessiner les ondes vocales si en train de parler
      if (isSpeaking) {
        // Ajouter une nouvelle onde toutes les 0.3 secondes
        if (waves.length === 0 || waves[waves.length - 1].radius > 30) {
          waves.push({
            radius: 0,
            opacity: 0.8,
            speed: 2 + Math.random() * 1,
          });
        }

        // Dessiner et mettre à jour les ondes
        for (let i = waves.length - 1; i >= 0; i--) {
          const wave = waves[i];
          
          // Dessiner l'onde
          ctx.beginPath();
          ctx.arc(centerX, centerY, baseRadius + wave.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(59, 130, 246, ${wave.opacity})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Mettre à jour l'onde
          wave.radius += wave.speed;
          wave.opacity -= 0.02;

          // Supprimer les ondes qui sont trop grandes ou invisibles
          if (wave.radius > canvas.width / 2 || wave.opacity <= 0) {
            waves.splice(i, 1);
          }
        }
      } else {
        // Vider les ondes si on ne parle plus
        waves.length = 0;
      }

      // Dessiner la sphère principale
      time += 0.02;

      // Créer plusieurs couches pour l'effet 3D
      for (let layer = 0; layer < 3; layer++) {
        const layerTime = time + layer * 0.5;
        const radius = baseRadius + Math.sin(layerTime) * 5;

        // Gradient pour la sphère
        const sphereGradient = ctx.createRadialGradient(
          centerX - radius * 0.3,
          centerY - radius * 0.3,
          0,
          centerX,
          centerY,
          radius
        );

        if (isSpeaking) {
          // Couleur plus vive quand on parle
          sphereGradient.addColorStop(0, `rgba(59, 130, 246, ${0.9 - layer * 0.2})`);
          sphereGradient.addColorStop(0.5, `rgba(37, 99, 235, ${0.7 - layer * 0.15})`);
          sphereGradient.addColorStop(1, `rgba(29, 78, 216, ${0.5 - layer * 0.1})`);
        } else {
          sphereGradient.addColorStop(0, `rgba(59, 130, 246, ${0.6 - layer * 0.15})`);
          sphereGradient.addColorStop(0.5, `rgba(37, 99, 235, ${0.4 - layer * 0.1})`);
          sphereGradient.addColorStop(1, `rgba(29, 78, 216, ${0.3 - layer * 0.05})`);
        }

        ctx.fillStyle = sphereGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Effet de vague sur la surface
        const waveCount = 8;
        for (let i = 0; i < waveCount; i++) {
          const angle = (i / waveCount) * Math.PI * 2 + layerTime;
          const waveRadius = radius + Math.sin(angle * 3 + layerTime * 2) * 3;
          const x = centerX + Math.cos(angle) * waveRadius * 0.7;
          const y = centerY + Math.sin(angle) * waveRadius * 0.7;

          ctx.fillStyle = `rgba(147, 197, 253, ${0.3 - layer * 0.1})`;
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Animation continue
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpeaking]);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="rounded-full"
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "200px",
          maxHeight: "200px",
        }}
      />
    </div>
  );
}

