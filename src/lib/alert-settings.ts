/**
 * Alert settings and notification configuration
 */

export interface AlertSettings {
  // Master toggle
  enabled: boolean;

  // Miner status alerts
  offlineAlerts: boolean;
  onlineAlerts: boolean;

  // Temperature alerts
  tempAlerts: boolean;
  tempThreshold: number; // Celsius
  vrTempAlerts: boolean;
  vrTempThreshold: number; // Celsius

  // Hashrate alerts
  hashrateDropAlerts: boolean;
  hashrateDropPercent: number; // Percentage drop to trigger alert

  // Block found
  blockFoundAlerts: boolean;

  // Sound
  soundEnabled: boolean;

  // System tray
  minimizeToTray: boolean; // Minimize to tray instead of closing
  startMinimized: boolean; // Start minimized to tray
}

export const defaultAlertSettings: AlertSettings = {
  enabled: true,

  offlineAlerts: true,
  onlineAlerts: true,

  tempAlerts: true,
  tempThreshold: 70,
  vrTempAlerts: true,
  vrTempThreshold: 80,

  hashrateDropAlerts: true,
  hashrateDropPercent: 20,

  blockFoundAlerts: true,

  soundEnabled: false,

  minimizeToTray: true,
  startMinimized: false,
};

/**
 * Power and cost tracking settings
 */
export interface PowerSettings {
  // Electricity rate
  electricityRate: number; // Cost per kWh
  currency: string; // Currency symbol

  // Display preferences
  showPowerCost: boolean;
  showEfficiency: boolean; // J/TH
}

export const defaultPowerSettings: PowerSettings = {
  electricityRate: 0.12, // $0.12 per kWh default
  currency: '$',
  showPowerCost: true,
  showEfficiency: true,
};

/**
 * Combined app settings
 */
export interface AppSettings {
  alerts: AlertSettings;
  power: PowerSettings;
}

export const defaultAppSettings: AppSettings = {
  alerts: defaultAlertSettings,
  power: defaultPowerSettings,
};
