import { invoke } from '@tauri-apps/api/core';
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-shell';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import type { MinerConfig, MinerInfo, MinerState } from './types';

// Check if we're running in Tauri environment
// Check for __TAURI_INTERNALS__ which is more reliable than __TAURI__
const isTauri = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check multiple Tauri globals for better detection
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window;
};

/**
 * Open a URL in the default browser
 */
export async function openUrl(url: string): Promise<void> {
  if (isTauri()) {
    try {
      await open(url);
    } catch (error) {
      console.error('[Tauri API] Failed to open URL:', error);
      // Fallback to window.open
      window.open(url, '_blank');
    }
  } else {
    window.open(url, '_blank');
  }
}

interface UpdateSettingsResponse {
  success: boolean;
  message?: string;
}

/**
 * Fetch miner data from the miner's IP address
 */
export async function getMinerData(ip: string): Promise<MinerInfo> {
  if (isTauri()) {
    try {
      return await invoke<MinerInfo>('get_miner_data', { ip });
    } catch (error) {
      throw new Error(typeof error === 'string' ? error : 'Failed to fetch miner data');
    }
  } else {
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

/**
 * Open the analytics window
 */
export async function openAnalyticsWindow(): Promise<void> {
  if (isTauri()) {
    try {
      await invoke('open_analytics_window');
    } catch (error) {
      console.error('[Tauri API] Failed to open analytics window:', error);
    }
  }
}

/**
 * Close the analytics window
 */
export async function closeAnalyticsWindow(): Promise<void> {
  if (isTauri()) {
    try {
      await invoke('close_analytics_window');
    } catch (error) {
      console.error('[Tauri API] Failed to close analytics window:', error);
    }
  }
}

/**
 * Analytics data payload for inter-window communication
 */
export interface AnalyticsDataPayload {
  miners: MinerConfig[];
  minerStates: Record<string, MinerState>;
  electricityRate: number;
}

/**
 * Send analytics data to the analytics window
 */
export async function sendAnalyticsData(data: AnalyticsDataPayload): Promise<void> {
  if (isTauri()) {
    try {
      await emit('analytics-data-update', data);
    } catch (error) {
      console.error('[Tauri API] Failed to send analytics data:', error);
    }
  }
}

/**
 * Listen for analytics data requests from the analytics window
 */
export async function listenForAnalyticsRequests(
  callback: () => void
): Promise<UnlistenFn | undefined> {
  if (isTauri()) {
    try {
      return await listen('analytics-request-data', callback);
    } catch (error) {
      console.error('[Tauri API] Failed to listen for analytics requests:', error);
    }
  }
  return undefined;
}

/**
 * Listen for analytics window close event
 */
export async function listenForAnalyticsClose(
  callback: () => void
): Promise<UnlistenFn | undefined> {
  if (isTauri()) {
    try {
      return await listen('analytics-window-closed', callback);
    } catch (error) {
      console.error('[Tauri API] Failed to listen for analytics close:', error);
    }
  }
  return undefined;
}

/**
 * Open the settings window
 */
export async function openSettingsWindow(): Promise<void> {
  if (isTauri()) {
    try {
      await invoke('open_settings_window');
    } catch (error) {
      console.error('[Tauri API] Failed to open settings window:', error);
    }
  }
}

/**
 * Close the settings window
 */
export async function closeSettingsWindow(): Promise<void> {
  if (isTauri()) {
    try {
      await invoke('close_settings_window');
    } catch (error) {
      console.error('[Tauri API] Failed to close settings window:', error);
    }
  }
}

/**
 * Listen for settings updates from the settings window
 */
export async function listenForSettingsUpdates(
  callback: (settings: unknown) => void
): Promise<UnlistenFn | undefined> {
  if (isTauri()) {
    try {
      return await listen('settings-updated', (event) => {
        callback(event.payload);
      });
    } catch (error) {
      console.error('[Tauri API] Failed to listen for settings updates:', error);
    }
  }
  return undefined;
}

/**
 * Open the tools window
 */
export async function openToolsWindow(): Promise<void> {
  if (isTauri()) {
    try {
      await invoke('open_tools_window');
    } catch (error) {
      console.error('[Tauri API] Failed to open tools window:', error);
    }
  }
}

/**
 * Open the benchmark window with larger dimensions
 * @param minerIp Optional miner IP to pre-select
 */
export async function openBenchmarkWindow(minerIp?: string): Promise<void> {
  if (isTauri()) {
    try {
      await invoke('open_benchmark_window', { minerIp });
    } catch (error) {
      console.error('[Tauri API] Failed to open benchmark window:', error);
    }
  }
}

/**
 * Tools data payload for inter-window communication
 */
export interface ToolsDataPayload {
  miners: MinerConfig[];
  minerStates: Record<string, MinerState>;
}

/**
 * Send tools data to the tools window
 */
export async function sendToolsData(data: ToolsDataPayload): Promise<void> {
  if (isTauri()) {
    try {
      await emit('tools-data-update', data);
    } catch (error) {
      console.error('[Tauri API] Failed to send tools data:', error);
    }
  }
}

/**
 * Listen for tools data requests from the tools window
 */
export async function listenForToolsRequests(
  callback: () => void
): Promise<UnlistenFn | undefined> {
  if (isTauri()) {
    try {
      return await listen('tools-request-data', callback);
    } catch (error) {
      console.error('[Tauri API] Failed to listen for tools requests:', error);
    }
  }
  return undefined;
}

/**
 * Listen for restore backup requests from the tools window
 */
export async function listenForRestoreBackup(
  callback: (miners: MinerConfig[]) => void
): Promise<UnlistenFn | undefined> {
  if (isTauri()) {
    try {
      return await listen<MinerConfig[]>('tools-restore-backup', (event) => {
        callback(event.payload);
      });
    } catch (error) {
      console.error('[Tauri API] Failed to listen for restore backup:', error);
    }
  }
  return undefined;
}

// ============================================
// Network Discovery
// ============================================

/**
 * Discovered miner from network scan
 */
export interface DiscoveredMiner {
  ip: string;
  hostname: string | null;
  version: string | null;
  model: string | null;
}

/**
 * Get the local network subnet (e.g., "192.168.1")
 */
export async function getLocalSubnet(): Promise<string | null> {
  if (isTauri()) {
    try {
      return await invoke<string>('get_local_subnet');
    } catch (error) {
      console.error('[Tauri API] Failed to get local subnet:', error);
      return null;
    }
  }
  return null;
}

/**
 * Scan the network for miners
 * @param subnet - The subnet to scan (e.g., "192.168.1")
 * @param start - Starting IP address (last octet, default 1)
 * @param end - Ending IP address (last octet, default 254)
 */
export async function scanNetwork(
  subnet: string,
  start: number = 1,
  end: number = 254
): Promise<DiscoveredMiner[]> {
  if (isTauri()) {
    try {
      return await invoke<DiscoveredMiner[]>('scan_network', {
        subnet,
        start,
        end,
      });
    } catch (error) {
      console.error('[Tauri API] Failed to scan network:', error);
      return [];
    }
  }
  return [];
}

// ============================================
// System Notifications
// ============================================

let notificationPermissionChecked = false;
let hasNotificationPermission = false;

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    let permission = await isPermissionGranted();
    if (!permission) {
      const result = await requestPermission();
      permission = result === 'granted';
    }
    hasNotificationPermission = permission;
    notificationPermissionChecked = true;
    return permission;
  } catch (error) {
    console.error('[Tauri API] Failed to request notification permission:', error);
    return false;
  }
}

/**
 * Show a system notification
 * @param title - The notification title
 * @param body - The notification body text
 */
export async function showSystemNotification(
  title: string,
  body: string
): Promise<void> {
  if (!isTauri()) return;

  try {
    // Check permission if not already checked
    if (!notificationPermissionChecked) {
      await requestNotificationPermission();
    }

    if (!hasNotificationPermission) {
      console.log('[Tauri API] No notification permission');
      return;
    }

    sendNotification({ title, body });
  } catch (error) {
    console.error('[Tauri API] Failed to show notification:', error);
  }
}
