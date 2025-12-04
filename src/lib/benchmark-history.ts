/**
 * Benchmark History Storage and Management
 *
 * Stores multiple benchmark runs per miner, allowing users to view
 * and compare historical benchmark results.
 */

import { Store } from '@tauri-apps/plugin-store';
import type { BenchmarkProfile, BenchmarkHistoryEntry, BenchmarkHistory } from './types';

const STORAGE_KEY = 'benchmark-history';
const DEFAULT_MAX_ENTRIES = 10; // Keep up to 10 benchmarks per miner

// Check if we're running in Tauri environment
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Initialize store instance (will be lazy-loaded)
let store: Store | null = null;

const getStore = async () => {
  if (!isTauri()) return null;
  if (!store) {
    store = await Store.load('benchmark-history.json');
  }
  return store;
};

/**
 * Generate a unique ID for a benchmark entry
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load benchmark history from storage
 */
export async function loadBenchmarkHistory(): Promise<BenchmarkHistory> {
  if (typeof window === 'undefined') {
    return { entries: {}, maxEntriesPerMiner: DEFAULT_MAX_ENTRIES };
  }

  try {
    if (isTauri()) {
      const storeInstance = await getStore();
      if (storeInstance) {
        const stored = await storeInstance.get<BenchmarkHistory>(STORAGE_KEY);
        return stored ?? { entries: {}, maxEntriesPerMiner: DEFAULT_MAX_ENTRIES };
      }
    }

    // Fallback to localStorage for development/browser
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { entries: {}, maxEntriesPerMiner: DEFAULT_MAX_ENTRIES };
  } catch (error) {
    console.error('[BenchmarkHistory] Error loading history:', error);
    return { entries: {}, maxEntriesPerMiner: DEFAULT_MAX_ENTRIES };
  }
}

/**
 * Save benchmark history to storage
 */
async function saveBenchmarkHistory(history: BenchmarkHistory): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if (isTauri()) {
      const storeInstance = await getStore();
      if (storeInstance) {
        await storeInstance.set(STORAGE_KEY, history);
        await storeInstance.save();
        return;
      }
    }

    // Fallback to localStorage for development/browser
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('[BenchmarkHistory] Error saving history:', error);
  }
}

/**
 * Add a benchmark to history
 * Returns the created history entry
 */
export async function addBenchmarkToHistory(profile: BenchmarkProfile): Promise<BenchmarkHistoryEntry> {
  const history = await loadBenchmarkHistory();
  const minerIp = profile.minerIp;

  // Create history entry with unique ID
  const entry: BenchmarkHistoryEntry = {
    ...profile,
    id: generateId(),
  };

  // Initialize array for this miner if needed
  if (!history.entries[minerIp]) {
    history.entries[minerIp] = [];
  }

  // Add new entry at the beginning (newest first)
  history.entries[minerIp].unshift(entry);

  // Trim to max entries
  const maxEntries = history.maxEntriesPerMiner || DEFAULT_MAX_ENTRIES;
  if (history.entries[minerIp].length > maxEntries) {
    history.entries[minerIp] = history.entries[minerIp].slice(0, maxEntries);
  }

  await saveBenchmarkHistory(history);
  console.log('[BenchmarkHistory] Added benchmark for', minerIp, 'ID:', entry.id);

  return entry;
}

/**
 * Get benchmark history for a specific miner
 */
export async function getMinerBenchmarkHistory(minerIp: string): Promise<BenchmarkHistoryEntry[]> {
  const history = await loadBenchmarkHistory();
  return history.entries[minerIp] ?? [];
}

/**
 * Get the most recent benchmark for a miner
 */
export async function getLatestBenchmark(minerIp: string): Promise<BenchmarkHistoryEntry | null> {
  const entries = await getMinerBenchmarkHistory(minerIp);
  return entries.length > 0 ? entries[0] : null;
}

/**
 * Get a specific benchmark by ID
 */
export async function getBenchmarkById(minerIp: string, id: string): Promise<BenchmarkHistoryEntry | null> {
  const entries = await getMinerBenchmarkHistory(minerIp);
  return entries.find(e => e.id === id) ?? null;
}

/**
 * Delete a specific benchmark from history
 */
export async function deleteBenchmarkFromHistory(minerIp: string, id: string): Promise<void> {
  const history = await loadBenchmarkHistory();

  if (history.entries[minerIp]) {
    history.entries[minerIp] = history.entries[minerIp].filter(e => e.id !== id);

    // Remove miner entry if empty
    if (history.entries[minerIp].length === 0) {
      delete history.entries[minerIp];
    }

    await saveBenchmarkHistory(history);
    console.log('[BenchmarkHistory] Deleted benchmark', id, 'for', minerIp);
  }
}

/**
 * Clear all benchmark history for a miner
 */
export async function clearMinerBenchmarkHistory(minerIp: string): Promise<void> {
  const history = await loadBenchmarkHistory();
  delete history.entries[minerIp];
  await saveBenchmarkHistory(history);
  console.log('[BenchmarkHistory] Cleared all benchmarks for', minerIp);
}

/**
 * Clear all benchmark history
 */
export async function clearAllBenchmarkHistory(): Promise<void> {
  const history: BenchmarkHistory = {
    entries: {},
    maxEntriesPerMiner: DEFAULT_MAX_ENTRIES,
  };
  await saveBenchmarkHistory(history);
  console.log('[BenchmarkHistory] Cleared all benchmark history');
}

/**
 * Get all miners with benchmark history
 */
export async function getMinersWithHistory(): Promise<string[]> {
  const history = await loadBenchmarkHistory();
  return Object.keys(history.entries);
}

/**
 * Get total benchmark count across all miners
 */
export async function getTotalBenchmarkCount(): Promise<number> {
  const history = await loadBenchmarkHistory();
  return Object.values(history.entries).reduce((sum, entries) => sum + entries.length, 0);
}

/**
 * Format a benchmark entry for display in a list
 */
export function formatHistoryEntry(entry: BenchmarkHistoryEntry): {
  date: string;
  time: string;
  mode: string;
  hashrate: string;
  efficiency: string;
} {
  const dateObj = new Date(entry.createdAt);

  return {
    date: dateObj.toLocaleDateString(),
    time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    mode: entry.benchmarkMode.charAt(0).toUpperCase() + entry.benchmarkMode.slice(1),
    hashrate: entry.bestHashrate
      ? `${entry.bestHashrate.hashrate.toFixed(0)} GH/s`
      : 'N/A',
    efficiency: entry.bestEfficiency
      ? `${entry.bestEfficiency.efficiency.toFixed(2)} J/TH`
      : 'N/A',
  };
}

/**
 * Compare two benchmarks and return differences
 */
export function compareBenchmarks(
  a: BenchmarkHistoryEntry,
  b: BenchmarkHistoryEntry
): {
  hashrateDiff: number | null;
  efficiencyDiff: number | null;
  frequencyDiff: number | null;
  voltageDiff: number | null;
} {
  const hashrateDiff =
    a.bestHashrate && b.bestHashrate
      ? a.bestHashrate.hashrate - b.bestHashrate.hashrate
      : null;

  const efficiencyDiff =
    a.bestEfficiency && b.bestEfficiency
      ? a.bestEfficiency.efficiency - b.bestEfficiency.efficiency
      : null;

  const frequencyDiff =
    a.bestHashrate && b.bestHashrate
      ? a.bestHashrate.frequency - b.bestHashrate.frequency
      : null;

  const voltageDiff =
    a.bestHashrate && b.bestHashrate
      ? a.bestHashrate.voltage - b.bestHashrate.voltage
      : null;

  return { hashrateDiff, efficiencyDiff, frequencyDiff, voltageDiff };
}
