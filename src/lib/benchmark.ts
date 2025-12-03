/**
 * Hashrate Benchmark Tool
 * Port of Bitaxe-Hashrate-Benchmark to TypeScript
 * Automatically finds optimal voltage/frequency settings for miners
 */

import { getMinerData, updateMinerSettings, restartMiner } from './tauri-api';
import type { MinerInfo } from './types';
import { getDeviceProfile, getTuningPreset, type TuningCapability } from './asic-presets';

// Emit events to notify miner cards to pause/resume auto-tuner
let emitFn: ((event: string, payload: unknown) => Promise<void>) | null = null;

// Initialize emit function (called from benchmark page)
export async function initBenchmarkEvents(): Promise<void> {
  try {
    const { emit } = await import('@tauri-apps/api/event');
    emitFn = emit;
  } catch {
    console.log('[Benchmark] Running in non-Tauri environment');
  }
}

// Emit benchmark started event
async function emitBenchmarkStarted(minerIp: string): Promise<void> {
  if (emitFn) {
    await emitFn('benchmark-started', { minerIp });
  }
}

// Emit benchmark stopped event
async function emitBenchmarkStopped(minerIp: string): Promise<void> {
  if (emitFn) {
    await emitFn('benchmark-stopped', { minerIp });
  }
}

// ============================================
// Configuration Constants
// ============================================

export const BENCHMARK_CONFIG = {
  // Voltage settings (mV)
  voltageIncrement: 20,
  minVoltage: 1000,
  maxVoltage: 1400,
  defaultVoltage: 1150,

  // Frequency settings (MHz)
  frequencyIncrement: 25,
  minFrequency: 400,
  maxFrequency: 1200,
  defaultFrequency: 500,

  // Safety thresholds
  maxChipTemp: 66,        // °C - stop if chip temp exceeds
  maxVrTemp: 86,          // °C - stop if VR temp exceeds
  maxPower: 40,           // W - stop if power exceeds (single-chip 5V DC plug limit)
  maxPower12V: 200,       // W - max for 12V multi-chip devices (NerdQaxe++, SupraHex, etc.)
  minInputVoltage: 4800,  // mV - stop if input voltage drops below (5V devices)
  minInputVoltage12V: 11000, // mV - minimum for 12V devices
  maxInputVoltage: 5500,  // mV - stop if input voltage exceeds (5V devices)
  maxInputVoltage12V: 13000, // mV - max for 12V devices

  // Overclock mode target temperature
  targetChipTemp: 62,     // °C - target temp for overclock mode (stay below this)
  targetVrTemp: 80,       // °C - target VR temp for overclock mode

  // Benchmark timing
  benchmarkDuration: 600, // 10 minutes per test (seconds)
  sampleInterval: 15,     // 15 seconds between samples
  stabilizationTime: 90,  // 90 seconds after restart before sampling

  // Overclock mode uses shorter tests for faster iteration
  overclockTestDuration: 180, // 3 minutes per test in overclock mode
  overclockStabilization: 60, // 60 seconds stabilization in overclock mode

  // Hashrate tolerance
  hashrateTolerance: 0.94, // 94% of expected hashrate is acceptable
};

// ============================================
// Types
// ============================================

export type BenchmarkStatus =
  | 'idle'
  | 'initializing'
  | 'stabilizing'
  | 'sampling'
  | 'applying_settings'
  | 'completed'
  | 'stopped'
  | 'error';

export type BenchmarkMode =
  | 'quick'          // Test current settings only
  | 'optimize'       // Full optimization search
  | 'efficiency'     // Find most efficient settings
  | 'overclock';     // Find max stable overclock within safe temps

export type StopReason =
  | 'completed'
  | 'user_cancelled'
  | 'chip_temp_exceeded'
  | 'vr_temp_exceeded'
  | 'power_exceeded'
  | 'input_voltage_low'
  | 'input_voltage_high'
  | 'max_voltage_reached'
  | 'max_frequency_reached'
  | 'connection_error'
  | 'zero_hashrate'
  | 'no_data';

export interface BenchmarkSample {
  timestamp: number;
  hashrate: number;
  chipTemp: number;
  vrTemp: number | null;
  power: number;
  inputVoltage: number;
  frequency: number;
  coreVoltage: number;
}

export interface BenchmarkResult {
  coreVoltage: number;
  frequency: number;
  averageHashrate: number;
  averageChipTemp: number;
  averageVrTemp: number | null;
  averagePower: number;
  efficiencyJTH: number;
  expectedHashrate: number;
  hashrateWithinTolerance: boolean;
  samples: BenchmarkSample[];
  timestamp: number;
}

export interface BenchmarkProgress {
  status: BenchmarkStatus;
  mode: BenchmarkMode;
  currentVoltage: number;
  currentFrequency: number;
  currentSample: number;
  totalSamples: number;
  currentIteration: number;
  totalIterations: number | null;  // null if unknown
  percentComplete: number;
  currentHashrate: number;
  currentTemp: number;
  currentPower: number;
  message: string;
  samples: BenchmarkSample[];
}

export interface BenchmarkSummary {
  minerIp: string;
  minerName: string;
  startTime: number;
  endTime: number;
  duration: number;
  mode: BenchmarkMode;
  stopReason: StopReason;
  allResults: BenchmarkResult[];
  topPerformers: BenchmarkResult[];     // Top 5 by hashrate
  mostEfficient: BenchmarkResult[];     // Top 5 by efficiency
  bestSettings: {
    forHashrate: BenchmarkResult | null;
    forEfficiency: BenchmarkResult | null;
  };
  originalSettings: {
    voltage: number;
    frequency: number;
  };
  appliedSettings: {
    voltage: number;
    frequency: number;
  } | null;
}

export interface BenchmarkCallbacks {
  onProgress: (progress: BenchmarkProgress) => void;
  onSample: (sample: BenchmarkSample) => void;
  onIterationComplete: (result: BenchmarkResult) => void;
  onComplete: (summary: BenchmarkSummary) => void;
  onError: (error: string) => void;
}

// ============================================
// Benchmark Class
// ============================================

export class MinerBenchmark {
  private ip: string;
  private name: string;
  private mode: BenchmarkMode;
  private config: typeof BENCHMARK_CONFIG;
  private callbacks: BenchmarkCallbacks;

  private isRunning = false;
  private shouldStop = false;
  private status: BenchmarkStatus = 'idle';

  private results: BenchmarkResult[] = [];
  private currentSamples: BenchmarkSample[] = [];

  private originalVoltage = 0;
  private originalFrequency = 0;
  private smallCoreCount = 0;
  private asicCount = 1; // Default to 1 ASIC if not reported

  // Current test values (for progress display)
  private testVoltage = 0;
  private testFrequency = 0;
  private lastMessage = '';

  // Device profile info
  private deviceProfileName = '';
  private tuningCapability: TuningCapability = 'unknown';
  private tuningWarning: string | null = null;

  private startTime = 0;

  // Throttle progress updates to reduce UI overhead
  private lastProgressUpdate = 0;
  private readonly PROGRESS_THROTTLE_MS = 1000; // Max 1 update per second
  private pendingProgress: BenchmarkProgress | null = null;

  constructor(
    ip: string,
    name: string,
    mode: BenchmarkMode,
    callbacks: BenchmarkCallbacks,
    configOverrides?: Partial<typeof BENCHMARK_CONFIG>
  ) {
    this.ip = ip;
    this.name = name;
    this.mode = mode;
    this.callbacks = callbacks;
    this.config = { ...BENCHMARK_CONFIG, ...configOverrides };
  }

  /**
   * Start the benchmark
   */
  async start(initialVoltage?: number, initialFrequency?: number): Promise<BenchmarkSummary> {
    if (this.isRunning) {
      throw new Error('Benchmark is already running');
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.status = 'initializing';
    this.results = [];
    this.startTime = Date.now();

    // Notify miner cards to pause auto-tuner for this miner
    await emitBenchmarkStarted(this.ip);

    try {
      // Fetch current settings
      await this.fetchDeviceInfo();

      const startVoltage = initialVoltage ?? this.originalVoltage;
      const startFrequency = initialFrequency ?? this.originalFrequency;

      // Validate starting values
      this.validateSettings(startVoltage, startFrequency);

      let summary: BenchmarkSummary;

      switch (this.mode) {
        case 'quick':
          summary = await this.runQuickBenchmark();
          break;
        case 'optimize':
          summary = await this.runOptimizationBenchmark(startVoltage, startFrequency);
          break;
        case 'efficiency':
          summary = await this.runEfficiencyBenchmark(startVoltage, startFrequency);
          break;
        case 'overclock':
          summary = await this.runOverclockBenchmark(startVoltage, startFrequency);
          break;
        default:
          throw new Error(`Unknown benchmark mode: ${this.mode}`);
      }

      this.callbacks.onComplete(summary);
      return summary;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.callbacks.onError(message);
      throw error;
    } finally {
      // Notify miner cards to resume auto-tuner for this miner
      await emitBenchmarkStopped(this.ip);
      this.isRunning = false;
      this.status = 'idle';
    }
  }

  /**
   * Stop the benchmark
   */
  stop(): void {
    this.shouldStop = true;
    this.status = 'stopped';
  }

  /**
   * Get current status
   */
  getStatus(): BenchmarkStatus {
    return this.status;
  }

  /**
   * Check if running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  // ============================================
  // Private Methods
  // ============================================

  private async fetchDeviceInfo(): Promise<void> {
    let info: MinerInfo;
    try {
      info = await getMinerData(this.ip);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to connect to miner at ${this.ip}: ${message}`);
    }

    this.originalVoltage = info.coreVoltage ?? this.config.defaultVoltage;
    this.originalFrequency = info.frequency ?? this.config.defaultFrequency;
    this.smallCoreCount = info.smallCoreCount ?? 0;

    // Detect device profile for multi-chip devices
    const deviceProfile = getDeviceProfile(info.hostname, info.ASICModel);
    const tuningPreset = getTuningPreset(info.ASICModel, info.hostname);

    // Get chip count from device profile (for multi-chip devices like NerdQaxe++, BG01, SupraHex)
    this.asicCount = deviceProfile?.chipCount ?? 1;
    this.deviceProfileName = tuningPreset.profileName;
    this.tuningCapability = tuningPreset.capability;
    this.tuningWarning = tuningPreset.warning ?? null;

    // Calculate total cores (smallCoreCount is per chip)
    const totalCores = this.smallCoreCount * this.asicCount;


    // Update config limits based on device profile
    if (tuningPreset.maxFreq) {
      this.config.maxFrequency = Math.min(this.config.maxFrequency, tuningPreset.maxFreq);
    }
    if (tuningPreset.maxVolt) {
      this.config.maxVoltage = Math.min(this.config.maxVoltage, tuningPreset.maxVolt);
    }
    if (tuningPreset.minFreq) {
      this.config.minFrequency = Math.max(this.config.minFrequency, tuningPreset.minFreq);
    }
    if (tuningPreset.minVolt) {
      this.config.minVoltage = Math.max(this.config.minVoltage, tuningPreset.minVolt);
    }

    // Adjust limits for multi-chip 12V devices
    if (this.asicCount > 1) {
      // Multi-chip devices run on 12V and can draw much more power
      // NerdQaxe++ (4 chip): up to ~100-120W
      // SupraHex (6 chip): up to ~150W
      // Use 12V power limits instead of 5V DC plug limits
      this.config.maxPower = this.config.maxPower12V;
      this.config.minInputVoltage = this.config.minInputVoltage12V;
      this.config.maxInputVoltage = this.config.maxInputVoltage12V;
    }

    // Initialize test values with original settings
    this.testVoltage = this.originalVoltage;
    this.testFrequency = this.originalFrequency;

    this.updateProgress({
      currentVoltage: this.originalVoltage,
      currentFrequency: this.originalFrequency,
      message: `${this.deviceProfileName}: ${this.asicCount} chip(s), ${totalCores} cores @ ${this.originalFrequency}MHz/${this.originalVoltage}mV`,
    });

    // Warn if tuning is not fully supported
    if (this.tuningWarning) {
      this.callbacks.onProgress({
        status: 'initializing',
        mode: this.mode,
        currentVoltage: this.originalVoltage,
        currentFrequency: this.originalFrequency,
        currentSample: 0,
        totalSamples: 0,
        currentIteration: 0,
        totalIterations: null,
        percentComplete: 0,
        currentHashrate: 0,
        currentTemp: 0,
        currentPower: 0,
        message: `Warning: ${this.tuningWarning}`,
        samples: [],
      });
    }
  }

  private validateSettings(voltage: number, frequency: number): void {
    if (voltage < this.config.minVoltage || voltage > this.config.maxVoltage) {
      throw new Error(`Voltage ${voltage}mV is outside allowed range (${this.config.minVoltage}-${this.config.maxVoltage}mV)`);
    }
    if (frequency < this.config.minFrequency || frequency > this.config.maxFrequency) {
      throw new Error(`Frequency ${frequency}MHz is outside allowed range (${this.config.minFrequency}-${this.config.maxFrequency}MHz)`);
    }
  }

  private calculateExpectedHashrate(frequency: number): number {
    return frequency * ((this.smallCoreCount * this.asicCount) / 1000);
  }

  private async runQuickBenchmark(): Promise<BenchmarkSummary> {
    this.updateProgress({
      currentVoltage: this.originalVoltage,
      currentFrequency: this.originalFrequency,
      message: 'Starting quick benchmark of current settings...',
    });

    // For quick mode, test current settings without restart
    const result = await this.runSingleBenchmark(this.originalVoltage, this.originalFrequency, true);

    if (result) {
      this.results.push(result);
    }

    return this.createSummary(result ? 'completed' : 'no_data');
  }

  private async runOptimizationBenchmark(
    startVoltage: number,
    startFrequency: number
  ): Promise<BenchmarkSummary> {
    this.updateProgress({ message: 'Starting optimization benchmark...' });

    let currentVoltage = startVoltage;
    let currentFrequency = startFrequency;
    let iteration = 0;
    let stopReason: StopReason = 'completed';

    while (!this.shouldStop) {
      iteration++;

      // Check limits
      if (currentVoltage > this.config.maxVoltage) {
        stopReason = 'max_voltage_reached';
        break;
      }
      if (currentFrequency > this.config.maxFrequency) {
        stopReason = 'max_frequency_reached';
        break;
      }

      this.updateProgress({
        currentIteration: iteration,
        currentVoltage,
        currentFrequency,
        message: `Testing: ${currentFrequency}MHz @ ${currentVoltage}mV`,
      });

      const result = await this.runSingleBenchmark(currentVoltage, currentFrequency);

      if (!result) {
        // Hit a limit or error
        stopReason = this.determineStopReason();
        break;
      }

      this.results.push(result);
      this.flushProgress(); // Ensure UI is up to date before iteration complete
      this.callbacks.onIterationComplete(result);

      if (result.hashrateWithinTolerance) {
        // Good hashrate, try increasing frequency
        if (currentFrequency + this.config.frequencyIncrement <= this.config.maxFrequency) {
          currentFrequency += this.config.frequencyIncrement;
        } else {
          stopReason = 'max_frequency_reached';
          break;
        }
      } else {
        // Hashrate not good, step back frequency and increase voltage
        if (currentVoltage + this.config.voltageIncrement <= this.config.maxVoltage) {
          currentVoltage += this.config.voltageIncrement;
          currentFrequency -= this.config.frequencyIncrement;
          this.updateProgress({
            message: `Hashrate low, adjusting to ${currentFrequency}MHz @ ${currentVoltage}mV`,
          });
        } else {
          stopReason = 'max_voltage_reached';
          break;
        }
      }
    }

    if (this.shouldStop) {
      stopReason = 'user_cancelled';
    }

    // Apply best settings
    const summary = this.createSummary(stopReason);
    await this.applyBestSettings(summary);

    return summary;
  }

  private async runEfficiencyBenchmark(
    startVoltage: number,
    startFrequency: number
  ): Promise<BenchmarkSummary> {
    // Run optimization first, then pick most efficient
    const summary = await this.runOptimizationBenchmark(startVoltage, startFrequency);

    // Override applied settings with most efficient
    if (summary.bestSettings.forEfficiency) {
      const best = summary.bestSettings.forEfficiency;
      await this.applySettings(best.coreVoltage, best.frequency);
      summary.appliedSettings = {
        voltage: best.coreVoltage,
        frequency: best.frequency,
      };
    }

    return summary;
  }

  /**
   * Overclock benchmark - finds maximum stable settings within safe temperature limits
   * Strategy:
   * 1. Start at current settings
   * 2. Increase frequency until temp approaches target
   * 3. If temp is too high, increase voltage to stabilize
   * 4. If voltage is maxed and temp still high, reduce frequency
   * 5. Keep the best stable result found
   */
  private async runOverclockBenchmark(
    startVoltage: number,
    startFrequency: number
  ): Promise<BenchmarkSummary> {
    this.updateProgress({
      currentVoltage: startVoltage,
      currentFrequency: startFrequency,
      message: 'Starting overclock search - finding optimal settings within safe temps...',
    });

    let currentVoltage = startVoltage;
    let currentFrequency = startFrequency;
    let iteration = 0;
    let stopReason: StopReason = 'completed';
    let lastStableVoltage = startVoltage;
    let lastStableFrequency = startFrequency;
    let consecutiveTempExceeds = 0;
    const MAX_TEMP_EXCEEDS = 2; // After 2 consecutive temp exceeds, back off

    // Use shorter test duration for overclock mode
    const originalDuration = this.config.benchmarkDuration;
    const originalStabilization = this.config.stabilizationTime;
    this.config.benchmarkDuration = this.config.overclockTestDuration;
    this.config.stabilizationTime = this.config.overclockStabilization;

    try {
      while (!this.shouldStop) {
        iteration++;

        // Check limits
        if (currentVoltage > this.config.maxVoltage) {
          // Voltage maxed, can't stabilize higher frequency
          this.updateProgress({
            message: `Max voltage reached. Reverting to last stable: ${lastStableFrequency}MHz @ ${lastStableVoltage}mV`,
          });
          currentVoltage = lastStableVoltage;
          currentFrequency = lastStableFrequency;
          stopReason = 'max_voltage_reached';
          break;
        }
        if (currentFrequency > this.config.maxFrequency) {
          stopReason = 'max_frequency_reached';
          break;
        }

        this.updateProgress({
          currentIteration: iteration,
          currentVoltage,
          currentFrequency,
          message: `Testing: ${currentFrequency}MHz @ ${currentVoltage}mV (target temp: ${this.config.targetChipTemp}°C)`,
        });

        const result = await this.runSingleBenchmark(currentVoltage, currentFrequency);

        if (!result) {
          // Hit a hard limit (max temp, power, etc)
          stopReason = this.determineStopReason();

          if (stopReason === 'chip_temp_exceeded' || stopReason === 'vr_temp_exceeded') {
            // Temperature too high - reduce frequency and try again
            this.updateProgress({
              message: `Temperature limit hit! Reducing frequency...`,
            });
            currentFrequency -= this.config.frequencyIncrement;
            if (currentFrequency < this.config.minFrequency) {
              stopReason = 'completed';
              break;
            }
            continue;
          }
          break;
        }

        this.results.push(result);
        this.flushProgress(); // Ensure UI is up to date before iteration complete
        this.callbacks.onIterationComplete(result);

        // Check if temperature is within target range
        const avgTemp = result.averageChipTemp;
        const avgVrTemp = result.averageVrTemp ?? 0;
        const tempOk = avgTemp <= this.config.targetChipTemp &&
                       (avgVrTemp === 0 || avgVrTemp <= this.config.targetVrTemp);

        if (tempOk && result.hashrateWithinTolerance) {
          // Good result! Save as last stable and try higher frequency
          lastStableVoltage = currentVoltage;
          lastStableFrequency = currentFrequency;
          consecutiveTempExceeds = 0;

          this.updateProgress({
            message: `Stable at ${currentFrequency}MHz (${avgTemp.toFixed(1)}°C). Trying higher...`,
          });

          // Try increasing frequency
          if (currentFrequency + this.config.frequencyIncrement <= this.config.maxFrequency) {
            currentFrequency += this.config.frequencyIncrement;
          } else {
            stopReason = 'max_frequency_reached';
            break;
          }
        } else if (!result.hashrateWithinTolerance) {
          // Hashrate unstable - need more voltage
          this.updateProgress({
            message: `Hashrate unstable at ${currentFrequency}MHz. Increasing voltage...`,
          });

          if (currentVoltage + this.config.voltageIncrement <= this.config.maxVoltage) {
            currentVoltage += this.config.voltageIncrement;
          } else {
            // Can't increase voltage more, reduce frequency
            currentFrequency -= this.config.frequencyIncrement;
            if (currentFrequency < this.config.minFrequency) {
              stopReason = 'completed';
              break;
            }
          }
        } else {
          // Temperature too high
          consecutiveTempExceeds++;

          if (consecutiveTempExceeds >= MAX_TEMP_EXCEEDS) {
            // Too many temp exceeds, we've found the limit
            this.updateProgress({
              message: `Temperature limit reached (${avgTemp.toFixed(1)}°C). Using last stable settings.`,
            });
            currentVoltage = lastStableVoltage;
            currentFrequency = lastStableFrequency;
            stopReason = 'completed';
            break;
          }

          // Try reducing frequency slightly
          this.updateProgress({
            message: `Temp ${avgTemp.toFixed(1)}°C exceeds target ${this.config.targetChipTemp}°C. Reducing frequency...`,
          });
          currentFrequency -= this.config.frequencyIncrement;

          if (currentFrequency < this.config.minFrequency) {
            stopReason = 'completed';
            break;
          }
        }
      }

      if (this.shouldStop) {
        stopReason = 'user_cancelled';
      }

      // Create summary and apply best settings
      const summary = this.createSummary(stopReason);

      // For overclock mode, apply the last stable settings found
      if (this.results.length > 0) {
        // Find the best result that was within temperature limits
        const stableResults = this.results.filter(r =>
          r.averageChipTemp <= this.config.targetChipTemp &&
          (r.averageVrTemp === null || r.averageVrTemp <= this.config.targetVrTemp) &&
          r.hashrateWithinTolerance
        );

        if (stableResults.length > 0) {
          // Pick the one with highest hashrate
          const best = stableResults.sort((a, b) => b.averageHashrate - a.averageHashrate)[0];
          this.updateProgress({
            message: `Applying best stable settings: ${best.frequency}MHz @ ${best.coreVoltage}mV (${best.averageHashrate.toFixed(0)} GH/s)`,
          });
          await this.applySettings(best.coreVoltage, best.frequency);
          summary.appliedSettings = {
            voltage: best.coreVoltage,
            frequency: best.frequency,
          };
        } else {
          // No stable results found, restore original
          this.updateProgress({ message: 'No stable overclock found. Restoring original settings.' });
          await this.applySettings(this.originalVoltage, this.originalFrequency);
          summary.appliedSettings = {
            voltage: this.originalVoltage,
            frequency: this.originalFrequency,
          };
        }
      }

      return summary;

    } finally {
      // Restore original timing config
      this.config.benchmarkDuration = originalDuration;
      this.config.stabilizationTime = originalStabilization;
    }
  }

  private async runSingleBenchmark(
    voltage: number,
    frequency: number,
    skipRestart = false
  ): Promise<BenchmarkResult | null> {
    // Update current test values for progress display
    this.testVoltage = voltage;
    this.testFrequency = frequency;

    if (skipRestart) {
      // For quick mode - just start sampling without changing settings
      this.status = 'stabilizing';
      this.updateProgress({
        currentVoltage: voltage,
        currentFrequency: frequency,
        message: 'Starting sampling (no restart needed)...',
      });
      // Brief stabilization to let any recent changes settle
      await this.sleep(5000);
    } else {
      // Apply settings and restart
      this.status = 'applying_settings';
      await this.applySettings(voltage, frequency);

      // Wait for stabilization
      this.status = 'stabilizing';
      this.updateProgress({
        currentVoltage: voltage,
        currentFrequency: frequency,
        message: `Stabilizing (${this.config.stabilizationTime}s)...`,
      });
      await this.sleep(this.config.stabilizationTime * 1000);
    }

    if (this.shouldStop) return null;

    // Start sampling
    this.status = 'sampling';
    this.currentSamples = [];

    const totalSamples = Math.floor(this.config.benchmarkDuration / this.config.sampleInterval);
    const expectedHashrate = this.calculateExpectedHashrate(frequency);

    for (let i = 0; i < totalSamples; i++) {
      if (this.shouldStop) return null;

      const sample = await this.takeSample(voltage, frequency);

      if (!sample) {
        return null; // Error or safety limit hit
      }

      this.currentSamples.push(sample);
      this.callbacks.onSample(sample);

      this.updateProgress({
        currentSample: i + 1,
        totalSamples,
        currentHashrate: sample.hashrate,
        currentTemp: sample.chipTemp,
        currentPower: sample.power,
        percentComplete: ((i + 1) / totalSamples) * 100,
      });

      // Sleep before next sample (except on last iteration)
      if (i < totalSamples - 1) {
        await this.sleep(this.config.sampleInterval * 1000);
      }
    }

    // Process results
    return this.processResults(voltage, frequency, expectedHashrate);
  }

  private async takeSample(voltage: number, frequency: number): Promise<BenchmarkSample | null> {
    try {
      const info = await getMinerData(this.ip);

      // Safety checks - force update on limit violations
      if (info.temp != null && info.temp >= this.config.maxChipTemp) {
        this.updateProgress({ message: `Chip temp ${info.temp}°C exceeded limit!` }, true);
        return null;
      }
      if (info.vrTemp != null && info.vrTemp >= this.config.maxVrTemp) {
        this.updateProgress({ message: `VR temp ${info.vrTemp}°C exceeded limit!` }, true);
        return null;
      }
      if (info.power != null && info.power > this.config.maxPower) {
        this.updateProgress({ message: `Power ${info.power}W exceeded limit!` }, true);
        return null;
      }
      if (info.voltage != null && info.voltage < this.config.minInputVoltage) {
        this.updateProgress({ message: `Input voltage ${info.voltage}mV too low!` }, true);
        return null;
      }
      if (info.voltage != null && info.voltage > this.config.maxInputVoltage) {
        this.updateProgress({ message: `Input voltage ${info.voltage}mV too high!` }, true);
        return null;
      }

      return {
        timestamp: Date.now(),
        hashrate: info.hashRate ?? 0,
        chipTemp: info.temp ?? 0,
        vrTemp: info.vrTemp ?? null,
        power: info.power ?? 0,
        inputVoltage: info.voltage ?? 0,
        frequency,
        coreVoltage: voltage,
      };
    } catch (error) {
      this.updateProgress({ message: `Error fetching data: ${error}` }, true);
      return null;
    }
  }

  private processResults(
    voltage: number,
    frequency: number,
    expectedHashrate: number
  ): BenchmarkResult | null {
    if (this.currentSamples.length < 7) {
      return null;
    }

    // Remove outliers from hashrate (3 highest, 3 lowest)
    const sortedHashrates = this.currentSamples
      .map(s => s.hashrate)
      .sort((a, b) => a - b);
    const trimmedHashrates = sortedHashrates.slice(3, -3);
    const averageHashrate = trimmedHashrates.reduce((a, b) => a + b, 0) / trimmedHashrates.length;

    if (averageHashrate <= 0) {
      return null;
    }

    // Remove warmup from temperatures (first 6 readings)
    const temps = this.currentSamples.slice(6).map(s => s.chipTemp);
    const averageChipTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

    const vrTemps = this.currentSamples
      .slice(6)
      .map(s => s.vrTemp)
      .filter((t): t is number => t !== null);
    const averageVrTemp = vrTemps.length > 0
      ? vrTemps.reduce((a, b) => a + b, 0) / vrTemps.length
      : null;

    const averagePower = this.currentSamples.reduce((a, s) => a + s.power, 0) / this.currentSamples.length;
    const efficiencyJTH = averagePower / (averageHashrate / 1000);

    const hashrateWithinTolerance = averageHashrate >= expectedHashrate * this.config.hashrateTolerance;

    return {
      coreVoltage: voltage,
      frequency,
      averageHashrate,
      averageChipTemp,
      averageVrTemp,
      averagePower,
      efficiencyJTH,
      expectedHashrate,
      hashrateWithinTolerance,
      samples: [...this.currentSamples],
      timestamp: Date.now(),
    };
  }

  private async applySettings(voltage: number, frequency: number): Promise<void> {
    this.updateProgress({ message: `Applying: ${frequency}MHz @ ${voltage}mV` });
    await updateMinerSettings(this.ip, frequency, voltage);
    await this.sleep(2000);
    await restartMiner(this.ip);
  }

  private async applyBestSettings(summary: BenchmarkSummary): Promise<void> {
    const best = summary.bestSettings.forHashrate;

    if (best) {
      this.updateProgress({ message: `Applying best settings: ${best.frequency}MHz @ ${best.coreVoltage}mV` });
      await this.applySettings(best.coreVoltage, best.frequency);
      summary.appliedSettings = {
        voltage: best.coreVoltage,
        frequency: best.frequency,
      };
    } else {
      // Restore original settings
      this.updateProgress({ message: 'Restoring original settings' });
      await this.applySettings(this.originalVoltage, this.originalFrequency);
      summary.appliedSettings = {
        voltage: this.originalVoltage,
        frequency: this.originalFrequency,
      };
    }
  }

  private createSummary(stopReason: StopReason): BenchmarkSummary {
    const endTime = Date.now();

    // Sort by hashrate (descending)
    const topPerformers = [...this.results]
      .sort((a, b) => b.averageHashrate - a.averageHashrate)
      .slice(0, 5);

    // Sort by efficiency (ascending - lower is better)
    const mostEfficient = [...this.results]
      .sort((a, b) => a.efficiencyJTH - b.efficiencyJTH)
      .slice(0, 5);

    return {
      minerIp: this.ip,
      minerName: this.name,
      startTime: this.startTime,
      endTime,
      duration: endTime - this.startTime,
      mode: this.mode,
      stopReason,
      allResults: this.results,
      topPerformers,
      mostEfficient,
      bestSettings: {
        forHashrate: topPerformers[0] ?? null,
        forEfficiency: mostEfficient[0] ?? null,
      },
      originalSettings: {
        voltage: this.originalVoltage,
        frequency: this.originalFrequency,
      },
      appliedSettings: null,
    };
  }

  private determineStopReason(): StopReason {
    // Check last sample for reason
    const lastSample = this.currentSamples[this.currentSamples.length - 1];
    if (!lastSample) return 'no_data';

    if (lastSample.chipTemp >= this.config.maxChipTemp) return 'chip_temp_exceeded';
    if (lastSample.vrTemp != null && lastSample.vrTemp >= this.config.maxVrTemp) return 'vr_temp_exceeded';
    if (lastSample.power > this.config.maxPower) return 'power_exceeded';
    if (lastSample.inputVoltage < this.config.minInputVoltage) return 'input_voltage_low';
    if (lastSample.inputVoltage > this.config.maxInputVoltage) return 'input_voltage_high';
    if (lastSample.hashrate <= 0) return 'zero_hashrate';

    return 'completed';
  }

  private updateProgress(partial: Partial<BenchmarkProgress>, force = false): void {
    // Update tracked voltage/frequency if provided
    if (partial.currentVoltage !== undefined) {
      this.testVoltage = partial.currentVoltage;
    }
    if (partial.currentFrequency !== undefined) {
      this.testFrequency = partial.currentFrequency;
    }
    // Update message only if provided, otherwise keep last message
    if (partial.message !== undefined) {
      this.lastMessage = partial.message;
    }

    const progress: BenchmarkProgress = {
      status: this.status,
      mode: this.mode,
      currentVoltage: this.testVoltage,
      currentFrequency: this.testFrequency,
      currentSample: partial.currentSample ?? 0,
      totalSamples: partial.totalSamples ?? 0,
      currentIteration: partial.currentIteration ?? 0,
      totalIterations: partial.totalIterations ?? null,
      percentComplete: partial.percentComplete ?? 0,
      currentHashrate: partial.currentHashrate ?? 0,
      currentTemp: partial.currentTemp ?? 0,
      currentPower: partial.currentPower ?? 0,
      message: this.lastMessage,
      // Only include samples count, not the full array - UI can track samples separately
      samples: [],
    };

    // Throttle progress updates unless forced (for important state changes)
    const now = Date.now();
    if (!force && now - this.lastProgressUpdate < this.PROGRESS_THROTTLE_MS) {
      // Store pending progress to send on next allowed update
      this.pendingProgress = progress;
      return;
    }

    this.lastProgressUpdate = now;
    this.pendingProgress = null;
    this.callbacks.onProgress(progress);
  }

  // Flush any pending progress update (call before important events)
  private flushProgress(): void {
    if (this.pendingProgress) {
      this.callbacks.onProgress(this.pendingProgress);
      this.pendingProgress = null;
      this.lastProgressUpdate = Date.now();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format efficiency for display
 */
export function formatEfficiency(jth: number): string {
  return `${jth.toFixed(2)} J/TH`;
}

/**
 * Get human-readable stop reason
 */
export function getStopReasonMessage(reason: StopReason): string {
  const messages: Record<StopReason, string> = {
    completed: 'Benchmark completed successfully',
    user_cancelled: 'Benchmark stopped by user',
    chip_temp_exceeded: 'Chip temperature limit exceeded',
    vr_temp_exceeded: 'VR temperature limit exceeded',
    power_exceeded: 'Power consumption limit exceeded',
    input_voltage_low: 'Input voltage dropped too low',
    input_voltage_high: 'Input voltage too high',
    max_voltage_reached: 'Maximum voltage limit reached',
    max_frequency_reached: 'Maximum frequency limit reached',
    connection_error: 'Connection error',
    zero_hashrate: 'Zero hashrate detected',
    no_data: 'No data collected',
  };
  return messages[reason] ?? 'Unknown reason';
}
