'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Bell, Zap, RotateCcw, Monitor } from 'lucide-react';
import type { AlertSettings, PowerSettings } from '@/lib/alert-settings';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertSettings: AlertSettings;
  powerSettings: PowerSettings;
  onUpdateAlertSettings: (updates: Partial<AlertSettings>) => void;
  onUpdatePowerSettings: (updates: Partial<PowerSettings>) => void;
  onResetToDefaults: () => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  alertSettings,
  powerSettings,
  onUpdateAlertSettings,
  onUpdatePowerSettings,
  onResetToDefaults,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure alerts, notifications, and power tracking.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="alerts" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="power" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Power
            </TabsTrigger>
            <TabsTrigger value="tray" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Tray
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
                onCheckedChange={(checked) => onUpdateAlertSettings({ enabled: checked })}
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
                    onCheckedChange={(checked) => onUpdateAlertSettings({ offlineAlerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="online-alerts">Miner back online alerts</Label>
                  <Switch
                    id="online-alerts"
                    checked={alertSettings.onlineAlerts}
                    onCheckedChange={(checked) => onUpdateAlertSettings({ onlineAlerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="block-alerts">Block found celebration</Label>
                  <Switch
                    id="block-alerts"
                    checked={alertSettings.blockFoundAlerts}
                    onCheckedChange={(checked) => onUpdateAlertSettings({ blockFoundAlerts: checked })}
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
                      onCheckedChange={(checked) => onUpdateAlertSettings({ tempAlerts: checked })}
                    />
                  </div>
                  {alertSettings.tempAlerts && (
                    <div className="flex items-center gap-4 pl-4">
                      <Label className="text-sm text-muted-foreground w-24">Threshold:</Label>
                      <Slider
                        value={[alertSettings.tempThreshold]}
                        onValueChange={([value]) => onUpdateAlertSettings({ tempThreshold: value })}
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
                      onCheckedChange={(checked) => onUpdateAlertSettings({ vrTempAlerts: checked })}
                    />
                  </div>
                  {alertSettings.vrTempAlerts && (
                    <div className="flex items-center gap-4 pl-4">
                      <Label className="text-sm text-muted-foreground w-24">Threshold:</Label>
                      <Slider
                        value={[alertSettings.vrTempThreshold]}
                        onValueChange={([value]) => onUpdateAlertSettings({ vrTempThreshold: value })}
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
                      onCheckedChange={(checked) => onUpdateAlertSettings({ hashrateDropAlerts: checked })}
                    />
                  </div>
                  {alertSettings.hashrateDropAlerts && (
                    <div className="flex items-center gap-4 pl-4">
                      <Label className="text-sm text-muted-foreground w-24">Drop %:</Label>
                      <Slider
                        value={[alertSettings.hashrateDropPercent]}
                        onValueChange={([value]) => onUpdateAlertSettings({ hashrateDropPercent: value })}
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
                    onCheckedChange={(checked) => onUpdateAlertSettings({ soundEnabled: checked })}
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
                      onChange={(e) => onUpdatePowerSettings({ electricityRate: parseFloat(e.target.value) || 0 })}
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
                    onChange={(e) => onUpdatePowerSettings({ currency: e.target.value })}
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
                  onCheckedChange={(checked) => onUpdatePowerSettings({ showPowerCost: checked })}
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
                  onCheckedChange={(checked) => onUpdatePowerSettings({ showEfficiency: checked })}
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

          <TabsContent value="tray" className="space-y-6 mt-4">
            {/* System Tray Settings */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                System Tray
              </h4>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="minimize-to-tray">Minimize to tray</Label>
                  <p className="text-xs text-muted-foreground">
                    Hide to system tray instead of taskbar when minimized
                  </p>
                </div>
                <Switch
                  id="minimize-to-tray"
                  checked={alertSettings.minimizeToTray}
                  onCheckedChange={(checked) => onUpdateAlertSettings({ minimizeToTray: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="start-minimized">Start minimized</Label>
                  <p className="text-xs text-muted-foreground">
                    Launch app minimized to system tray
                  </p>
                </div>
                <Switch
                  id="start-minimized"
                  checked={alertSettings.startMinimized}
                  onCheckedChange={(checked) => onUpdateAlertSettings({ startMinimized: checked })}
                />
              </div>
            </div>

            {/* Background Monitoring Info */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="font-medium mb-2">Background Monitoring</h4>
              <p className="text-sm text-muted-foreground">
                When minimized to the system tray, AxeOS Live! continues to monitor
                your miners and will send notifications for any alerts you have enabled.
              </p>
              <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Left-click tray icon to show window</li>
                <li>Right-click for quick menu</li>
                <li>Notifications work even when minimized</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onResetToDefaults}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
