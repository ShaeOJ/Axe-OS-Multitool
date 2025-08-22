'use client';

import { cn } from '@/lib/utils';
import React, { useState, useEffect, useRef } from 'react';

type GlitchProps = {
  children: React.ReactNode;
  className?: string;
  probability?: number; // Probability of glitching (0 to 1)
  maxDuration?: number;  // Max duration of a glitch in ms
};

export function Glitch({
  children,
  className,
  probability = 0.1,
  maxDuration = 500,
}: GlitchProps) {
  const [isGlitching, setIsGlitching] = useState(false);
  const [isMouseOver, setIsMouseOver] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isMouseOver) return;

    const triggerGlitch = () => {
      if (Math.random() < probability) {
        setIsGlitching(true);
        const duration = Math.random() * maxDuration;
        timeoutRef.current = setTimeout(() => {
          setIsGlitching(false);
        }, duration);
      }
    };

    const interval = setInterval(triggerGlitch, 1000); // Check every second

    return () => {
      clearInterval(interval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [probability, maxDuration, isMouseOver]);

  const handleMouseEnter = () => {
    setIsMouseOver(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsGlitching(true);
    timeoutRef.current = setTimeout(() => {
      setIsGlitching(false);
    }, maxDuration);
  };

  const handleMouseLeave = () => {
    setIsMouseOver(false);
  };

  return (
    <span
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(isGlitching && 'glitch-text', className)}
    >
      {children}
    </span>
  );
}
