"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedSphereProps {
  className?: string;
  size?: number;
}

export function AnimatedSphere({ className = "", size = 300 }: AnimatedSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [isMounted, setIsMounted] = useState(false);

  // Éviter l'erreur d'hydratation en ne rendant le canvas qu'après le montage
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    let time = 0;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Créer un dégradé radial pour la sphère
      const gradient = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        0,
        centerX,
        centerY,
        radius
      );
      gradient.addColorStop(0, "rgba(59, 130, 246, 0.8)");
      gradient.addColorStop(0.5, "rgba(139, 92, 246, 0.6)");
      gradient.addColorStop(1, "rgba(59, 130, 246, 0.2)");

      // Dessiner la sphère de base
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Dessiner les ondes animées
      const waveCount = 3;
      for (let i = 0; i < waveCount; i++) {
        const waveTime = time + (i * Math.PI * 2) / waveCount;
        const waveRadius = radius + Math.sin(waveTime * 0.5) * 20 + i * 15;
        const opacity = 0.3 - i * 0.1;

        ctx.beginPath();
        ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Dessiner des particules/orbes autour
      const particleCount = 8;
      for (let i = 0; i < particleCount; i++) {
        const angle = (time * 0.3 + (i * Math.PI * 2) / particleCount) % (Math.PI * 2);
        const distance = radius + 40 + Math.sin(time * 0.7 + i) * 15;
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        const particleSize = 4 + Math.sin(time + i) * 2;

        ctx.beginPath();
        ctx.arc(x, y, particleSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${0.6 + Math.sin(time + i) * 0.3})`;
        ctx.fill();
      }

      // Dessiner des lignes de connexion
      ctx.strokeStyle = "rgba(59, 130, 246, 0.2)";
      ctx.lineWidth = 1;
      for (let i = 0; i < particleCount; i++) {
        const angle1 = (time * 0.3 + (i * Math.PI * 2) / particleCount) % (Math.PI * 2);
        const angle2 = (time * 0.3 + ((i + 1) * Math.PI * 2) / particleCount) % (Math.PI * 2);
        const distance = radius + 40;
        const x1 = centerX + Math.cos(angle1) * distance;
        const y1 = centerY + Math.sin(angle1) * distance;
        const x2 = centerX + Math.cos(angle2) * distance;
        const y2 = centerY + Math.sin(angle2) * distance;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      time += 0.02;
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, size]);

  return (
    <div className={`relative ${className}`}>
      {isMounted ? (
        <>
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            style={{ imageRendering: "auto" }}
          />
          {/* Effet de brillance */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/20 via-purple-500/20 to-blue-600/20 blur-3xl" />
        </>
      ) : (
        // Placeholder pendant le montage pour éviter l'erreur d'hydratation
        <div className="h-full w-full flex items-center justify-center">
          <div className="rounded-full bg-gradient-to-br from-blue-400/20 via-purple-500/20 to-blue-600/20 blur-3xl h-full w-full" />
        </div>
      )}
    </div>
  );
}


