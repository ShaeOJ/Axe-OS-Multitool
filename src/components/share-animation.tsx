
'use client';

import { useState, useEffect, useRef } from 'react';


const randomHash = () => {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 10; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
};

export const ShareAnimation = ({ trigger, type = 'accepted' }: { trigger: number; type?: 'accepted' | 'rejected' }) => {
  const [displayState, setDisplayState] = useState<'idle' | 'hashing' | 'revealed'>('idle');
  const [hashText, setHashText] = useState('');
  const [currentType, setCurrentType] = useState<'accepted' | 'rejected'>(type);
  const intervalRef = useRef<NodeJS.Timeout>();
  const initialTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger > initialTrigger.current) {
      setCurrentType(type);
      setDisplayState('hashing');
      intervalRef.current = setInterval(() => {
        setHashText(randomHash());
      }, 50);

      const hashingTimeout = setTimeout(() => {
        clearInterval(intervalRef.current);
        // Keep displayState as 'hashing' to show the final hash
      }, 2000);

      const idleTimeout = setTimeout(() => {
        setDisplayState('idle');
      }, 4000); // Hide after 4 seconds total

      return () => {
        clearInterval(intervalRef.current);
        clearTimeout(hashingTimeout);
        clearTimeout(idleTimeout);
      };
    }
  }, [trigger, type]);

  if (displayState === 'idle') {
    return null;
  }

  const isRejected = currentType === 'rejected';
  const textColor = isRejected ? 'text-red-500' : 'text-green-500';
  const shadowColor = isRejected ? '0 0 8px rgba(239, 68, 68, 0.8)' : '0 0 8px rgba(52, 211, 153, 0.8)';

  return (
    <div className="flex items-center justify-center pointer-events-none">
        {displayState === 'hashing' && (
            <p className={`font-mono text-sm ${textColor} animate-pulse`} style={{ textShadow: shadowColor }}>{hashText}</p>
        )}
    </div>
  );
};
