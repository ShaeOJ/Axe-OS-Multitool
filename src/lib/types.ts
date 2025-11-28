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
};
