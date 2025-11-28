'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  X,
  CheckSquare,
  Square,
  Zap,
  RotateCw,
  FolderPlus,
  Settings2,
  Power,
} from 'lucide-react';
import type { MinerConfig, MinerGroup, AutoTunerSettings } from '@/lib/types';

interface BulkActionsBarProps {
  selectedMiners: string[];
  miners: MinerConfig[];
  groups: MinerGroup[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onApplySettings: (ips: string[], settings: Partial<AutoTunerSettings>) => void;
  onAssignGroup: (ips: string[], groupId: string | undefined) => void;
  onRestartMiners: (ips: string[]) => void;
  onClose: () => void;
}

export function BulkActionsBar({
  selectedMiners,
  miners,
  groups,
  onSelectAll,
  onDeselectAll,
  onApplySettings,
  onAssignGroup,
  onRestartMiners,
  onClose,
}: BulkActionsBarProps) {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);

  // Bulk settings state
  const [bulkAutoTunerEnabled, setBulkAutoTunerEnabled] = useState<boolean | null>(null);
  const [bulkFrequency, setBulkFrequency] = useState<number | null>(null);
  const [bulkVoltage, setBulkVoltage] = useState<number | null>(null);

  const handleApplySettings = () => {
    const settings: Partial<AutoTunerSettings> = {};

    if (bulkAutoTunerEnabled !== null) {
      settings.enabled = bulkAutoTunerEnabled;
    }

    // Note: Frequency and voltage would need to be sent directly to miners via API
    // For now, we'll update the tuner settings
    if (bulkFrequency !== null) {
      settings.maxFreq = bulkFrequency;
      settings.minFreq = Math.max(400, bulkFrequency - 100);
    }

    if (bulkVoltage !== null) {
      settings.maxVolt = bulkVoltage;
      settings.minVolt = Math.max(1000, bulkVoltage - 100);
    }

    if (Object.keys(settings).length > 0) {
      onApplySettings(selectedMiners, settings);
    }

    setSettingsDialogOpen(false);
    resetBulkSettings();
  };

  const resetBulkSettings = () => {
    setBulkAutoTunerEnabled(null);
    setBulkFrequency(null);
    setBulkVoltage(null);
  };

  const handleRestart = () => {
    onRestartMiners(selectedMiners);
    setRestartDialogOpen(false);
  };

  if (selectedMiners.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border-2 border-primary rounded-lg shadow-lg p-3 flex items-center gap-3 animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {selectedMiners.length} selected
          </Badge>

          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            <CheckSquare className="h-4 w-4 mr-1" />
            All
          </Button>

          <Button variant="ghost" size="sm" onClick={onDeselectAll}>
            <Square className="h-4 w-4 mr-1" />
            None
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Auto-Tuner Quick Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Zap className="h-4 w-4 mr-1" />
              Auto-Tuner
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onApplySettings(selectedMiners, { enabled: true })}>
              Enable All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onApplySettings(selectedMiners, { enabled: false })}>
              Disable All
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings */}
        <Button variant="outline" size="sm" onClick={() => setSettingsDialogOpen(true)}>
          <Settings2 className="h-4 w-4 mr-1" />
          Settings
        </Button>

        {/* Assign to Group */}
        {groups.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FolderPlus className="h-4 w-4 mr-1" />
                Group
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Assign to Group</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {groups.map(group => (
                <DropdownMenuItem
                  key={group.id}
                  onClick={() => onAssignGroup(selectedMiners, group.id)}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: group.color }}
                  />
                  {group.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAssignGroup(selectedMiners, undefined)}>
                <X className="h-4 w-4 mr-2" />
                Remove from Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Restart */}
        <Button
          variant="outline"
          size="sm"
          className="text-amber-500 hover:text-amber-600"
          onClick={() => setRestartDialogOpen(true)}
        >
          <RotateCw className="h-4 w-4 mr-1" />
          Restart
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Bulk Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Settings</DialogTitle>
            <DialogDescription>
              Apply settings to {selectedMiners.length} selected miner(s).
              Only changed settings will be applied.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Auto-Tuner Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Tuner</Label>
                <p className="text-xs text-muted-foreground">Enable or disable auto-tuning</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={bulkAutoTunerEnabled === true ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBulkAutoTunerEnabled(bulkAutoTunerEnabled === true ? null : true)}
                >
                  Enable
                </Button>
                <Button
                  variant={bulkAutoTunerEnabled === false ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBulkAutoTunerEnabled(bulkAutoTunerEnabled === false ? null : false)}
                >
                  Disable
                </Button>
              </div>
            </div>

            {/* Max Frequency */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Max Frequency</Label>
                <span className="text-sm text-muted-foreground">
                  {bulkFrequency !== null ? `${bulkFrequency} MHz` : 'Not changing'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={bulkFrequency !== null ? [bulkFrequency] : [500]}
                  onValueChange={([value]) => setBulkFrequency(value)}
                  min={400}
                  max={650}
                  step={25}
                  className="flex-1"
                  disabled={bulkFrequency === null}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkFrequency(bulkFrequency === null ? 500 : null)}
                >
                  {bulkFrequency === null ? 'Set' : 'Clear'}
                </Button>
              </div>
            </div>

            {/* Max Voltage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Max Voltage</Label>
                <span className="text-sm text-muted-foreground">
                  {bulkVoltage !== null ? `${bulkVoltage} mV` : 'Not changing'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={bulkVoltage !== null ? [bulkVoltage] : [1200]}
                  onValueChange={([value]) => setBulkVoltage(value)}
                  min={1000}
                  max={1400}
                  step={10}
                  className="flex-1"
                  disabled={bulkVoltage === null}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkVoltage(bulkVoltage === null ? 1200 : null)}
                >
                  {bulkVoltage === null ? 'Set' : 'Clear'}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplySettings}>
              Apply to {selectedMiners.length} Miner(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restart Confirmation Dialog */}
      <Dialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restart Miners?</DialogTitle>
            <DialogDescription>
              This will restart {selectedMiners.length} miner(s). They will be temporarily offline during the restart.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestartDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRestart}>
              <RotateCw className="h-4 w-4 mr-2" />
              Restart {selectedMiners.length} Miner(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
