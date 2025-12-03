import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useToast } from '@/hooks/use-toast';
import type { MinerConfig, MinerState } from '@/lib/types';
import type { AlertSettings } from '@/lib/alert-settings';
import { showSystemNotification } from '@/lib/tauri-api';

interface MinerSnapshot {
  isOnline: boolean;
  hashrate: number | null;      // Instant hashrate for display
  avgHashrate: number | null;   // Average hashrate for drop detection (from history)
  temp: number | null;
  vrTemp: number | null;
  blockFound: boolean;
}

// Minimum hashrate (GH/s) to consider for drop detection
// Below this, the miner is likely restarting or initializing
const MIN_HASHRATE_FOR_ALERT = 50;

// Cooldown period (ms) before alerting again for same miner
const HASHRATE_ALERT_COOLDOWN = 300000; // 5 minutes

// Number of recent data points to use for average hashrate calculation
const AVG_HASHRATE_SAMPLES = 5;

/**
 * Calculate average hashrate from recent history
 */
function calculateAvgHashrate(history: { hashrate: number }[]): number | null {
  if (!history || history.length === 0) return null;

  // Use the most recent N samples
  const recentSamples = history.slice(-AVG_HASHRATE_SAMPLES);
  const validSamples = recentSamples.filter(p => p.hashrate > 0);

  if (validSamples.length === 0) return null;

  const sum = validSamples.reduce((acc, p) => acc + p.hashrate, 0);
  return sum / validSamples.length;
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
  const benchmarkingMiners = useRef<Set<string>>(new Set());
  const hashrateAlertCooldowns = useRef<Record<string, number>>({});

  // Listen for benchmark start/stop events
  useEffect(() => {
    let unlistenStart: (() => void) | undefined;
    let unlistenStop: (() => void) | undefined;

    const setup = async () => {
      try {
        unlistenStart = await listen<{ minerIp: string }>('benchmark-started', (event) => {
          benchmarkingMiners.current.add(event.payload.minerIp);
        });

        unlistenStop = await listen<{ minerIp: string }>('benchmark-stopped', (event) => {
          benchmarkingMiners.current.delete(event.payload.minerIp);
          // Clear the previous snapshot so we don't alert on first reading after benchmark
          delete prevSnapshots.current[event.payload.minerIp];
        });
      } catch {
        // Not in Tauri environment
      }
    };

    setup();

    return () => {
      unlistenStart?.();
      unlistenStop?.();
    };
  }, []);

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
          avgHashrate: calculateAvgHashrate(state?.history ?? []),
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
        avgHashrate: calculateAvgHashrate(state?.history ?? []),
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

      // Hashrate drop detection - use average hashrate for more stable detection
      if (alertSettings.hashrateDropAlerts) {
        // Skip if miner is currently being benchmarked
        const isBenchmarking = benchmarkingMiners.current.has(miner.ip);

        // Use average hashrate for comparison (more stable than instant)
        const prevAvg = prev?.avgHashrate;
        const currentAvg = currentSnapshot.avgHashrate;

        // Only alert if:
        // 1. Not benchmarking
        // 2. Both readings are valid and above minimum threshold
        // 3. Not in cooldown period
        const now = Date.now();
        const lastAlert = hashrateAlertCooldowns.current[miner.ip] ?? 0;
        const isInCooldown = now - lastAlert < HASHRATE_ALERT_COOLDOWN;

        if (!isBenchmarking &&
            !isInCooldown &&
            prevAvg !== null &&
            currentAvg !== null &&
            prevAvg >= MIN_HASHRATE_FOR_ALERT &&
            currentAvg >= MIN_HASHRATE_FOR_ALERT) {

          const dropPercent = ((prevAvg - currentAvg) / prevAvg) * 100;

          if (dropPercent >= alertSettings.hashrateDropPercent) {
            const title = `${minerName} hashrate drop`;
            const description = `Avg hashrate dropped by ${dropPercent.toFixed(1)}% (${formatHashrate(prevAvg)} → ${formatHashrate(currentAvg)})`;
            toast({
              variant: 'destructive',
              title,
              description,
            });
            showSystemNotification(title, description);
            playAlertSound(alertSettings.soundEnabled);

            // Set cooldown to avoid repeated alerts
            hashrateAlertCooldowns.current[miner.ip] = now;
          }
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
