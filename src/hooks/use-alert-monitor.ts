import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { MinerConfig, MinerState } from '@/lib/types';
import type { AlertSettings } from '@/lib/alert-settings';
import { showSystemNotification, requestNotificationPermission } from '@/lib/tauri-api';

interface MinerSnapshot {
  isOnline: boolean;
  hashrate: number | null;
  temp: number | null;
  vrTemp: number | null;
  blockFound: boolean;
}

/**
 * Hook that monitors miner states and triggers alerts based on settings
 */
export function useAlertMonitor(
  miners: MinerConfig[],
  minerStates: Record<string, MinerState>,
  alertSettings: AlertSettings
) {
  const { toast } = useToast();
  const prevSnapshots = useRef<Record<string, MinerSnapshot>>({});
  const isFirstRun = useRef(true);

  useEffect(() => {
    // Skip if alerts are disabled
    if (!alertSettings.enabled) return;

    // Skip first run to avoid alerts on initial load
    if (isFirstRun.current) {
      // Initialize snapshots without alerting
      const initialSnapshots: Record<string, MinerSnapshot> = {};
      miners.forEach(miner => {
        const state = minerStates[miner.ip];
        initialSnapshots[miner.ip] = {
          isOnline: !state?.error && !!state?.info,
          hashrate: state?.info?.hashRate ?? null,
          temp: state?.info?.temp ?? null,
          vrTemp: state?.info?.vrTemp ?? null,
          blockFound: state?.info?.blockFound === 1,
        };
      });
      prevSnapshots.current = initialSnapshots;
      isFirstRun.current = false;
      return;
    }

    miners.forEach(miner => {
      const state = minerStates[miner.ip];
      const prev = prevSnapshots.current[miner.ip];
      const minerName = miner.name || state?.info?.hostname || miner.ip;

      const currentSnapshot: MinerSnapshot = {
        isOnline: !state?.error && !!state?.info,
        hashrate: state?.info?.hashRate ?? null,
        temp: state?.info?.temp ?? null,
        vrTemp: state?.info?.vrTemp ?? null,
        blockFound: state?.info?.blockFound === 1,
      };

      // Skip alerting for newly added miners (no previous snapshot)
      if (!prev) {
        prevSnapshots.current[miner.ip] = currentSnapshot;
        return;
      }

      // Miner went offline
      if (alertSettings.offlineAlerts && prev?.isOnline && !currentSnapshot.isOnline) {
        const title = `${minerName} went offline`;
        const description = state?.error || 'Connection lost';
        toast({
          variant: 'destructive',
          title,
          description,
        });
        showSystemNotification(title, description);
        playAlertSound(alertSettings.soundEnabled);
      }

      // Miner came back online
      if (alertSettings.onlineAlerts && prev && !prev.isOnline && currentSnapshot.isOnline) {
        const title = `${minerName} is back online`;
        const description = 'Connection restored';
        toast({
          title,
          description,
        });
        showSystemNotification(title, description);
      }

      // Temperature threshold exceeded
      if (alertSettings.tempAlerts && currentSnapshot.temp !== null) {
        const wasOverTemp = prev?.temp !== null && prev.temp >= alertSettings.tempThreshold;
        const isOverTemp = currentSnapshot.temp >= alertSettings.tempThreshold;

        if (!wasOverTemp && isOverTemp) {
          const title = `${minerName} temperature warning`;
          const description = `Temperature reached ${currentSnapshot.temp}°C (threshold: ${alertSettings.tempThreshold}°C)`;
          toast({
            variant: 'destructive',
            title,
            description,
          });
          showSystemNotification(title, description);
          playAlertSound(alertSettings.soundEnabled);
        }
      }

      // VR Temperature threshold exceeded
      if (alertSettings.vrTempAlerts && currentSnapshot.vrTemp !== null) {
        const wasOverTemp = prev?.vrTemp !== null && prev.vrTemp >= alertSettings.vrTempThreshold;
        const isOverTemp = currentSnapshot.vrTemp >= alertSettings.vrTempThreshold;

        if (!wasOverTemp && isOverTemp) {
          const title = `${minerName} VR temperature warning`;
          const description = `VR Temperature reached ${currentSnapshot.vrTemp}°C (threshold: ${alertSettings.vrTempThreshold}°C)`;
          toast({
            variant: 'destructive',
            title,
            description,
          });
          showSystemNotification(title, description);
          playAlertSound(alertSettings.soundEnabled);
        }
      }

      // Hashrate drop detection
      if (alertSettings.hashrateDropAlerts &&
          prev?.hashrate !== null &&
          currentSnapshot.hashrate !== null &&
          prev.hashrate > 0) {
        const dropPercent = ((prev.hashrate - currentSnapshot.hashrate) / prev.hashrate) * 100;

        if (dropPercent >= alertSettings.hashrateDropPercent) {
          const title = `${minerName} hashrate drop`;
          const description = `Hashrate dropped by ${dropPercent.toFixed(1)}% (${formatHashrate(prev.hashrate)} → ${formatHashrate(currentSnapshot.hashrate)})`;
          toast({
            variant: 'destructive',
            title,
            description,
          });
          showSystemNotification(title, description);
          playAlertSound(alertSettings.soundEnabled);
        }
      }

      // Block found celebration
      if (alertSettings.blockFoundAlerts && !prev?.blockFound && currentSnapshot.blockFound) {
        const title = `🎉 ${minerName} found a block!`;
        const description = 'Congratulations! Your miner found a Bitcoin block!';
        toast({
          title,
          description,
        });
        showSystemNotification(title, description);
        playAlertSound(alertSettings.soundEnabled);
      }

      // Update snapshot
      prevSnapshots.current[miner.ip] = currentSnapshot;
    });

    // Clean up snapshots for removed miners
    const currentIps = new Set(miners.map(m => m.ip));
    Object.keys(prevSnapshots.current).forEach(ip => {
      if (!currentIps.has(ip)) {
        delete prevSnapshots.current[ip];
      }
    });
  }, [miners, minerStates, alertSettings, toast]);
}

function formatHashrate(hashrate: number): string {
  if (hashrate >= 1000) {
    return `${(hashrate / 1000).toFixed(2)} TH/s`;
  }
  return `${hashrate.toFixed(0)} GH/s`;
}

function playAlertSound(enabled: boolean) {
  if (!enabled) return;

  try {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.warn('Could not play alert sound:', error);
  }
}
