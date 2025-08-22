
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

export const ShareAnimation = ({ trigger }: { trigger: number }) => {
  const [displayState, setDisplayState] = useState<'idle' | 'hashing' | 'revealed'>('idle');
  const [hashText, setHashText] = useState('');
  const intervalRef = useRef<NodeJS.Timeout>();
  const initialTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger > initialTrigger.current) {
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
  }, [trigger]);

  if (displayState === 'idle') {
    return null;
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
            {displayState === 'hashing' && (
                <p className="font-mono text-sm text-green-500 animate-pulse" style={{ textShadow: '0 0 8px rgba(52, 211, 153, 0.8)' }}>{hashText}</p>
            )}
            
        </div>
    </div>
  );
};
