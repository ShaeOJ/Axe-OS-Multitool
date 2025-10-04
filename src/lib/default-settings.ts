import type { AutoTunerSettings } from './types';

export const defaultTunerSettings: AutoTunerSettings = {
  enabled: false,
  targetTemp: 60.0,
  vrTargetTemp: 70.0, // °C
  minFreq: 400.0,
  maxFreq: 750.0,
  minVolt: 1000.0, // mV
  maxVolt: 1300.0, // mV
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
};
