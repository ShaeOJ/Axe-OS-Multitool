/**
 * Utility functions for backup and restore of miner configurations
 */

import type { MinerConfig } from '@/lib/types';

export interface BackupData {
  version: string;
  exportedAt: string;
  appVersion: string;
  miners: MinerConfig[];
}

const BACKUP_VERSION = '1.0';
const APP_VERSION = '1.2.0';

export function createBackup(miners: MinerConfig[]): BackupData {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    miners: miners,
  };
}

export function downloadBackup(backup: BackupData, filename: string): void {
  const jsonContent = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export interface RestoreResult {
  success: boolean;
  miners?: MinerConfig[];
  error?: string;
  warnings?: string[];
}

export function validateBackupFile(content: string): RestoreResult {
  const warnings: string[] = [];

  try {
    const data = JSON.parse(content);

    // Check if it's a valid backup format
    if (!data.miners || !Array.isArray(data.miners)) {
      return {
        success: false,
        error: 'Invalid backup file format. Missing miners array.',
      };
    }

    // Check backup version
    if (data.version && data.version !== BACKUP_VERSION) {
      warnings.push(`Backup was created with a different version (${data.version}). Some settings may not be compatible.`);
    }

    // Validate each miner config
    const validMiners: MinerConfig[] = [];
    for (let i = 0; i < data.miners.length; i++) {
      const miner = data.miners[i];

      // Required field: IP
      if (!miner.ip || typeof miner.ip !== 'string') {
        warnings.push(`Miner at index ${i} is missing a valid IP address and was skipped.`);
        continue;
      }

      // Validate IP format (basic check)
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipPattern.test(miner.ip)) {
        warnings.push(`Miner "${miner.ip}" has an invalid IP format and was skipped.`);
        continue;
      }

      // Ensure required fields have defaults
      const validMiner: MinerConfig = {
        ip: miner.ip,
        name: miner.name || '',
        accentColor: miner.accentColor || '#f59e0b',
        tunerSettings: miner.tunerSettings || {
          enabled: false,
          targetTemp: 65,
          vrTargetTemp: 75,
          minFreq: 400,
          maxFreq: 575,
          minVolt: 1100,
          maxVolt: 1300,
          tempFreqStepDown: 25,
          tempVoltStepDown: 10,
          tempFreqStepUp: 10,
          tempVoltStepUp: 5,
          vrTempFreqStepDown: 25,
          vrTempVoltStepDown: 10,
          flatlineDetectionEnabled: true,
          flatlineHashrateRepeatCount: 5,
          autoOptimizeEnabled: false,
          autoOptimizeTriggerCycles: 10,
          efficiencyTolerancePercent: 5,
          verificationWaitSeconds: 60,
        },
      };

      validMiners.push(validMiner);
    }

    if (validMiners.length === 0) {
      return {
        success: false,
        error: 'No valid miners found in the backup file.',
      };
    }

    return {
      success: true,
      miners: validMiners,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch {
    return {
      success: false,
      error: 'Failed to parse backup file. Please ensure it is a valid JSON file.',
    };
  }
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
