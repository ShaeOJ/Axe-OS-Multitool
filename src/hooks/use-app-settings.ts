import { useState, useEffect, useCallback } from 'react';
import { Store } from '@tauri-apps/plugin-store';
import { listen } from '@tauri-apps/api/event';
import {
  type AppSettings,
  type AlertSettings,
  type PowerSettings,
  defaultAppSettings,
} from '@/lib/alert-settings';

const SETTINGS_KEY = 'axeos-app-settings';

// Check if we're running in Tauri environment
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Initialize store instance (will be lazy-loaded)
let store: Store | null = null;

const getStore = async () => {
  if (!isTauri()) return null;
  if (!store) {
    store = await Store.load('settings.json');
  }
  return store;
};

// Storage helper functions
const loadSettingsFromStorage = async (): Promise<AppSettings> => {
  if (typeof window === 'undefined') return defaultAppSettings;

  try {
    if (isTauri()) {
      const storeInstance = await getStore();
      if (storeInstance) {
        const stored = await storeInstance.get<AppSettings>(SETTINGS_KEY);
        if (stored) {
          // Merge with defaults to handle new settings added in updates
          return {
            alerts: { ...defaultAppSettings.alerts, ...stored.alerts },
            power: { ...defaultAppSettings.power, ...stored.power },
          };
        }
      }
    }

    // Fallback to localStorage for development/browser
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        alerts: { ...defaultAppSettings.alerts, ...parsed.alerts },
        power: { ...defaultAppSettings.power, ...parsed.power },
      };
    }
  } catch (error) {
    console.error('Error loading settings from storage:', error);
  }

  return defaultAppSettings;
};

const saveSettingsToStorage = async (settings: AppSettings): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    if (isTauri()) {
      const storeInstance = await getStore();
      if (storeInstance) {
        await storeInstance.set(SETTINGS_KEY, settings);
        await storeInstance.save();
        return;
      }
    }

    // Fallback to localStorage for development/browser
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings to storage:', error);
  }
};

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize settings from storage on mount
  useEffect(() => {
    const loadSettings = async () => {
      const loadedSettings = await loadSettingsFromStorage();
      setSettings(loadedSettings);
      setIsInitialized(true);
    };

    loadSettings();
  }, []);

  // Listen for settings updates from the settings window
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unlisten = await listen<AppSettings>('settings-updated', (event) => {
          // Update settings when received from settings window
          if (event.payload) {
            setSettings({
              alerts: { ...defaultAppSettings.alerts, ...event.payload.alerts },
              power: { ...defaultAppSettings.power, ...event.payload.power },
            });
          }
        });
      } catch (error) {
        console.error('Failed to listen for settings updates:', error);
      }
    };

    setupListener();

    return () => {
      unlisten?.();
    };
  }, []);

  // Save to storage whenever settings change (after initialization)
  useEffect(() => {
    if (isInitialized) {
      saveSettingsToStorage(settings);
    }
  }, [settings, isInitialized]);

  const updateAlertSettings = useCallback((updates: Partial<AlertSettings>) => {
    setSettings(prev => ({
      ...prev,
      alerts: { ...prev.alerts, ...updates },
    }));
  }, []);

  const updatePowerSettings = useCallback((updates: Partial<PowerSettings>) => {
    setSettings(prev => ({
      ...prev,
      power: { ...prev.power, ...updates },
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(defaultAppSettings);
  }, []);

  return {
    settings,
    alertSettings: settings.alerts,
    powerSettings: settings.power,
    updateAlertSettings,
    updatePowerSettings,
    resetToDefaults,
    isInitialized,
  };
};
