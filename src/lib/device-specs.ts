/**
 * Device specifications for miners that don't report expectedHashrate.
 * These values are used to estimate efficiency when the device doesn't provide its own.
 *
 * Data sourced from bitaxe_benchmark_records.xlsx and manufacturer specs.
 *
 * All hashrate values are in GH/s.
 */

export interface DeviceSpecification {
  model: string | RegExp;           // Model identifier (exact string or regex pattern)
  expectedHashrate: number;         // Expected max hashrate in GH/s
  description: string;              // Human-readable name
}

/**
 * Known device specifications.
 * Add new devices here as they become available.
 *
 * Note: Regex patterns are case-insensitive and match partial strings.
 * Order matters - more specific patterns should come before generic ones.
 */
export const DEVICE_SPECIFICATIONS: DeviceSpecification[] = [
  // === Bitaxe Gamma (BM1370) ===
  {
    model: /Gamma[- ]?60[12]/i,
    expectedHashrate: 1150,          // Bitaxe Gamma 601/602 ~1.07-1.2 TH/s
    description: 'Bitaxe Gamma 601/602'
  },
  {
    model: /BM1370/i,
    expectedHashrate: 1100,          // BM1370 chip ~1.1 TH/s stock
    description: 'BM1370 ASIC'
  },

  // === Bitaxe Supra (BM1368) ===
  {
    model: /Supra[- ]?Hex|Hex[- ]?701/i,
    expectedHashrate: 4000,          // Supra Hex 701 ~3.8-4.2 TH/s
    description: 'Bitaxe Supra Hex 701'
  },
  {
    model: /Supra[- ]?401/i,
    expectedHashrate: 650,           // Supra 401 ~600-700 GH/s
    description: 'Bitaxe Supra 401'
  },
  {
    model: /BM1368/i,
    expectedHashrate: 650,           // BM1368 chip ~650 GH/s stock
    description: 'BM1368 ASIC'
  },

  // === Bitaxe Ultra (BM1366) ===
  {
    model: /Ultra[- ]?Hex/i,
    expectedHashrate: 3000,          // Ultra Hex ~3+ TH/s
    description: 'Bitaxe Ultra Hex'
  },
  {
    model: /Ultra[- ]?204/i,
    expectedHashrate: 525,           // Ultra 204 ~500-550 GH/s
    description: 'Bitaxe Ultra 204'
  },
  {
    model: /BM1366/i,
    expectedHashrate: 525,           // BM1366 chip ~525 GH/s stock
    description: 'BM1366 ASIC'
  },

  // === NerdQaxe++ (4x BM1370) ===
  {
    model: /NerdQ?[Aa]xe.*[Rr]ev\s*6/i,
    expectedHashrate: 6000,          // NerdQaxe++ Rev6 ~6 TH/s stock
    description: 'NerdQaxe++ Rev6'
  },
  {
    model: /NerdQ?[Aa]xe\+\+|Nerd.*Q.*\+\+/i,
    expectedHashrate: 4800,          // NerdQaxe++ ~4.8 TH/s stock
    description: 'NerdQaxe++'
  },
  {
    model: /NerdAxe/i,
    expectedHashrate: 500,           // Standard NerdAxe ~500 GH/s
    description: 'NerdAxe'
  },

  // === MagicMiner devices ===
  {
    model: /Magic[- ]?Miner[- ]?BG02|BG02/i,
    expectedHashrate: 7000,          // MagicMiner BG02 ~7.0 TH/s (tested 7.26)
    description: 'MagicMiner BG02'
  },
  {
    model: /Magic[- ]?Miner[- ]?BG01|BG01/i,
    expectedHashrate: 4500,          // MagicMiner BG01 ~4.5 TH/s
    description: 'MagicMiner BG01'
  },
  {
    model: /Magic[- ]?Miner/i,
    expectedHashrate: 4500,          // Generic MagicMiner fallback
    description: 'MagicMiner'
  },

  // === Lucky Miner devices ===
  {
    model: /Lucky[- ]?Miner[- ]?LV08|LV08/i,
    expectedHashrate: 4500,          // Lucky Miner LV08 ~4.5 TH/s
    description: 'Lucky Miner LV08'
  },
  {
    model: /Lucky[- ]?Miner[- ]?LV06|LV06/i,
    expectedHashrate: 500,           // Lucky Miner LV06 ~500 GH/s
    description: 'Lucky Miner LV06'
  },
  {
    model: /Lucky[- ]?Miner/i,
    expectedHashrate: 500,           // Generic Lucky Miner fallback
    description: 'Lucky Miner'
  },

  // === Avalon Nano devices (Canaan) ===
  {
    model: /Avalon[- ]?Nano[- ]?3S|Nano[- ]?3S/i,
    expectedHashrate: 6000,          // Avalon Nano 3S ~6 TH/s
    description: 'Avalon Nano 3S'
  },
  {
    model: /Avalon[- ]?Nano[- ]?3|Nano[- ]?3/i,
    expectedHashrate: 4000,          // Avalon Nano 3 ~4 TH/s
    description: 'Avalon Nano 3'
  },
  {
    model: /Avalon[- ]?Mini[- ]?3/i,
    expectedHashrate: 37500,         // Avalon Mini 3 ~37.5 TH/s
    description: 'Avalon Mini 3'
  },
  {
    model: /Avalon[- ]?Q/i,
    expectedHashrate: 90000,         // Avalon Q ~90 TH/s
    description: 'Avalon Q'
  },
  {
    model: /A1566|Avalon/i,
    expectedHashrate: 4000,          // Generic Avalon/A1566 fallback
    description: 'Canaan Avalon'
  },

  // === Piaxe devices ===
  {
    model: /Piaxe/i,
    expectedHashrate: 500,           // Piaxe ~500 GH/s
    description: 'Piaxe'
  },

  // === Jade devices ===
  {
    model: /Jade/i,
    expectedHashrate: 500,           // Jade ~500 GH/s
    description: 'Jade Miner'
  },

  // === BitDSK devices (BM1397 chip) ===
  {
    model: /BitDSK[- ]?N5[- ]?Rex|N5[- ]?Rex/i,
    expectedHashrate: 300,           // BitDSK N5.Rex ~300 GH/s (BM1397)
    description: 'BitDSK N5.Rex'
  },
  {
    model: /BM1397|BitDSK/i,
    expectedHashrate: 300,           // BM1397 chip ~300 GH/s
    description: 'BM1397 ASIC'
  },
];

/**
 * Look up device specification by ASIC model string.
 * Returns null if no matching specification is found.
 */
export function getDeviceSpecification(asicModel?: string): DeviceSpecification | null {
  if (!asicModel) return null;

  return DEVICE_SPECIFICATIONS.find(spec => {
    if (typeof spec.model === 'string') {
      return asicModel.toLowerCase() === spec.model.toLowerCase();
    }
    return spec.model.test(asicModel);
  }) || null;
}

/**
 * Get expected hashrate for a device, returning null if unknown.
 */
export function getExpectedHashrate(asicModel?: string): number | null {
  const spec = getDeviceSpecification(asicModel);
  return spec?.expectedHashrate ?? null;
}
