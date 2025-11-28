/**
 * Utility functions for exporting miner data
 */

import type { MinerConfig, MinerState, MinerInfo } from '@/lib/types';

export interface ExportableMinerData {
  name: string;
  ip: string;
  hostname: string | null;
  asicModel: string | null;
  hashrate: number | null;
  hashrateUnit: string;
  temperature: number | null;
  vrTemperature: number | null;
  frequency: number | null;
  voltage: number | null;
  power: number | null;
  efficiency: string | null;
  sharesAccepted: number | null;
  sharesRejected: number | null;
  bestDiff: string | null;
  bestSessionDiff: string | null;
  uptimeSeconds: number | null;
  uptimeFormatted: string;
  poolUrl: string | null;
  poolUser: string | null;
  version: string | null;
  status: 'online' | 'offline' | 'unknown';
}

function formatUptime(seconds: number | null | undefined): string {
  if (!seconds) return 'N/A';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function calculateEfficiency(info: MinerInfo | null): string | null {
  if (!info?.hashRate) return null;
  const expectedHashrate = info.expectedHashrate || info.estimatedExpectedHashrate;
  if (!expectedHashrate || expectedHashrate <= 0) return null;
  return ((info.hashRate / expectedHashrate) * 100).toFixed(1) + '%';
}

function getHashrateDisplay(hashrateGhs: number | null): { value: number | null; unit: string } {
  if (hashrateGhs === null || hashrateGhs === undefined) {
    return { value: null, unit: 'GH/s' };
  }
  if (hashrateGhs >= 1000) {
    return { value: parseFloat((hashrateGhs / 1000).toFixed(2)), unit: 'TH/s' };
  }
  return { value: hashrateGhs, unit: 'GH/s' };
}

export function prepareMinerDataForExport(
  miners: MinerConfig[],
  minerStates: Record<string, MinerState>
): ExportableMinerData[] {
  return miners.map(miner => {
    const state = minerStates[miner.ip];
    const info = state?.info;
    const hashrateDisplay = getHashrateDisplay(info?.hashRate ?? null);

    let status: 'online' | 'offline' | 'unknown' = 'unknown';
    if (state?.error) {
      status = 'offline';
    } else if (info) {
      status = 'online';
    }

    return {
      name: miner.name || info?.hostname || miner.ip,
      ip: miner.ip,
      hostname: info?.hostname ?? null,
      asicModel: info?.ASICModel ?? null,
      hashrate: hashrateDisplay.value,
      hashrateUnit: hashrateDisplay.unit,
      temperature: info?.temp ?? null,
      vrTemperature: info?.vrTemp ?? null,
      frequency: info?.frequency ?? null,
      voltage: info?.coreVoltage ?? null,
      power: info?.power ?? null,
      efficiency: calculateEfficiency(info ?? null),
      sharesAccepted: info?.sharesAccepted ?? null,
      sharesRejected: info?.sharesRejected ?? null,
      bestDiff: info?.bestDiff ?? null,
      bestSessionDiff: info?.bestSessionDiff ?? null,
      uptimeSeconds: info?.uptimeSeconds ?? null,
      uptimeFormatted: formatUptime(info?.uptimeSeconds),
      poolUrl: info?.stratumURL ?? null,
      poolUser: info?.stratumUser ?? null,
      version: info?.version ?? null,
      status,
    };
  });
}

export function convertToCSV(data: ExportableMinerData[]): string {
  if (data.length === 0) return '';

  const headers = [
    'Name',
    'IP',
    'Hostname',
    'ASIC Model',
    'Hashrate',
    'Unit',
    'Temp (°C)',
    'VR Temp (°C)',
    'Frequency (MHz)',
    'Voltage (mV)',
    'Power (W)',
    'Efficiency',
    'Shares Accepted',
    'Shares Rejected',
    'Best Diff',
    'Session Best Diff',
    'Uptime',
    'Pool URL',
    'Pool User',
    'Version',
    'Status',
  ];

  const rows = data.map(row => [
    row.name,
    row.ip,
    row.hostname ?? '',
    row.asicModel ?? '',
    row.hashrate?.toString() ?? '',
    row.hashrateUnit,
    row.temperature?.toString() ?? '',
    row.vrTemperature?.toString() ?? '',
    row.frequency?.toString() ?? '',
    row.voltage?.toString() ?? '',
    row.power?.toString() ?? '',
    row.efficiency ?? '',
    row.sharesAccepted?.toString() ?? '',
    row.sharesRejected?.toString() ?? '',
    row.bestDiff ?? '',
    row.bestSessionDiff ?? '',
    row.uptimeFormatted,
    row.poolUrl ?? '',
    row.poolUser ?? '',
    row.version ?? '',
    row.status,
  ]);

  // Escape CSV values
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n');

  return csvContent;
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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

export function generateExportFilename(prefix: string, extension: string): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `${prefix}_${dateStr}_${timeStr}.${extension}`;
}
