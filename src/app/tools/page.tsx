'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { listen, emit } from '@tauri-apps/api/event';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Store } from '@tauri-apps/plugin-store';
import {
  Settings,
  Download,
  Upload,
  FileDown,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bell,
  Zap,
  RotateCcw,
  Wrench,
} from 'lucide-react';
import type { MinerConfig, MinerState, MinerInfo } from '@/lib/types';
import type { AlertSettings, PowerSettings, AppSettings } from '@/lib/alert-settings';
import { defaultAppSettings } from '@/lib/alert-settings';
import {
  prepareMinerDataForExport,
  convertToCSV,
  downloadCSV,
  generateExportFilename,
} from '@/lib/export-utils';
import {
  createBackup,
  downloadBackup,
  validateBackupFile,
  readFileAsText,
} from '@/lib/backup-utils';
import {
  checkLatestAxeOSRelease,
  needsUpdate,
  formatVersion,
  formatReleaseDate,
  type FirmwareCheckResult,
} from '@/lib/firmware-checker';
import { openUrl } from '@/lib/tauri-api';

const SETTINGS_KEY = 'axeos-app-settings';
const SAVE_DEBOUNCE_MS = 500; // Debounce saves to avoid excessive disk writes

interface ToolsData {
  miners: MinerConfig[];
  minerStates: Record<string, MinerState>;
}

export default function ToolsPage() {
  const [data, setData] = useState<ToolsData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('tools');

  // Settings state
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const storeRef = useRef<Store | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSettingsRef = useRef<AppSettings | null>(null);

  // Firmware check state
  const [isCheckingFirmware, setIsCheckingFirmware] = useState(false);
  const [firmwareResult, setFirmwareResult] = useState<FirmwareCheckResult | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Request data from main window
  const requestData = useCallback(async () => {
    try {
      await emit('tools-request-data');
    } catch (error) {
      console.error('Failed to request data:', error);
    }
  }, []);

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
          setIsSettingsLoading(false);
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

  // Listen for data from main window
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      unlisten = await listen<ToolsData>('tools-data-update', (event) => {
        setData(event.payload);
        setIsConnected(true);
      });

      // Request initial data
      await requestData();
    };

    setup();

    return () => {
      unlisten?.();
    };
  }, [requestData]);

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

  // Export CSV
  const handleExportCSV = () => {
    if (!data || data.miners.length === 0) {
      return;
    }

    const exportData = prepareMinerDataForExport(data.miners, data.minerStates);
    const csv = convertToCSV(exportData);
    const filename = generateExportFilename('axeos-miners', 'csv');
    downloadCSV(csv, filename);
  };

  // Backup configuration
  const handleBackup = () => {
    if (!data || data.miners.length === 0) {
      return;
    }

    const backup = createBackup(data.miners);
    const filename = generateExportFilename('axeos-backup', 'json');
    downloadBackup(backup, filename);
  };

  // Restore configuration
  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';

    try {
      const content = await readFileAsText(file);
      const result = validateBackupFile(content);

      if (!result.success) {
        return;
      }

      // Send restore request to main window
      await emit('tools-restore-backup', result.miners);
    } catch {
      console.error('Failed to read file');
    }
  };

  // Check for firmware updates
  const handleCheckFirmware = async () => {
    setIsCheckingFirmware(true);
    setFirmwareResult(null);

    const result = await checkLatestAxeOSRelease();
    setFirmwareResult(result);
    setIsCheckingFirmware(false);
  };

  // Get miners that need updates
  const getMinersNeedingUpdate = (): { miner: MinerConfig; info: MinerInfo }[] => {
    if (!data || !firmwareResult?.success || !firmwareResult.latestVersion) return [];

    return data.miners
      .filter(m => {
        const state = data.minerStates[m.ip];
        const version = state?.info?.version;
        return version && needsUpdate(version, firmwareResult.latestVersion);
      })
      .map(m => ({
        miner: m,
        info: data.minerStates[m.ip].info!,
      }));
  };

  const minersNeedingUpdate = firmwareResult?.success ? getMinersNeedingUpdate() : [];
  const alertSettings = settings.alerts;
  const powerSettings = settings.power;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Tools & Settings</h1>
              <p className="text-sm text-muted-foreground">
                Export, backup, firmware updates, and settings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="power" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Power
            </TabsTrigger>
          </TabsList>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-4">
            {/* Export & Backup */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Data Management
              </h4>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleExportCSV}
                disabled={!data || data.miners.length === 0}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export Stats to CSV
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleBackup}
                disabled={!data || data.miners.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Backup Configuration
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleRestoreClick}
              >
                <Upload className="mr-2 h-4 w-4" />
                Restore from Backup
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Firmware Updates */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Firmware Updates
              </h4>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleCheckFirmware}
                disabled={isCheckingFirmware}
              >
                {isCheckingFirmware ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Check for AxeOS Updates
              </Button>

              {firmwareResult && !firmwareResult.success && (
                <div className="flex items-center rounded-md bg-destructive/10 p-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="ml-2 text-sm text-destructive">{firmwareResult.error}</span>
                </div>
              )}

              {firmwareResult?.success && (
                <div className="space-y-3">
                  <div className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-sm">Latest Release</h4>
                        <p className="text-xs text-muted-foreground">
                          {firmwareResult.releaseName || formatVersion(firmwareResult.latestVersion)}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {formatVersion(firmwareResult.latestVersion)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Released: {formatReleaseDate(firmwareResult.publishedAt)}
                    </p>
                  </div>

                  {data && data.miners.length > 0 && (
                    <>
                      {minersNeedingUpdate.length === 0 ? (
                        <div className="flex items-center rounded-md bg-green-500/10 p-3">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span className="ml-2 text-sm text-green-500">
                            All miners are up to date!
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-amber-500">
                            {minersNeedingUpdate.length} miner(s) have updates available:
                          </p>
                          <div className="max-h-32 overflow-y-auto rounded-md border">
                            {minersNeedingUpdate.map(({ miner, info }) => (
                              <div
                                key={miner.ip}
                                className="flex items-center justify-between border-b p-2 last:border-b-0"
                              >
                                <span className="text-xs">
                                  {miner.name || info.hostname || miner.ip}
                                </span>
                                <Badge variant="outline" className="text-xs text-amber-500">
                                  {formatVersion(info.version)} → {formatVersion(firmwareResult.latestVersion)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {firmwareResult.releaseUrl && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => openUrl(firmwareResult.releaseUrl!)}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Release on GitHub
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            {isSettingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
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
              </>
            )}
          </TabsContent>

          {/* Power Tab */}
          <TabsContent value="power" className="space-y-6">
            {isSettingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
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
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Reset button at bottom */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
