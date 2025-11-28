/**
 * ASIC Chip Tuning Presets
 *
 * Based on community benchmarks and manufacturer specifications.
 * These presets define safe operating ranges for each ASIC chip type.
 *
 * Data sources:
 * - bitaxe_benchmark_records.xlsx (community benchmarks)
 * - Manufacturer specifications
 * - plebbase.com, Solo Satoshi, D-Central, Power Mining
 *
 * WARNING: Overclocking beyond these limits may void warranty,
 * increase heat/power, and damage hardware permanently.
 */

import type { AutoTunerSettings } from './types';

/**
 * Tuning capability level for a device
 */
export type TuningCapability =
  | 'full'           // Full frequency/voltage control
  | 'limited'        // Some control but with restrictions
  | 'closed'         // Closed firmware, no tuning support
  | 'unknown';       // Unknown device, use conservative defaults

/**
 * ASIC chip profile with safe operating parameters
 */
export interface ASICProfile {
  // Identification
  chipModel: string;           // e.g., "BM1370", "BM1368", "BM1366"
  chipPattern: RegExp;         // Pattern to match ASICModel string
  displayName: string;         // Human-readable name

  // Tuning capability
  tuningCapability: TuningCapability;
  tuningWarning?: string;      // Warning message for limited/closed firmware

  // Stock specifications (reference)
  stockFrequency: number;      // MHz
  stockVoltage: number;        // mV
  stockHashrateGHs: number;    // Expected GH/s at stock
  stockPowerW: number;         // Watts at stock

  // Safe tuning ranges
  minFrequency: number;        // MHz - minimum safe frequency
  maxFrequency: number;        // MHz - maximum safe frequency for sustained operation
  extremeMaxFrequency?: number; // MHz - absolute max (requires extreme cooling)

  minVoltage: number;          // mV - minimum voltage
  maxVoltage: number;          // mV - maximum safe voltage for sustained operation
  extremeMaxVoltage?: number;  // mV - absolute max (high risk)

  // Temperature targets
  targetTemp: number;          // Optimal core temp target
  maxSafeTemp: number;         // Emergency threshold
  vrTargetTemp: number;        // VR/VRM temp target
  maxSafeVrTemp: number;       // VR emergency threshold

  // Tuning step sizes (chip-specific)
  freqStepUp: number;          // MHz increment
  freqStepDown: number;        // MHz decrement
  voltStepUp: number;          // mV increment
  voltStepDown: number;        // mV decrement

  // Efficiency info
  typicalEfficiencyJTH: number; // J/TH at stock

  // Notes
  notes?: string;
}

/**
 * Device-specific overrides (for multi-chip or special devices)
 */
export interface DeviceProfile {
  devicePattern: RegExp;       // Pattern to match hostname or device name
  displayName: string;
  chipCount: number;
  tuningCapability: TuningCapability;
  tuningWarning?: string;

  // Override settings (if different from chip defaults)
  overrides?: Partial<Pick<ASICProfile,
    'minFrequency' | 'maxFrequency' | 'minVoltage' | 'maxVoltage' |
    'targetTemp' | 'vrTargetTemp' | 'freqStepUp' | 'voltStepUp'
  >>;

  notes?: string;
}

/**
 * ASIC Chip Profiles Database
 * Ordered by preference (more specific patterns first)
 */
export const ASIC_PROFILES: ASICProfile[] = [
  // === BM1370 (Gamma, NerdQaxe++) - Most efficient chip ===
  {
    chipModel: 'BM1370',
    chipPattern: /BM1370/i,
    displayName: 'Bitmain BM1370',
    tuningCapability: 'full',

    // Stock specs (Gamma 601/602)
    stockFrequency: 525,
    stockVoltage: 1150,
    stockHashrateGHs: 1100,      // ~1.07-1.2 TH/s
    stockPowerW: 18,

    // Safe tuning range
    minFrequency: 400,
    maxFrequency: 800,           // Dark Horse heatsink level
    extremeMaxFrequency: 1000,   // Requires custom cooling/immersion

    minVoltage: 1050,
    maxVoltage: 1300,
    extremeMaxVoltage: 1450,     // Extreme risk

    // Temperature targets
    targetTemp: 62,
    maxSafeTemp: 72,
    vrTargetTemp: 72,
    maxSafeVrTemp: 85,

    // Tuning steps
    freqStepUp: 25,
    freqStepDown: 10,
    voltStepUp: 25,
    voltStepDown: 10,

    typicalEfficiencyJTH: 16.8,

    notes: 'Most efficient chip. Can reach 2+ TH/s with extreme cooling but efficiency degrades significantly.',
  },

  // === BM1368 (Supra) - Good balance ===
  {
    chipModel: 'BM1368',
    chipPattern: /BM1368/i,
    displayName: 'Bitmain BM1368',
    tuningCapability: 'full',

    // Stock specs (Supra 401)
    stockFrequency: 490,
    stockVoltage: 1166,
    stockHashrateGHs: 650,       // ~600-700 GH/s
    stockPowerW: 14,

    // Safe tuning range
    minFrequency: 400,
    maxFrequency: 700,           // Ice Tower level
    extremeMaxFrequency: 1000,   // Extreme OC - plebbase tests

    minVoltage: 1050,
    maxVoltage: 1350,
    extremeMaxVoltage: 1520,     // OC'axe record

    // Temperature targets
    targetTemp: 60,
    maxSafeTemp: 70,
    vrTargetTemp: 70,
    maxSafeVrTemp: 85,

    // Tuning steps
    freqStepUp: 25,
    freqStepDown: 10,
    voltStepUp: 25,
    voltStepDown: 10,

    typicalEfficiencyJTH: 23.3,

    notes: 'Older chip but reliable. Good for learning overclocking.',
  },

  // === BM1366 (Ultra, Lucky Miner) - Entry level ===
  {
    chipModel: 'BM1366',
    chipPattern: /BM1366/i,
    displayName: 'Bitmain BM1366',
    tuningCapability: 'full',

    // Stock specs (Ultra 204)
    stockFrequency: 485,
    stockVoltage: 1150,
    stockHashrateGHs: 525,       // ~500-550 GH/s
    stockPowerW: 13,

    // Safe tuning range - more conservative
    minFrequency: 400,
    maxFrequency: 600,           // Community-tested limit
    extremeMaxFrequency: 700,    // Risky

    minVoltage: 1050,
    maxVoltage: 1300,            // Lucky Miner already ships at 1300
    extremeMaxVoltage: 1350,

    // Temperature targets
    targetTemp: 58,
    maxSafeTemp: 68,
    vrTargetTemp: 68,
    maxSafeVrTemp: 82,

    // Tuning steps - smaller for this chip
    freqStepUp: 15,
    freqStepDown: 10,
    voltStepUp: 25,
    voltStepDown: 10,

    typicalEfficiencyJTH: 24,

    notes: 'Entry level chip. Lucky Miner LV06/LV08 use this at aggressive stock settings.',
  },

  // === A1566 (Avalon Nano) - Closed firmware ===
  {
    chipModel: 'A1566',
    chipPattern: /A1566|Avalon/i,
    displayName: 'Canaan A1566',
    tuningCapability: 'closed',
    tuningWarning: 'Avalon devices have closed firmware. Overclocking is not supported. Use the Avalon Remote app for power mode settings.',

    // Reference specs (Nano 3S high mode)
    stockFrequency: 0,           // Not exposed
    stockVoltage: 0,             // Not exposed
    stockHashrateGHs: 6000,      // 6 TH/s in high mode
    stockPowerW: 140,

    // No tuning - set to stock values
    minFrequency: 0,
    maxFrequency: 0,
    minVoltage: 0,
    maxVoltage: 0,

    // Temperature targets (monitoring only)
    targetTemp: 60,
    maxSafeTemp: 75,
    vrTargetTemp: 70,
    maxSafeVrTemp: 85,

    // No tuning steps
    freqStepUp: 0,
    freqStepDown: 0,
    voltStepUp: 0,
    voltStepDown: 0,

    typicalEfficiencyJTH: 23.3,

    notes: 'Dual-purpose heater/miner. Has Low/Medium/High power modes via app.',
  },
];

/**
 * Device-specific profiles (multi-chip devices, special cases)
 */
export const DEVICE_PROFILES: DeviceProfile[] = [
  // === NerdQaxe++ (4x BM1370) ===
  {
    devicePattern: /NerdQ?[Aa]xe\+\+|Nerd.*Q.*\+\+/i,
    displayName: 'NerdQaxe++',
    chipCount: 4,
    tuningCapability: 'full',
    overrides: {
      // NerdQaxe++ ships at higher stock settings
      minFrequency: 500,
      maxFrequency: 750,         // RSP-350-12 PSU level
      minVoltage: 1050,
      maxVoltage: 1250,          // Higher voltages need upgraded PSU
      targetTemp: 62,
      vrTargetTemp: 70,
    },
    notes: 'Stock 8A fuse fails above ~100W. Upgrade to 12A/15A for OC. Mean Well LRS-150-12 or RSP-350-12 recommended.',
  },

  // === NerdQaxe++ Rev 6 ===
  {
    devicePattern: /NerdQ?[Aa]xe.*[Rr]ev\s*6/i,
    displayName: 'NerdQaxe++ Rev6',
    chipCount: 4,
    tuningCapability: 'full',
    overrides: {
      minFrequency: 550,
      maxFrequency: 800,
      maxVoltage: 1300,
      targetTemp: 64,
    },
    notes: 'Latest revision with improved thermals. Can reach ~6 TH/s stock, ~10 TH/s extreme.',
  },

  // === Bitaxe Ultra Hex (6x BM1366) ===
  {
    devicePattern: /Ultra.*Hex|Hex.*Ultra/i,
    displayName: 'Bitaxe Ultra Hex',
    chipCount: 6,
    tuningCapability: 'full',
    overrides: {
      maxFrequency: 550,         // More conservative for 6-chip
      maxVoltage: 1250,
      targetTemp: 58,
    },
    notes: '6-chip configuration. Good value per TH.',
  },

  // === Bitaxe Supra Hex 701 (6x BM1368) ===
  {
    devicePattern: /Supra.*Hex|Hex.*Supra|701/i,
    displayName: 'Bitaxe Supra Hex 701',
    chipCount: 6,
    tuningCapability: 'full',
    overrides: {
      minFrequency: 450,
      maxFrequency: 575,         // Maximum mode from benchmark
      minVoltage: 1100,
      maxVoltage: 1300,
      targetTemp: 60,
    },
    notes: 'Has Low/Medium/High/Maximum modes. Maximum (575MHz/1300mV) draws 148W.',
  },

  // === MagicMiner BG01 (4x BM1366) ===
  {
    devicePattern: /Magic\s*Miner.*BG01|BG01/i,
    displayName: 'MagicMiner BG01',
    chipCount: 4,
    tuningCapability: 'limited',
    tuningWarning: 'MagicMiner devices have limited tuning support. GPU-style PCIe form factor with plug-and-play design.',
    overrides: {
      maxFrequency: 550,
      maxVoltage: 1200,
    },
    notes: 'Entry-level GPU-style miner. ~4.5 TH/s at 120W.',
  },

  // === MagicMiner BG02 (6x BM1368) ===
  {
    devicePattern: /Magic\s*Miner.*BG02|BG02/i,
    displayName: 'MagicMiner BG02',
    chipCount: 6,
    tuningCapability: 'limited',
    tuningWarning: 'MagicMiner devices have limited tuning support. GPU-style PCIe form factor.',
    overrides: {
      maxFrequency: 550,
      maxVoltage: 1200,
    },
    notes: 'Best TH/$ value. Tested at 7.26 TH/s exceeding 7.0 TH/s spec.',
  },

  // === Lucky Miner LV06 ===
  {
    devicePattern: /Lucky.*LV06|LV06/i,
    displayName: 'Lucky Miner LV06',
    chipCount: 1,
    tuningCapability: 'full',
    overrides: {
      // Already ships at aggressive settings
      minFrequency: 500,
      maxFrequency: 600,         // Conservative - manufacturer doesn't recommend OC
      minVoltage: 1200,
      maxVoltage: 1300,          // Already at max stock
    },
    notes: 'Budget lottery miner. Ships at 575MHz/1300mV. Manufacturer advises against OC.',
  },

  // === Lucky Miner LV08 ===
  {
    devicePattern: /Lucky.*LV08|LV08/i,
    displayName: 'Lucky Miner LV08',
    chipCount: 4,               // Multi-chip
    tuningCapability: 'limited',
    tuningWarning: 'Manufacturer does not recommend overclocking LV08. May shorten device lifespan.',
    overrides: {
      minFrequency: 550,
      maxFrequency: 600,         // Max safe per manufacturer
      maxVoltage: 1300,
    },
    notes: 'Compact lottery miner. 4.5 TH/s stock, peaks of ~6 TH/s in testing but OC not recommended.',
  },

  // === Avalon Nano 3 ===
  {
    devicePattern: /Avalon.*Nano\s*3(?!S)|Nano\s*3(?!S)/i,
    displayName: 'Avalon Nano 3',
    chipCount: 10,
    tuningCapability: 'closed',
    tuningWarning: 'Avalon Nano 3 has closed firmware. Use the Avalon Remote app for Low/Medium/High power modes.',
    notes: 'Dual heater/miner. 4 TH/s at 140W (high mode). Generates ~50°C warm air.',
  },

  // === Avalon Nano 3S ===
  {
    devicePattern: /Avalon.*Nano\s*3S|Nano\s*3S/i,
    displayName: 'Avalon Nano 3S',
    chipCount: 10,
    tuningCapability: 'closed',
    tuningWarning: 'Avalon Nano 3S has closed firmware. Use the Avalon Remote app for power mode settings.',
    notes: '50% faster than Nano 3. 6 TH/s at 140W. Very quiet (~33 dB).',
  },
];

/**
 * Get ASIC profile by chip model string
 */
export function getASICProfile(asicModel?: string): ASICProfile | null {
  if (!asicModel) return null;

  return ASIC_PROFILES.find(profile => profile.chipPattern.test(asicModel)) || null;
}

/**
 * Get device profile by hostname or device identifier
 */
export function getDeviceProfile(hostname?: string, asicModel?: string): DeviceProfile | null {
  if (!hostname && !asicModel) return null;

  const searchString = `${hostname || ''} ${asicModel || ''}`;
  return DEVICE_PROFILES.find(profile => profile.devicePattern.test(searchString)) || null;
}

/**
 * Get combined tuning preset for a device
 * Merges chip defaults with device-specific overrides
 */
export function getTuningPreset(asicModel?: string, hostname?: string): Partial<AutoTunerSettings> & {
  capability: TuningCapability;
  warning?: string;
  profileName: string;
} {
  const chipProfile = getASICProfile(asicModel);
  const deviceProfile = getDeviceProfile(hostname, asicModel);

  // Start with chip defaults or conservative fallback
  const baseSettings = chipProfile || {
    targetTemp: 60,
    vrTargetTemp: 70,
    minFrequency: 400,
    maxFrequency: 650,
    minVoltage: 1050,
    maxVoltage: 1250,
    freqStepUp: 10,
    freqStepDown: 5,
    voltStepUp: 10,
    voltStepDown: 5,
  };

  // Apply device-specific overrides
  const overrides = deviceProfile?.overrides || {};

  // Determine capability and warning
  const capability = deviceProfile?.tuningCapability || chipProfile?.tuningCapability || 'unknown';
  const warning = deviceProfile?.tuningWarning || chipProfile?.tuningWarning;
  const profileName = deviceProfile?.displayName || chipProfile?.displayName || 'Unknown Device';

  return {
    capability,
    warning,
    profileName,

    targetTemp: overrides.targetTemp ?? ('targetTemp' in baseSettings ? baseSettings.targetTemp : 60),
    vrTargetTemp: overrides.vrTargetTemp ?? ('vrTargetTemp' in baseSettings ? baseSettings.vrTargetTemp : 70),

    minFreq: overrides.minFrequency ?? ('minFrequency' in baseSettings ? baseSettings.minFrequency : 400),
    maxFreq: overrides.maxFrequency ?? ('maxFrequency' in baseSettings ? baseSettings.maxFrequency : 650),

    minVolt: overrides.minVoltage ?? ('minVoltage' in baseSettings ? baseSettings.minVoltage : 1050),
    maxVolt: overrides.maxVoltage ?? ('maxVoltage' in baseSettings ? baseSettings.maxVoltage : 1250),

    tempFreqStepUp: overrides.freqStepUp ?? ('freqStepUp' in baseSettings ? baseSettings.freqStepUp : 10),
    tempFreqStepDown: ('freqStepDown' in baseSettings ? baseSettings.freqStepDown : 5),
    tempVoltStepUp: overrides.voltStepUp ?? ('voltStepUp' in baseSettings ? baseSettings.voltStepUp : 10),
    tempVoltStepDown: ('voltStepDown' in baseSettings ? baseSettings.voltStepDown : 5),

    vrTempFreqStepDown: ('freqStepDown' in baseSettings ? baseSettings.freqStepDown : 5),
    vrTempVoltStepDown: ('voltStepDown' in baseSettings ? baseSettings.voltStepDown : 5),
  };
}

/**
 * Check if a device supports tuning
 */
export function supportsTuning(asicModel?: string, hostname?: string): boolean {
  const preset = getTuningPreset(asicModel, hostname);
  return preset.capability === 'full' || preset.capability === 'limited';
}

/**
 * Get a warning message if tuning may not work or has risks
 */
export function getTuningWarning(asicModel?: string, hostname?: string): string | null {
  const preset = getTuningPreset(asicModel, hostname);

  if (preset.capability === 'closed') {
    return preset.warning || 'This device has closed firmware and does not support frequency/voltage tuning.';
  }

  if (preset.capability === 'limited') {
    return preset.warning || 'This device has limited tuning support. Proceed with caution.';
  }

  if (preset.capability === 'unknown') {
    return 'Unknown device. Using conservative tuning limits. Proceed with caution.';
  }

  return null;
}
