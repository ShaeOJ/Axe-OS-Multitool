'use client';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component that adjusts layout for mobile devices
 * Adds appropriate padding, spacing, and responsive behavior
 */
export function MobileLayout({ children, className }: MobileLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        'w-full h-full',
        isMobile ? 'p-2 pb-safe' : 'p-4',
        className
      )}
    >
      {children}
    </div>
  );
}

interface MobileGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Responsive grid that stacks on mobile and shows multiple columns on desktop
 */
export function MobileGrid({ children, className }: MobileGridProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        'grid gap-4',
        isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {children}
    </div>
  );
}

interface MobileSafeAreaProps {
  children: ReactNode;
  className?: string;
}

/**
 * Adds safe area insets for mobile devices (notches, etc.)
 */
export function MobileSafeArea({ children, className }: MobileSafeAreaProps) {
  return (
    <div
      className={cn('safe-area-inset', className)}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
      }}
    >
      {children}
    </div>
  );
}
