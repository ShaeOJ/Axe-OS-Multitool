/**
 * Benchmark Profile Storage and Management
 *
 * Stores and retrieves benchmark results per miner, allowing the auto-tuner
 * to use device-specific optimal settings discovered during benchmarking.
 */

import { Store } from '@tauri-apps/plugin-store';
import type { BenchmarkProfile } from './types';
import type { BenchmarkSummary, BenchmarkResult } from './benchmark';
import { getDeviceProfile, getTuningPreset } from './asic-presets';

const STORAGE_KEY = 'benchmark-profiles';

// Check if we're running in Tauri environment
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Initialize store instance (will be lazy-loaded)
let store: Store | null = null;

const getStore = async () => {
  if (!isTauri()) return null;
  if (!store) {
    store = await Store.load('benchmark-profiles.json');
  }
  return store;
};

/**
 * Load all benchmark profiles from storage
 */
export async function loadBenchmarkProfiles(): Promise<Record<string, BenchmarkProfile>> {
  if (typeof window === 'undefined') return {};

  try {
    if (isTauri()) {
      const storeInstance = await getStore();
      if (storeInstance) {
        const stored = await storeInstance.get<Record<string, BenchmarkProfile>>(STORAGE_KEY);
        return stored ?? {};
      }
    }

    // Fallback to localStorage for development/browser
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('[BenchmarkProfiles] Error loading profiles:', error);
    return {};
  }
}

/**
 * Save all benchmark profiles to storage
 */
async function saveBenchmarkProfiles(profiles: Record<string, BenchmarkProfile>): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if (isTauri()) {
      const storeInstance = await getStore();
      if (storeInstance) {
        await storeInstance.set(STORAGE_KEY, profiles);
        await storeInstance.save();
        return;
      }
    }

    // Fallback to localStorage for development/browser
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch (error) {
    console.error('[BenchmarkProfiles] Error saving profiles:', error);
  }
}

/**
 * Get benchmark profile for a specific miner
 */
export async function getBenchmarkProfile(minerIp: string): Promise<BenchmarkProfile | null> {
  const profiles = await loadBenchmarkProfiles();
  return profiles[minerIp] ?? null;
}

/**
 * Save benchmark profile for a miner
 */
export async function saveBenchmarkProfile(profile: BenchmarkProfile): Promise<void> {
  const profiles = await loadBenchmarkProfiles();
  profiles[profile.minerIp] = profile;
  await saveBenchmarkProfiles(profiles);
  console.log('[BenchmarkProfiles] Saved profile for', profile.minerIp);
}

/**
 * Delete benchmark profile for a miner
 */
export async function deleteBenchmarkProfile(minerIp: string): Promise<void> {
  const profiles = await loadBenchmarkProfiles();
  delete profiles[minerIp];
  await saveBenchmarkProfiles(profiles);
  console.log('[BenchmarkProfiles] Deleted profile for', minerIp);
}

/**
 * Create a BenchmarkProfile from a BenchmarkSummary
 * Called after a benchmark completes successfully
 */
export function createProfileFromSummary(
  summary: BenchmarkSummary,
  minerInfo: {
    hostname?: string;
    ASICModel?: string;
  }
): BenchmarkProfile {
  const deviceProfile = getDeviceProfile(minerInfo.hostname, minerInfo.ASICModel);
  const tuningPreset = getTuningPreset(minerInfo.ASICModel, minerInfo.hostname);

  // Find best hashrate result
  const bestHashrateResult = summary.topPerformers[0];
  const bestHashrate = bestHashrateResult ? {
    frequency: bestHashrateResult.frequency,
    voltage: bestHashrateResult.coreVoltage,
    hashrate: bestHashrateResult.averageHashrate,
    temperature: bestHashrateResult.averageChipTemp,
    power: bestHashrateResult.averagePower,
    efficiency: bestHashrateResult.efficiencyJTH,
  } : null;

  // Find best efficiency result
  const bestEfficiencyResult = summary.mostEfficient[0];
  const bestEfficiency = bestEfficiencyResult ? {
    frequency: bestEfficiencyResult.frequency,
    voltage: bestEfficiencyResult.coreVoltage,
    hashrate: bestEfficiencyResult.averageHashrate,
    temperature: bestEfficiencyResult.averageChipTemp,
    power: bestEfficiencyResult.averagePower,
    efficiency: bestEfficiencyResult.efficiencyJTH,
  } : null;

  // Calculate safe limits from all results
  const allResults = summary.allResults;
  const stableResults = allResults.filter(r => r.hashrateWithinTolerance);

  const safeLimits = {
    maxFrequency: stableResults.length > 0
      ? Math.max(...stableResults.map(r => r.frequency))
      : summary.originalSettings.frequency,
    maxVoltage: allResults.length > 0
      ? Math.max(...allResults.map(r => r.coreVoltage))
      : summary.originalSettings.voltage,
    maxTemperature: allResults.length > 0
      ? Math.max(...allResults.map(r => r.averageChipTemp))
      : 65,
    maxPower: allResults.length > 0
      ? Math.max(...allResults.map(r => r.averagePower))
      : 40,
  };

  // Convert all results to profile format
  const profileResults = allResults.map(r => ({
    frequency: r.frequency,
    voltage: r.coreVoltage,
    hashrate: r.averageHashrate,
    temperature: r.averageChipTemp,
    power: r.averagePower,
    efficiency: r.efficiencyJTH,
    stable: r.hashrateWithinTolerance,
  }));

  const now = Date.now();

  return {
    minerIp: summary.minerIp,
    minerName: summary.minerName,
    deviceProfile: tuningPreset.profileName,
    asicModel: minerInfo.ASICModel ?? 'Unknown',
    chipCount: deviceProfile?.chipCount ?? 1,

    createdAt: now,
    updatedAt: now,
    benchmarkMode: summary.mode,

    bestHashrate,
    bestEfficiency,
    safeLimits,
    allResults: profileResults,
  };
}

/**
 * Get target settings from a benchmark profile based on mode
 */
export function getTargetSettingsFromProfile(
  profile: BenchmarkProfile,
  mode: 'hashrate' | 'efficiency' | 'custom'
): { frequency: number; voltage: number } | null {
  if (mode === 'hashrate' && profile.bestHashrate) {
    return {
      frequency: profile.bestHashrate.frequency,
      voltage: profile.bestHashrate.voltage,
    };
  }

  if (mode === 'efficiency' && profile.bestEfficiency) {
    return {
      frequency: profile.bestEfficiency.frequency,
      voltage: profile.bestEfficiency.voltage,
    };
  }

  // For custom mode, return best hashrate as default
  if (profile.bestHashrate) {
    return {
      frequency: profile.bestHashrate.frequency,
      voltage: profile.bestHashrate.voltage,
    };
  }

  return null;
}

/**
 * Check if a miner has a saved benchmark profile
 */
export async function hasBenchmarkProfile(minerIp: string): Promise<boolean> {
  const profile = await getBenchmarkProfile(minerIp);
  return profile !== null;
}

/**
 * Format profile for display
 */
export function formatProfileSummary(profile: BenchmarkProfile): string {
  const parts: string[] = [];

  if (profile.bestHashrate) {
    parts.push(`Best: ${profile.bestHashrate.hashrate.toFixed(0)} GH/s @ ${profile.bestHashrate.frequency}MHz/${profile.bestHashrate.voltage}mV`);
  }

  if (profile.bestEfficiency) {
    parts.push(`Efficient: ${profile.bestEfficiency.efficiency.toFixed(2)} J/TH @ ${profile.bestEfficiency.frequency}MHz`);
  }

  const date = new Date(profile.updatedAt).toLocaleDateString();
  parts.push(`Updated: ${date}`);

  return parts.join(' | ');
}
