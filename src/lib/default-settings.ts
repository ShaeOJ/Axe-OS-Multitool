import type { AutoTunerSettings } from './types';
import { getTuningPreset } from './asic-presets';

/**
 * Conservative default settings for unknown devices
 */
export const defaultTunerSettings: AutoTunerSettings = {
  enabled: false,
  targetTemp: 60.0,
  vrTargetTemp: 70.0, // °C
  minFreq: 400.0,
  maxFreq: 650.0,     // Conservative max for unknown devices
  minVolt: 1050.0,    // Safe minimum
  maxVolt: 1250.0,    // Conservative max for unknown devices
  tempFreqStepDown: 5.0,
  tempVoltStepDown: 5.0, // mV
  tempFreqStepUp: 10.0,
  tempVoltStepUp: 10.0, // mV
  vrTempFreqStepDown: 5.0,
  vrTempVoltStepDown: 5.0, // mV
  flatlineDetectionEnabled: true,
  flatlineHashrateRepeatCount: 30,
  autoOptimizeEnabled: true,
  autoOptimizeTriggerCycles: 60, // Run every 60 cycles (15 mins if 15s interval)
  efficiencyTolerancePercent: 2.0,
  verificationWaitSeconds: 60, // Wait 60 seconds before checking if hashrate improved
  // Benchmark profile integration
  useBenchmarkProfile: false, // Disabled by default until user runs benchmark
  benchmarkProfileMode: 'hashrate', // Default to targeting best hashrate
};

/**
 * Get tuner settings optimized for a specific device
 * Uses ASIC chip profiles and device-specific overrides from benchmark data
 *
 * @param asicModel - The ASIC model string (e.g., "BM1370", "BM1368")
 * @param hostname - The device hostname for device-specific profiles
 * @param existingSettings - Existing settings to merge with (preserves user customizations)
 * @returns AutoTunerSettings optimized for the device
 */
export function getDeviceOptimizedSettings(
  asicModel?: string,
  hostname?: string,
  existingSettings?: Partial<AutoTunerSettings>
): AutoTunerSettings {
  // Get preset based on detected chip/device
  const preset = getTuningPreset(asicModel, hostname);

  // Start with defaults
  const optimized: AutoTunerSettings = { ...defaultTunerSettings };

  // Apply preset values
  if (preset.targetTemp !== undefined) optimized.targetTemp = preset.targetTemp;
  if (preset.vrTargetTemp !== undefined) optimized.vrTargetTemp = preset.vrTargetTemp;
  if (preset.minFreq !== undefined) optimized.minFreq = preset.minFreq;
  if (preset.maxFreq !== undefined) optimized.maxFreq = preset.maxFreq;
  if (preset.minVolt !== undefined) optimized.minVolt = preset.minVolt;
  if (preset.maxVolt !== undefined) optimized.maxVolt = preset.maxVolt;
  if (preset.tempFreqStepUp !== undefined) optimized.tempFreqStepUp = preset.tempFreqStepUp;
  if (preset.tempFreqStepDown !== undefined) optimized.tempFreqStepDown = preset.tempFreqStepDown;
  if (preset.tempVoltStepUp !== undefined) optimized.tempVoltStepUp = preset.tempVoltStepUp;
  if (preset.tempVoltStepDown !== undefined) optimized.tempVoltStepDown = preset.tempVoltStepDown;
  if (preset.vrTempFreqStepDown !== undefined) optimized.vrTempFreqStepDown = preset.vrTempFreqStepDown;
  if (preset.vrTempVoltStepDown !== undefined) optimized.vrTempVoltStepDown = preset.vrTempVoltStepDown;

  // Merge with existing settings (user customizations take priority)
  if (existingSettings) {
    return { ...optimized, ...existingSettings };
  }

  return optimized;
}
