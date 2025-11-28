import { useEffect, useRef, useCallback } from 'react';
import {
  initDatabase,
  saveDataPoint,
  loadHistory,
  loadAllMinersHistory,
  cleanupOldData,
  deleteMinerHistory,
} from '@/lib/database';
import type { MinerDataPoint, MinerState } from '@/lib/types';

// Check if we're running in Tauri environment
const isTauri = () => {
  return typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
};

interface UseMinerHistoryOptions {
  /** How many hours of history to load on startup (default: 4) */
  hoursToLoad?: number;
  /** How many days of data to keep in database (default: 7) */
  daysToKeep?: number;
  /** Whether to run cleanup on startup (default: true) */
  cleanupOnStart?: boolean;
}

/**
 * Hook to manage persistent miner history using SQLite database
 */
export function useMinerHistory(
  minerIps: string[],
  options: UseMinerHistoryOptions = {}
) {
  const {
    hoursToLoad = 4,
    daysToKeep = 7,
    cleanupOnStart = true,
  } = options;

  const isInitialized = useRef(false);
  const lastSaveTime = useRef<Record<string, number>>({});

  // Initialize database and run cleanup
  useEffect(() => {
    if (!isTauri() || isInitialized.current) return;

    const init = async () => {
      await initDatabase();

      if (cleanupOnStart) {
        // Run cleanup in background
        cleanupOldData(daysToKeep).catch(console.error);
      }

      isInitialized.current = true;
    };

    init();
  }, [cleanupOnStart, daysToKeep]);

  /**
   * Load historical data for all miners
   * Call this on startup to populate initial chart data
   */
  const loadHistoricalData = useCallback(async (): Promise<Record<string, MinerDataPoint[]>> => {
    if (!isTauri() || minerIps.length === 0) {
      return {};
    }

    try {
      return await loadAllMinersHistory(minerIps, hoursToLoad);
    } catch (error) {
      console.error('[useMinerHistory] Failed to load historical data:', error);
      return {};
    }
  }, [minerIps, hoursToLoad]);

  /**
   * Load historical data for a single miner
   */
  const loadMinerHistory = useCallback(async (minerIp: string): Promise<MinerDataPoint[]> => {
    if (!isTauri()) {
      return [];
    }

    try {
      return await loadHistory(minerIp, hoursToLoad);
    } catch (error) {
      console.error('[useMinerHistory] Failed to load history for', minerIp, error);
      return [];
    }
  }, [hoursToLoad]);

  /**
   * Save a new data point for a miner
   * This is throttled to avoid saving too frequently
   */
  const saveHistory = useCallback(async (minerIp: string, dataPoint: MinerDataPoint): Promise<void> => {
    if (!isTauri()) return;

    // Throttle saves to once per 15 seconds per miner (matches fetch interval)
    const now = Date.now();
    const lastSave = lastSaveTime.current[minerIp] || 0;
    if (now - lastSave < 14000) {
      return; // Skip if less than 14 seconds since last save
    }

    lastSaveTime.current[minerIp] = now;

    try {
      await saveDataPoint(minerIp, dataPoint);
    } catch (error) {
      console.error('[useMinerHistory] Failed to save data point:', error);
    }
  }, []);

  /**
   * Delete all history for a miner (call when miner is removed)
   */
  const clearMinerHistory = useCallback(async (minerIp: string): Promise<void> => {
    if (!isTauri()) return;

    try {
      await deleteMinerHistory(minerIp);
      delete lastSaveTime.current[minerIp];
    } catch (error) {
      console.error('[useMinerHistory] Failed to delete miner history:', error);
    }
  }, []);

  return {
    loadHistoricalData,
    loadMinerHistory,
    saveHistory,
    clearMinerHistory,
  };
}
