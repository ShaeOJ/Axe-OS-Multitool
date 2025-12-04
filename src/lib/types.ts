// Represents the user-configured miner settings
export type MinerConfig = {
  ip: string;
  name: string;
  accentColor: string;
  tunerSettings: AutoTunerSettings;
  groupId?: string; // Optional group assignment
  sortOrder?: number; // For custom ordering
};

// Miner group for organizing miners
export type MinerGroup = {
  id: string;
  name: string;
  color: string;
  collapsed?: boolean; // Whether the group is collapsed in view
};

// Card display size options
export type CardSize = 'compact' | 'normal' | 'expanded';

// Dashboard layout preferences
export type DashboardLayout = {
  cardSize: CardSize;
  showOfflineMiners: boolean;
  groupBy: 'none' | 'group' | 'status';
  sortBy: 'name' | 'hashrate' | 'temperature' | 'power' | 'custom';
  sortDirection: 'asc' | 'desc';
};

// ASIC domain breakdown for advanced monitoring
export type HashrateMonitor = {
  asics: Array<{
    total: number;
    domains: number[];
    errorCount: number;
  }>;
};

// Updated structure for miner API response based on user-provided JSON
export type MinerInfo = {
  power?: number;
  voltage?: number; // Note: This is typically in Volts from the API
  current?: number;
  temp?: number;
  vrTemp?: number;
  maxPower?: number;
  nominalVoltage?: number;
  hashRate?: number; // MHS
  expectedHashrate?: number;
  estimatedExpectedHashrate?: number; // Estimated from device-specs when device doesn't report
  isEstimatedHashrate?: boolean;      // Flag indicating if expectedHashrate is estimated
  errorPercentage?: number;
  bestDiff?: string;
  bestSessionDiff?: string;
  poolDifficulty?: number;
  isUsingFallbackStratum?: number;
  isPSRAMAvailable?: number;
  freeHeap?: number;
  coreVoltage?: number; // Note: This is in millivolts (mV) from the API
  coreVoltageActual?: number;
  frequency?: number;
  ssid?: string;
  macAddr?: string;
  hostname?: string;
  wifiStatus?: string;
  wifiRSSI?: number;
  apEnabled?: number;
  sharesAccepted?: number;
  sharesRejected?: number;
  sharesRejectedReasons?: { message: string; count: number }[];
  uptimeSeconds?: number;
  smallCoreCount?: number;
  ASICModel?: string;
  stratumURL?: string;
  stratumPort?: number;
  stratumUser?: string;
  stratumSuggestedDifficulty?: number;
  stratumExtranonceSubscribe?: number;
  fallbackStratumURL?: string;
  fallbackStratumPort?: number;
  fallbackStratumUser?: string;
  fallbackStratumSuggestedDifficulty?: number;
  fallbackStratumExtranonceSubscribe?: number;
  responseTime?: number;
  version?: string;
  axeOSVersion?: string;
  idfVersion?: string;
  boardVersion?: string;
  runningPartition?: string;
  overheat_mode?: number;
  overclockEnabled?: number;
  display?: string;
  rotation?: number;
  invertscreen?: number;
  displayTimeout?: number;
  autofanspeed?: number;
  fanspeed?: number;
  temptarget?: number;
  fanrpm?: number;
  statsFrequency?: number;
  blockFound?: number;
  hashrateMonitor?: HashrateMonitor;
  ip_address?: string; // Manually added for UI
};


// Data point structure for historical charts
export type MinerDataPoint = {
  time: number; // timestamp
  hashrate: number;
  temperature: number;
  // Add voltage and power for auto-optimization analysis
  voltage?: number; // Stored in millivolts (mV)
  power?: number;
  frequency?: number;
};

// Represents the complete state for a single miner card component
export type MinerState = {
  loading: boolean;
  error: string | null;
  info: MinerInfo | null;
  history: MinerDataPoint[];
};

// Represents settings for the auto-tuner feature
export type AutoTunerSettings = {
  enabled: boolean;
  targetTemp: number;
  vrTargetTemp: number;
  minFreq: number;
  maxFreq: number;
  minVolt: number; // mV
  maxVolt: number; // mV
  tempFreqStepDown: number;
  tempVoltStepDown: number; // mV
  tempFreqStepUp: number;
  tempVoltStepUp: number; // mV
  vrTempFreqStepDown: number;
  vrTempVoltStepDown: number; // mV
  // New advanced settings from Python script
  flatlineDetectionEnabled: boolean;
  flatlineHashrateRepeatCount: number;
  autoOptimizeEnabled: boolean;
  autoOptimizeTriggerCycles: number;
  efficiencyTolerancePercent: number;
  verificationWaitSeconds: number; // Time to wait before verifying hashrate changes
  // Benchmark profile integration
  useBenchmarkProfile: boolean; // Whether to use saved benchmark results
  benchmarkProfileMode: 'hashrate' | 'efficiency' | 'overclock'; // Which profile to target
};

// Saved benchmark result for a specific miner
export type BenchmarkProfile = {
  // Identification
  minerIp: string;
  minerName: string;
  deviceProfile: string; // e.g., "NerdQaxe++", "Bitaxe Gamma"
  asicModel: string;
  chipCount: number;

  // Benchmark metadata
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  benchmarkMode: 'quick' | 'optimize' | 'efficiency' | 'overclock';

  // Best settings for maximum hashrate
  bestHashrate: {
    frequency: number;
    voltage: number;
    hashrate: number; // GH/s
    temperature: number; // °C at this setting
    power: number; // W
    efficiency: number; // J/TH
  } | null;

  // Best settings for efficiency
  bestEfficiency: {
    frequency: number;
    voltage: number;
    hashrate: number;
    temperature: number;
    power: number;
    efficiency: number; // J/TH - lower is better
  } | null;

  // Safe operating limits discovered during benchmark
  safeLimits: {
    maxFrequency: number; // Highest stable frequency found
    maxVoltage: number; // Highest voltage tested safely
    maxTemperature: number; // Peak temp observed during testing
    maxPower: number; // Peak power observed
  };

  // All tested combinations (for reference/analysis)
  allResults: Array<{
    frequency: number;
    voltage: number;
    hashrate: number;
    temperature: number;
    power: number;
    efficiency: number;
    stable: boolean;
  }>;

  // Notes from benchmark
  notes?: string;
};

// Benchmark history entry - wraps a profile with a unique ID
export type BenchmarkHistoryEntry = BenchmarkProfile & {
  id: string; // Unique identifier for this benchmark run
};

// Benchmark history storage structure
export type BenchmarkHistory = {
  // Map of miner IP to array of benchmark entries (newest first)
  entries: Record<string, BenchmarkHistoryEntry[]>;
  // Maximum entries to keep per miner
  maxEntriesPerMiner: number;
};
