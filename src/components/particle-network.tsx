'use client';

import React, { useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

export const ParticleNetwork = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const getColors = () => {
      if (theme === 'dark') {
        return {
          particleColor: 'hsla(150, 100%, 70%, 0.7)',
          lineColor: 'hsla(150, 100%, 70%, 0.2)',
        };
      } else {
        return {
          particleColor: 'hsla(150, 70%, 45%, 0.6)',
          lineColor: 'hsla(150, 70%, 45%, 0.1)',
        };
      }
    };
    
    const initParticles = () => {
      particles = [];
      const numberOfParticles = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 1.5 + 1,
        });
      }
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { particleColor, lineColor } = getColors();

      const pulse = (Math.sin(time / 1500) + 1) / 2; // Fluctuates between 0 and 1
      const glowRadius = 10 + pulse * 10;
      
      // Apply glow effect
      ctx.shadowBlur = glowRadius;
      ctx.shadowColor = particleColor;

      // Particles
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = particleColor;
        ctx.fill();
      });

      // Lines
      ctx.beginPath();
      for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
          const dist = Math.sqrt(
            (particles[i].x - particles[j].x) ** 2 +
            (particles[i].y - particles[j].y) ** 2
          );

          if (dist < 120) {
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
          }
        }
      }
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = lineColor;
      ctx.stroke();

      // Reset shadow for next frame to avoid affecting other elements
      ctx.shadowBlur = 0;
    };

    const update = () => {
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });
    };

    const animate = (time: number) => {
      update();
      draw(time);
      animationFrameId = requestAnimationFrame(animate);
    };

    const setup = () => {
        resizeCanvas();
        initParticles();
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        animate(0);
    }
    
    setup();

    window.addEventListener('resize', setup);

    return () => {
      window.removeEventListener('resize', setup);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full -z-10" />;
};
