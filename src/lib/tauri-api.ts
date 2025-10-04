import { invoke } from '@tauri-apps/api/core';

// Check if we're running in Tauri environment
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

/**
 * Fetch miner data from the miner's IP address
 */
export async function getMinerData(ip: string): Promise<any> {
  if (isTauri()) {
    try {
      const result = await invoke('get_miner_data', { ip });
      return result;
    } catch (error) {
      throw new Error(typeof error === 'string' ? error : 'Failed to fetch miner data');
    }
  } else {
    // Fallback to Next.js API route for development
    const response = await fetch(`/api/miner/${ip}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch miner data: ${response.status}`);
    }
    return await response.json();
  }
}

/**
 * Restart a miner
 */
export async function restartMiner(ip: string): Promise<any> {
  if (isTauri()) {
    try {
      const result = await invoke('restart_miner', { ip });
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
    return await response.json();
  }
}

/**
 * Update miner settings (frequency and core voltage)
 */
export async function updateMinerSettings(
  ip: string,
  frequency: number,
  coreVoltage: number
): Promise<any> {
  if (isTauri()) {
    try {
      const result = await invoke('update_miner_settings', {
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
    return await response.json();
  }
}
