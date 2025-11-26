/**
 * Device specifications for miners that don't report expectedHashrate.
 * These values are used to estimate efficiency when the device doesn't provide its own.
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
  // Magic Miner devices
  {
    model: /Magic[- ]?Miner[- ]?BG02/i,
    expectedHashrate: 6800,          // Magic Miner BG02 ~6.8 TH/s
    description: 'Magic Miner BG02'
  },
  {
    model: /Magic[- ]?Miner[- ]?BG01/i,
    expectedHashrate: 5500,          // Magic Miner BG01 ~5.5 TH/s
    description: 'Magic Miner BG01'
  },
  {
    model: /Magic[- ]?Miner/i,
    expectedHashrate: 5500,          // Generic Magic Miner fallback
    description: 'Magic Miner'
  },

  // NerdAxe devices
  {
    model: /NerdAxe[- ]?Q\+\+/i,
    expectedHashrate: 5000,          // NerdAxeQ++ ~5 TH/s
    description: 'NerdAxeQ++'
  },
  {
    model: /NerdAxe/i,
    expectedHashrate: 500,           // Standard NerdAxe ~500 GH/s
    description: 'NerdAxe'
  },

  // Canaan devices
  {
    model: /Canaan[- ]?Nano[- ]?S/i,
    expectedHashrate: 8000,          // Canaan Nano S ~8 TH/s
    description: 'Canaan Nano S'
  },
  {
    model: /Nano[- ]?S/i,
    expectedHashrate: 8000,          // Canaan Nano S (short name)
    description: 'Canaan Nano S'
  },

  // Piaxe devices
  {
    model: /Piaxe/i,
    expectedHashrate: 500,           // Piaxe ~500 GH/s
    description: 'Piaxe'
  },

  // Jade devices
  {
    model: /Jade/i,
    expectedHashrate: 500,           // Jade ~500 GH/s
    description: 'Jade Miner'
  },

  // Lucky Miner devices
  {
    model: /Lucky[- ]?Miner/i,
    expectedHashrate: 500,           // Lucky Miner ~500 GH/s
    description: 'Lucky Miner'
  },

  // BitDSK devices (BM1397 chip)
  {
    model: /BitDSK[- ]?N5[- ]?Rex/i,
    expectedHashrate: 300,           // BitDSK N5.Rex ~300 GH/s (BM1397)
    description: 'BitDSK N5.Rex'
  },
  {
    model: /N5[- ]?Rex/i,
    expectedHashrate: 300,           // N5.Rex ~300 GH/s (BM1397)
    description: 'BitDSK N5.Rex'
  },
  {
    model: /BitDSK/i,
    expectedHashrate: 300,           // Generic BitDSK fallback
    description: 'BitDSK'
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
