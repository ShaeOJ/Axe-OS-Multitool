'use client';

import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { hideToTray } from '@/lib/tauri-api';

/**
 * Hook to handle window close/minimize events for system tray functionality
 */
export function useWindowEvents(minimizeToTray: boolean, startMinimized: boolean) {
  useEffect(() => {
    // Only run in Tauri environment
    if (typeof window === 'undefined' || !('__TAURI__' in window || '__TAURI_INTERNALS__' in window)) {
      return;
    }

    let unlisten: (() => void) | undefined;

    const setupWindowEvents = async () => {
      try {
        const appWindow = getCurrentWindow();

        // Handle window close request - minimize to tray instead of closing
        unlisten = await listen('tauri://close-requested', async () => {
          if (minimizeToTray) {
            await hideToTray();
          } else {
            // Actually close the window
            await appWindow.close();
          }
        });

        // Handle start minimized setting
        if (startMinimized) {
          // Small delay to ensure window is ready
          setTimeout(async () => {
            await hideToTray();
          }, 100);
        }
      } catch (error) {
        console.error('[Window Events] Failed to setup window events:', error);
      }
    };

    setupWindowEvents();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [minimizeToTray, startMinimized]);
}
