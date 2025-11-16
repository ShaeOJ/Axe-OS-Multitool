'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect if the app is running on a mobile device
 * Checks both screen size and user agent
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Check screen width
      const isSmallScreen = window.innerWidth < 768;

      // Check user agent for mobile devices
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

      setIsMobile(isSmallScreen || isMobileUA);
    };

    // Initial check
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * Hook to detect platform (desktop, android, ios)
 */
export function usePlatform() {
  const [platform, setPlatform] = useState<'desktop' | 'android' | 'ios'>('desktop');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes('android')) {
      setPlatform('android');
    } else if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios');
    } else {
      setPlatform('desktop');
    }
  }, []);

  return platform;
}
