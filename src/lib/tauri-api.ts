import { invoke } from '@tauri-apps/api/core';
import type { MinerInfo } from './types';

// Check if we're running in Tauri environment
// Check for __TAURI_INTERNALS__ which is more reliable than __TAURI__
const isTauri = () => {
  if (typeof window === 'undefined') {
    console.log('[Tauri API] Not in browser environment');
    return false;
  }

  // Check multiple Tauri globals for better detection
  const hasTauri = '__TAURI__' in window;
  const hasTauriInternals = '__TAURI_INTERNALS__' in window;
  const result = hasTauri || hasTauriInternals;

  console.log('[Tauri API] Detection check:', {
    result,
    hasTauri,
    hasTauriInternals,
    windowKeys: Object.keys(window).filter(k => k.includes('TAURI'))
  });

  return result;
};

interface UpdateSettingsResponse {
  success: boolean;
  message?: string;
}

/**
 * Fetch miner data from the miner's IP address
 */
export async function getMinerData(ip: string): Promise<MinerInfo> {
  if (isTauri()) {
    console.log('[Tauri API] Using Tauri invoke for getMinerData:', ip);
    try {
      const result = await invoke<MinerInfo>('get_miner_data', { ip });
      console.log('[Tauri API] Success:', result);
      return result;
    } catch (error) {
      console.error('[Tauri API] Error:', error);
      throw new Error(typeof error === 'string' ? error : 'Failed to fetch miner data');
    }
  } else {
    console.log('[Tauri API] Using fetch API route for getMinerData:', ip);
    // Fallback to Next.js API route for development
    const response = await fetch(`/api/miner/${ip}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch miner data: ${response.status}`);
    }
    return await response.json() as MinerInfo;
  }
}

/**
 * Restart a miner
 */
export async function restartMiner(ip: string): Promise<UpdateSettingsResponse> {
  if (isTauri()) {
    try {
      const result = await invoke<UpdateSettingsResponse>('restart_miner', { ip });
      return result;
    } catch (error) {
      throw new Error(typeof error === 'string' ? error : 'Failed to restart miner');
    }
  } else {
    // Fallback to Next.js API route for development
    const response = await fetch(`/api/miner/${ip}/restart`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to restart miner: ${response.status}`);
    }
    return await response.json() as UpdateSettingsResponse;
  }
}

/**
 * Update miner settings (frequency and core voltage)
 */
export async function updateMinerSettings(
  ip: string,
  frequency: number,
  coreVoltage: number
): Promise<UpdateSettingsResponse> {
  if (isTauri()) {
    try {
      const result = await invoke<UpdateSettingsResponse>('update_miner_settings', {
        ip,
        frequency,
        coreVoltage,
      });
      return result;
    } catch (error) {
      throw new Error(typeof error === 'string' ? error : 'Failed to update miner settings');
    }
  } else {
    // Fallback to Next.js API route for development
    const response = await fetch(`/api/miner/${ip}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frequency, coreVoltage }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update miner settings: ${response.status}`);
    }
    return await response.json() as UpdateSettingsResponse;
  }
}
