'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface FallingChar {
  id: number;
  column: number; // fixed column position
  char: string;
  delay: number;
  duration: number;
  opacity: number;
}

const randomHexChar = () => {
  const chars = '0123456789abcdef';
  return chars[Math.floor(Math.random() * chars.length)];
};

export const ShareAnimation = ({ trigger, type = 'accepted' }: { trigger: number; type?: 'accepted' | 'rejected' }) => {
  const [isActive, setIsActive] = useState(false);
  const [chars, setChars] = useState<FallingChar[]>([]);
  const [currentType, setCurrentType] = useState<'accepted' | 'rejected'>(type);
  const initialTrigger = useRef(trigger);
  const charIdCounter = useRef(0);

  const generateChars = useCallback(() => {
    const newChars: FallingChar[] = [];
    // Create many vertical columns, closely spaced (every 5%)
    const columns = Array.from({ length: 18 }, (_, i) => 3 + i * 5.5); // 3, 8.5, 14, 19.5... to ~97%

    columns.forEach((col) => {
      // 4-7 characters per column, staggered
      const charsInColumn = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < charsInColumn; i++) {
        newChars.push({
          id: charIdCounter.current++,
          column: col + (Math.random() - 0.5) * 2, // slight horizontal wobble
          char: randomHexChar(),
          delay: i * 80 + Math.random() * 60, // faster stagger
          duration: 1500 + Math.random() * 500,
          opacity: 0.15 + Math.random() * 0.2,
        });
      }
    });
    return newChars;
  }, []);

  useEffect(() => {
    if (trigger > initialTrigger.current) {
      setCurrentType(type);
      setIsActive(true);
      setChars(generateChars());

      // End the animation
      const endTimeout = setTimeout(() => {
        setIsActive(false);
        setChars([]);
      }, 3000);

      return () => {
        clearTimeout(endTimeout);
      };
    }
  }, [trigger, type, generateChars]);

  if (!isActive || chars.length === 0) {
    return null;
  }

  const isRejected = currentType === 'rejected';
  const baseColor = isRejected ? 'rgb(239, 68, 68)' : 'rgb(52, 211, 153)';
  const glowColor = isRejected ? 'rgba(239, 68, 68, 0.3)' : 'rgba(52, 211, 153, 0.3)';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {chars.map((c) => (
        <div
          key={c.id}
          className="absolute font-mono text-xs matrix-hash-fall"
          style={{
            left: `${c.column}%`,
            top: '-12px',
            color: baseColor,
            textShadow: `0 0 4px ${glowColor}`,
            opacity: 0,
            animationDelay: `${c.delay}ms`,
            animationDuration: `${c.duration}ms`,
            '--hash-opacity': c.opacity,
          } as React.CSSProperties}
        >
          {c.char}
        </div>
      ))}
    </div>
  );
};
