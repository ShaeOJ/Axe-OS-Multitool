'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { emit } from '@tauri-apps/api/event';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Bell, Zap, RotateCcw, Settings, RefreshCw, Info } from 'lucide-react';
import { Store } from '@tauri-apps/plugin-store';
import type { AlertSettings, PowerSettings, AppSettings } from '@/lib/alert-settings';
import { defaultAppSettings } from '@/lib/alert-settings';
import { VersionInfo } from '@/components/update-banner';

const SETTINGS_KEY = 'axeos-app-settings';
const SAVE_DEBOUNCE_MS = 500; // Debounce saves to avoid excessive disk writes

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [isLoading, setIsLoading] = useState(true);
  const storeRef = useRef<Store | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSettingsRef = useRef<AppSettings | null>(null);

  // Initialize store and load settings
  useEffect(() => {
    let mounted = true;

    const initStore = async () => {
      try {
        const storeInstance = await Store.load('settings.json');
        if (!mounted) return;

        storeRef.current = storeInstance;

        const stored = await storeInstance.get<AppSettings>(SETTINGS_KEY);
        if (!mounted) return;

        if (stored) {
          setSettings({
            alerts: { ...defaultAppSettings.alerts, ...stored.alerts },
            power: { ...defaultAppSettings.power, ...stored.power },
          });
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initStore();

    return () => {
      mounted = false;
      // Save any pending changes on unmount
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        if (pendingSettingsRef.current && storeRef.current) {
          storeRef.current.set(SETTINGS_KEY, pendingSettingsRef.current);
          storeRef.current.save();
          emit('settings-updated', pendingSettingsRef.current);
        }
      }
    };
  }, []);

  // Debounced save function
  const saveSettings = useCallback((newSettings: AppSettings) => {
    pendingSettingsRef.current = newSettings;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule a debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      const store = storeRef.current;
      const settingsToSave = pendingSettingsRef.current;

      if (store && settingsToSave) {
        try {
          await store.set(SETTINGS_KEY, settingsToSave);
          await store.save();
          await emit('settings-updated', settingsToSave);
          pendingSettingsRef.current = null;
        } catch (error) {
          console.error('Failed to save settings:', error);
        }
      }
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const updateAlertSettings = useCallback((updates: Partial<AlertSettings>) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        alerts: { ...prev.alerts, ...updates },
      };
      saveSettings(newSettings);
      return newSettings;
    });
  }, [saveSettings]);

  const updatePowerSettings = useCallback((updates: Partial<PowerSettings>) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        power: { ...prev.power, ...updates },
      };
      saveSettings(newSettings);
      return newSettings;
    });
  }, [saveSettings]);

  const resetToDefaults = useCallback(() => {
    setSettings(defaultAppSettings);
    saveSettings(defaultAppSettings);
  }, [saveSettings]);

  const alertSettings = settings.alerts;
  const powerSettings = settings.power;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure alerts, notifications, and power tracking.
            </p>
          </div>
        </div>

        <Tabs defaultValue="alerts" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="power" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Power & Cost
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-6 mt-4">
            {/* Master Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="alerts-enabled" className="text-base font-medium">
                  Enable Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Master toggle for all notifications
                </p>
              </div>
              <Switch
                id="alerts-enabled"
                checked={alertSettings.enabled}
                onCheckedChange={(checked) => updateAlertSettings({ enabled: checked })}
              />
            </div>

            <div className={alertSettings.enabled ? '' : 'opacity-50 pointer-events-none'}>
              {/* Status Alerts */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Status Alerts
                </h4>

                <div className="flex items-center justify-between">
                  <Label htmlFor="offline-alerts">Miner offline alerts</Label>
                  <Switch
                    id="offline-alerts"
                    checked={alertSettings.offlineAlerts}
                    onCheckedChange={(checked) => updateAlertSettings({ offlineAlerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="online-alerts">Miner back online alerts</Label>
                  <Switch
                    id="online-alerts"
                    checked={alertSettings.onlineAlerts}
                    onCheckedChange={(checked) => updateAlertSettings({ onlineAlerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="block-alerts">Block found celebration</Label>
                  <Switch
                    id="block-alerts"
                    checked={alertSettings.blockFoundAlerts}
                    onCheckedChange={(checked) => updateAlertSettings({ blockFoundAlerts: checked })}
                  />
                </div>
              </div>

              {/* Temperature Alerts */}
              <div className="space-y-4 mt-6">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Temperature Alerts
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="temp-alerts">ASIC temperature warning</Label>
                    <Switch
                      id="temp-alerts"
                      checked={alertSettings.tempAlerts}
                      onCheckedChange={(checked) => updateAlertSettings({ tempAlerts: checked })}
                    />
                  </div>
                  {alertSettings.tempAlerts && (
                    <div className="flex items-center gap-4 pl-4">
                      <Label className="text-sm text-muted-foreground w-24">Threshold:</Label>
                      <Slider
                        value={[alertSettings.tempThreshold]}
                        onValueChange={([value]) => updateAlertSettings({ tempThreshold: value })}
                        min={50}
                        max={90}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{alertSettings.tempThreshold}°C</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vr-temp-alerts">VR temperature warning</Label>
                    <Switch
                      id="vr-temp-alerts"
                      checked={alertSettings.vrTempAlerts}
                      onCheckedChange={(checked) => updateAlertSettings({ vrTempAlerts: checked })}
                    />
                  </div>
                  {alertSettings.vrTempAlerts && (
                    <div className="flex items-center gap-4 pl-4">
                      <Label className="text-sm text-muted-foreground w-24">Threshold:</Label>
                      <Slider
                        value={[alertSettings.vrTempThreshold]}
                        onValueChange={([value]) => updateAlertSettings({ vrTempThreshold: value })}
                        min={60}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{alertSettings.vrTempThreshold}°C</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hashrate Alerts */}
              <div className="space-y-4 mt-6">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Hashrate Alerts
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hashrate-alerts">Hashrate drop detection</Label>
                    <Switch
                      id="hashrate-alerts"
                      checked={alertSettings.hashrateDropAlerts}
                      onCheckedChange={(checked) => updateAlertSettings({ hashrateDropAlerts: checked })}
                    />
                  </div>
                  {alertSettings.hashrateDropAlerts && (
                    <div className="flex items-center gap-4 pl-4">
                      <Label className="text-sm text-muted-foreground w-24">Drop %:</Label>
                      <Slider
                        value={[alertSettings.hashrateDropPercent]}
                        onValueChange={([value]) => updateAlertSettings({ hashrateDropPercent: value })}
                        min={5}
                        max={50}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{alertSettings.hashrateDropPercent}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sound */}
              <div className="space-y-4 mt-6">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Sound
                </h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sound-enabled">Alert sounds</Label>
                    <p className="text-xs text-muted-foreground">Play a beep for critical alerts</p>
                  </div>
                  <Switch
                    id="sound-enabled"
                    checked={alertSettings.soundEnabled}
                    onCheckedChange={(checked) => updateAlertSettings({ soundEnabled: checked })}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="power" className="space-y-6 mt-4">
            {/* Electricity Rate */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Electricity Cost
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="electricity-rate">Rate per kWh</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm">
                      {powerSettings.currency}
                    </span>
                    <Input
                      id="electricity-rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={powerSettings.electricityRate}
                      onChange={(e) => updatePowerSettings({ electricityRate: parseFloat(e.target.value) || 0 })}
                      className="rounded-l-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency Symbol</Label>
                  <Input
                    id="currency"
                    type="text"
                    maxLength={3}
                    value={powerSettings.currency}
                    onChange={(e) => updatePowerSettings({ currency: e.target.value })}
                    placeholder="$"
                  />
                </div>
              </div>
            </div>

            {/* Display Options */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Display Options
              </h4>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-power-cost">Show power cost</Label>
                  <p className="text-xs text-muted-foreground">Display daily cost per miner</p>
                </div>
                <Switch
                  id="show-power-cost"
                  checked={powerSettings.showPowerCost}
                  onCheckedChange={(checked) => updatePowerSettings({ showPowerCost: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-efficiency">Show efficiency (J/TH)</Label>
                  <p className="text-xs text-muted-foreground">Display joules per terahash</p>
                </div>
                <Switch
                  id="show-efficiency"
                  checked={powerSettings.showEfficiency}
                  onCheckedChange={(checked) => updatePowerSettings({ showEfficiency: checked })}
                />
              </div>
            </div>

            {/* Cost Preview */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="font-medium mb-2">Cost Preview</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">10W miner:</span>
                <span>{powerSettings.currency}{((10 / 1000) * 24 * powerSettings.electricityRate).toFixed(2)}/day</span>
                <span className="text-muted-foreground">25W miner:</span>
                <span>{powerSettings.currency}{((25 / 1000) * 24 * powerSettings.electricityRate).toFixed(2)}/day</span>
                <span className="text-muted-foreground">100W miner:</span>
                <span>{powerSettings.currency}{((100 / 1000) * 24 * powerSettings.electricityRate).toFixed(2)}/day</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="about" className="space-y-6 mt-4">
            {/* App Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Application
              </h4>

              <div className="rounded-lg border p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-bold">AxeOS Live!</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor and manage your Bitaxe and AxeOS-based miners
                  </p>
                </div>

                <VersionInfo />
              </div>
            </div>

            {/* Links */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Links
              </h4>

              <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => window.open('https://github.com/ShaeOJ/Axe-OS-Multitool', '_blank')}
                >
                  GitHub Repository
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => window.open('https://github.com/ShaeOJ/Axe-OS-Multitool/issues', '_blank')}
                >
                  Report an Issue
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => window.open('https://github.com/ShaeOJ/Axe-OS-Multitool/releases', '_blank')}
                >
                  View All Releases
                </Button>
              </div>
            </div>

            {/* Credits */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Credits
              </h4>

              <div className="rounded-lg border p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Built with Tauri, Next.js, and React.
                  <br />
                  Made for the Bitcoin mining community.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
