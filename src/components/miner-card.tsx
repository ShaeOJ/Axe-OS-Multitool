

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import type { MinerState, MinerInfo, MinerDataPoint, AutoTunerSettings, MinerConfig } from '@/lib/types';
import { MinerChart } from './miner-chart';
import { Zap, Thermometer, Gauge, HeartPulse, Trash2, ChevronDown, AlertCircle, CheckCircle2, Cpu, Hash, Check, X, Server, GitBranch, Settings, Power, Expand, AlertTriangle, Trophy, Activity } from 'lucide-react';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { GlitchText } from './glitch-text';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShareAnimation } from './share-animation';
import { getMinerData, restartMiner as restartMinerTauri, updateMinerSettings, openToolsWindow } from '@/lib/tauri-api';
import { getTuningPreset, getTuningWarning, supportsTuning, type TuningCapability } from '@/lib/asic-presets';
import { getDeviceOptimizedSettings } from '@/lib/default-settings';
import { listen } from '@tauri-apps/api/event';
import { getBenchmarkProfile, getTargetSettingsFromProfile } from '@/lib/benchmark-profiles';


// New state for advanced tuning logic
type TuningState = {
    voltageStuckCycles: number;
    frequencyBoostActive: boolean;
    lastHashrate: number;
    lastActionWasVoltIncrease: boolean;
    lastHashrateBeforeFreqBoost: number;
    lastAdjustmentTime: number;
    tunerPaused: boolean;
    lastTemp: number;
    cycleCount: number;
    // Hashrate verification after adjustments
    verificationCheckScheduled: boolean;
    verificationCheckTime: number;
    hashrateBeforeChange: number;
    previousFrequency: number;
    previousVoltage: number;
    previousErrorCount: number;
    // Ambient temp spike detection while paused
    tempAtPause: number;
    pauseTime: number;
    // Benchmark mode - completely pause auto-tuner when benchmarking
    benchmarkActive: boolean;
    // Benchmark profile integration
    benchmarkProfileLoaded: boolean;
    targetFrequency: number | null;
    targetVoltage: number | null;
    targetHashrate: number | null;
};

const setMinerSettings = async (ip: string, frequency: number, coreVoltage: number) => {
  try {
    const data = await updateMinerSettings(ip, frequency, coreVoltage);
    return data;
  } catch (error) {
    console.error('Error setting miner settings:', error);
    const message = error instanceof Error ? error.message : 'Failed to update miner settings';
    throw new Error(message);
  }
};

const restartMiner = async (ip: string) => {
  try {
    const data = await restartMinerTauri(ip);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to restart miner';
    throw new Error(message);
  }
};


const StatCircle = ({ value, max, label, unit, icon: Icon, accentColor, formatAsFloat }: { value: number; max: number; label: string; unit: string; icon: React.ElementType, accentColor: string, formatAsFloat?: boolean }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const angle = (percentage / 100) * 270 - 135; // 270 degree arc, starting at -135
    const displayValue = formatAsFloat ? value.toFixed(2) : value.toFixed(0);

    return (
        <div className="flex flex-col items-center justify-center gap-2">
            <div className="relative h-32 w-32">
                <svg className="h-full w-full" viewBox="-10 -10 120 120">
                    <defs>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <filter id="glow-strong" x="-100%" y="-100%" width="300%" height="300%">
                            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={accentColor} />
                        </filter>
                    </defs>
                    {/* Background Arc */}
                    <path
                        d="M 14.64 85.36 A 45 45 0 1 1 85.36 85.36"
                        className="stroke-current text-muted/30"
                        strokeWidth="8"
                        fill="transparent"
                    />
                    {/* Foreground Arc */}
                    <path
                        d="M 14.64 85.36 A 45 45 0 1 1 85.36 85.36"
                        className="stroke-current transition-all duration-500"
                        style={{ color: accentColor, filter: 'url(#glow-strong)' }}
                        strokeWidth="8"
                        strokeLinecap="round"
                        fill="transparent"
                        strokeOpacity={0.5}
                        strokeDasharray={2 * Math.PI * 45 * (270 / 360)}
                        strokeDashoffset={(2 * Math.PI * 45 * (270 / 360)) * (1 - percentage / 100)}
                    />
                    {/* Needle */}
                    <g transform={`rotate(${angle} 50 50)`} style={{ filter: 'url(#glow-strong)' }}>
                        <polygon points="50,10 52,50 48,50" fill={accentColor} fillOpacity={0.7} />
                        <circle cx="50" cy="50" r="4" fill={accentColor} fillOpacity={0.7} />
                    </g>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold" style={{ textShadow: `0 0 2px ${accentColor}, 0 0 2px ${accentColor}, 0 0 2px ${accentColor}, 0 0 2px ${accentColor}` }}>
                        <GlitchText probability={0.2}>{displayValue ?? '0'}</GlitchText>
                    </p>
                    <p className="text-xs text-muted-foreground" style={{ textShadow: `0 0 2px ${accentColor}, 0 0 2px ${accentColor}` }}>{unit}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
            </div>
        </div>
    );
};

const StatItem = ({ icon: Icon, label, value, unit, loading }: { icon: React.ElementType, label: string, value?: string | number, unit?: string, loading: boolean }) => (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-muted-foreground mt-1" />
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">
          <GlitchText probability={0.2}>{value ?? 'N/A'}</GlitchText> <span className="text-sm font-normal text-muted-foreground">{unit}</span>
        </p>
      </div>
    </div>
  );

export function MinerCard({ minerConfig, onRemove, isRemoving, state, updateMiner, powerSettings, cardSize = 'normal', group }: MinerCardProps) {
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isCardOpen, setIsCardOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isChartDialogOpen, setIsChartDialogOpen] = useState(false);
  const [isTunerSettingsOpen, setIsTunerSettingsOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const { tunerSettings } = minerConfig;
  const [animateShare, setAnimateShare] = useState(0);
  const [shareType, setShareType] = useState<'accepted' | 'rejected'>('accepted');
  const [blockFoundCelebration, setBlockFoundCelebration] = useState(false);
  const prevAcceptedSharesRef = useRef<number>();
  const prevRejectedSharesRef = useRef<number>();
  const prevBlockFoundRef = useRef<number>();

  useEffect(() => {
    const currentAcceptedShares = state.info?.sharesAccepted;
    const currentRejectedShares = state.info?.sharesRejected;

    // Check for accepted shares
    if (
      prevAcceptedSharesRef.current !== undefined &&
      currentAcceptedShares !== undefined &&
      currentAcceptedShares > prevAcceptedSharesRef.current
    ) {
      setShareType('accepted');
      setAnimateShare(s => s + 1);
    }

    // Check for rejected shares
    if (
      prevRejectedSharesRef.current !== undefined &&
      currentRejectedShares !== undefined &&
      currentRejectedShares > prevRejectedSharesRef.current
    ) {
      setShareType('rejected');
      setAnimateShare(s => s + 1);
    }

    // Check for block found
    const currentBlockFound = state.info?.blockFound;
    if (
      prevBlockFoundRef.current !== undefined &&
      currentBlockFound !== undefined &&
      currentBlockFound > prevBlockFoundRef.current &&
      currentBlockFound === 1
    ) {
      setBlockFoundCelebration(true);
      toast({
        title: `🏆 BLOCK FOUND! 🏆`,
        description: `${minerConfig.name || minerConfig.ip} found a block! Congratulations!`,
        duration: 10000,
      });
      // Auto-hide celebration after 15 seconds
      setTimeout(() => setBlockFoundCelebration(false), 15000);
    }

    prevAcceptedSharesRef.current = currentAcceptedShares;
    prevRejectedSharesRef.current = currentRejectedShares;
    prevBlockFoundRef.current = currentBlockFound;
  }, [state.info?.sharesAccepted, state.info?.sharesRejected, state.info?.blockFound, minerConfig.name, minerConfig.ip, toast]);

  // Detect device profile for optimized tuning presets
  const deviceTuningInfo = useMemo(() => {
    const asicModel = state.info?.ASICModel;
    const hostname = state.info?.hostname;
    const preset = getTuningPreset(asicModel, hostname);
    const warning = getTuningWarning(asicModel, hostname);
    const canTune = supportsTuning(asicModel, hostname);

    return {
      profileName: preset.profileName,
      capability: preset.capability,
      warning,
      canTune,
      preset,
    };
  }, [state.info?.ASICModel, state.info?.hostname]);

  // Track if we've already applied device-optimized settings for this miner
  const hasAppliedOptimizedSettings = useRef(false);

  // Auto-apply optimized settings when device is first detected
  useEffect(() => {
    // Only apply once per miner session and only if we have device info
    if (hasAppliedOptimizedSettings.current || !state.info?.ASICModel) {
      return;
    }

    // Only auto-apply if tuner settings are at default values (not user-customized)
    // We detect this by checking if minFreq and maxFreq are at conservative defaults
    const isUsingDefaults = tunerSettings.minFreq === 400 && tunerSettings.maxFreq === 650;

    if (isUsingDefaults && deviceTuningInfo.canTune) {
      const optimized = getDeviceOptimizedSettings(
        state.info.ASICModel,
        state.info.hostname,
        { enabled: tunerSettings.enabled } // Preserve enabled state
      );

      // Only update if preset values are different
      if (
        optimized.minFreq !== tunerSettings.minFreq ||
        optimized.maxFreq !== tunerSettings.maxFreq ||
        optimized.minVolt !== tunerSettings.minVolt ||
        optimized.maxVolt !== tunerSettings.maxVolt
      ) {
        updateMiner({ ip: minerConfig.ip, tunerSettings: optimized });
        toast({
          title: `Auto-Tuner: ${deviceTuningInfo.profileName} Detected`,
          description: `Applied optimized tuning limits for ${state.info.ASICModel}. Freq: ${optimized.minFreq}-${optimized.maxFreq}MHz, Volt: ${optimized.minVolt}-${optimized.maxVolt}mV`,
        });
      }
    }

    hasAppliedOptimizedSettings.current = true;
  }, [state.info?.ASICModel, state.info?.hostname, deviceTuningInfo, tunerSettings, updateMiner, minerConfig.ip, toast]);

  const tuningState = useRef<TuningState>({
    voltageStuckCycles: 0,
    frequencyBoostActive: false,
    lastHashrate: 0,
    lastActionWasVoltIncrease: false,
    lastHashrateBeforeFreqBoost: 0,
    cycleCount: 0,
    lastAdjustmentTime: 0,
    tunerPaused: false,
    lastTemp: 0,
    verificationCheckScheduled: false,
    verificationCheckTime: 0,
    hashrateBeforeChange: 0,
    previousFrequency: 0,
    previousVoltage: 0,
    previousErrorCount: 0,
    tempAtPause: 0,
    pauseTime: 0,
    benchmarkActive: false,
    benchmarkProfileLoaded: false,
    targetFrequency: null,
    targetVoltage: null,
    targetHashrate: null,
  });

  const analyzeAndDetermineBestSettings = useCallback((history: MinerDataPoint[]) => {
    const {
        targetTemp,
        autoOptimizeTriggerCycles,
        efficiencyTolerancePercent,
     } = tunerSettings;

    if (!history || history.length < autoOptimizeTriggerCycles) {
        return { settings: null, reason: `Not enough data (${history.length}/${autoOptimizeTriggerCycles})` };
    }

    // Only analyze recent history (last 30 minutes at 15s intervals = 120 data points)
    // This ensures we're using relevant data that reflects current conditions
    const RECENT_HISTORY_LIMIT = 120;
    const recentHistory = history.slice(-RECENT_HISTORY_LIMIT);

    const tempTolerance = 2.0; // Use a small tolerance for finding points in the ideal temp range
    const validPoints = recentHistory.filter(p =>
        p.temperature &&
        p.hashrate &&
        p.voltage &&
        Math.abs(p.temperature - targetTemp) <= tempTolerance
    );

    if (validPoints.length < 10) { // Need a reasonable number of points to analyze
        return { settings: null, reason: `Not enough data in target temp range (${validPoints.length})` };
    }
    
    const maxHashrate = Math.max(...validPoints.map(p => p.hashrate));
    if (maxHashrate <= 0) {
        return { settings: null, reason: "No positive hashrate data in target temp range." };
    }

    const hashrateThreshold = maxHashrate * (1 - (efficiencyTolerancePercent / 100));

    const nearPeakPoints = validPoints.filter(p => p.hashrate >= hashrateThreshold);
    if (nearPeakPoints.length === 0) {
        return { settings: null, reason: `No data points near peak hashrate (> ${hashrateThreshold.toFixed(2)})` };
    }

    const bestPoint = nearPeakPoints.reduce((best, current) => {
        // Find point with lowest voltage.
        return (current.voltage! < best.voltage!) ? current : best;
    });

    if (!bestPoint.frequency || !bestPoint.voltage) {
        return { settings: null, reason: "Optimal point found but missing frequency or voltage." };
    }

    const optimalSettings = {
        frequency: Math.round(bestPoint.frequency),
        coreVoltage: bestPoint.voltage, // Voltage is already in mV
    };

    const reason = `History analysis: Peak HR was ${maxHashrate.toFixed(2)}. Found best efficiency at ${bestPoint.hashrate.toFixed(2)} GH/s (F: ${optimalSettings.frequency}MHz, V: ${optimalSettings.coreVoltage}mV).`;
    return { settings: optimalSettings, reason };
  }, [tunerSettings]);


  const verifyHashrateChange = useCallback(async (info: MinerInfo) => {
    const HASHRATE_DROP_THRESHOLD_PERCENT = 15; // 15% drop triggers revert
    const HASHRATE_INCREASE_MIN = 1; // GH/s

    const currentHashrate = info.hashRate || 0;
    const hashrateDiff = currentHashrate - tuningState.current.hashrateBeforeChange;
    const dropThreshold = tuningState.current.hashrateBeforeChange * (HASHRATE_DROP_THRESHOLD_PERCENT / 100);

    // If hashrate dropped significantly (percentage-based), revert to previous settings
    if (hashrateDiff < -dropThreshold) {
      try {
        await setMinerSettings(
          minerConfig.ip,
          tuningState.current.previousFrequency,
          tuningState.current.previousVoltage
        );
        const dropPercent = (Math.abs(hashrateDiff) / tuningState.current.hashrateBeforeChange * 100).toFixed(1);
        toast({
          variant: "destructive",
          title: `Auto-Tuner: Reverted ${minerConfig.name || minerConfig.ip}`,
          description: `Hashrate dropped ${Math.abs(hashrateDiff).toFixed(1)} GH/s (${dropPercent}%). Reverted to F:${tuningState.current.previousFrequency}MHz, V:${tuningState.current.previousVoltage}mV`,
        });
        console.log(`[Verification] Reverted: HR dropped from ${tuningState.current.hashrateBeforeChange.toFixed(1)} to ${currentHashrate.toFixed(1)} GH/s`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast({
          variant: 'destructive',
          title: `Auto-Tuner Revert Error: ${minerConfig.name || minerConfig.ip}`,
          description: `Failed to revert settings: ${message}`,
        });
      }
    } else if (hashrateDiff >= HASHRATE_INCREASE_MIN) {
      // Hashrate improved, keep the new settings
      console.log(`[Verification] Success: HR increased from ${tuningState.current.hashrateBeforeChange.toFixed(1)} to ${currentHashrate.toFixed(1)} GH/s (+${hashrateDiff.toFixed(1)} GH/s)`);
    } else {
      // Hashrate stable (within -100 to +1 GH/s range)
      console.log(`[Verification] Stable: HR change ${hashrateDiff >= 0 ? '+' : ''}${hashrateDiff.toFixed(1)} GH/s (within acceptable range)`);
    }

    // Clear the scheduled check
    tuningState.current.verificationCheckScheduled = false;
  }, [minerConfig.ip, minerConfig.name, toast]);

  const tuneMiner = useCallback(async (info: MinerInfo, history: MinerDataPoint[]) => {
    // Skip if benchmark is running on this miner
    if (tuningState.current.benchmarkActive) {
        return;
    }

    // Core requirements: temp, frequency, coreVoltage, hashRate
    // vrTemp is optional (NerdAxe devices may not report it)
    if (!tunerSettings.enabled || info.temp == null || info.frequency == null || info.coreVoltage == null || info.hashRate == null) {
        return;
    }

    // Skip tuning for closed-firmware devices (Avalon, etc.)
    const tuningPreset = getTuningPreset(info.ASICModel, info.hostname);
    if (tuningPreset.capability === 'closed') {
        console.log(`[Auto-Tuner] Skipping ${minerConfig.name || minerConfig.ip}: Closed firmware device (${tuningPreset.profileName})`);
        return;
    }

    // Load benchmark profile if enabled and not already loaded
    if (tunerSettings.useBenchmarkProfile && !tuningState.current.benchmarkProfileLoaded) {
      try {
        const profile = await getBenchmarkProfile(minerConfig.ip);
        if (profile) {
          const targetSettings = getTargetSettingsFromProfile(profile, tunerSettings.benchmarkProfileMode);
          if (targetSettings) {
            tuningState.current.targetFrequency = targetSettings.frequency;
            tuningState.current.targetVoltage = targetSettings.voltage;

            // Get expected hashrate from the profile
            const targetResult = tunerSettings.benchmarkProfileMode === 'efficiency'
              ? profile.bestEfficiency
              : profile.bestHashrate;
            tuningState.current.targetHashrate = targetResult?.hashrate ?? null;

            console.log(`[Auto-Tuner] Loaded benchmark profile for ${minerConfig.name || minerConfig.ip}:`,
              `Target ${targetSettings.frequency}MHz @ ${targetSettings.voltage}mV`);
          }
        }
        tuningState.current.benchmarkProfileLoaded = true;
      } catch (error) {
        console.error('[Auto-Tuner] Failed to load benchmark profile:', error);
        tuningState.current.benchmarkProfileLoaded = true; // Don't retry on error
      }
    }

    const now = Date.now();

    // Check if we need to verify a previous adjustment (with timeout protection)
    if (tuningState.current.verificationCheckScheduled) {
      const timeSinceScheduled = now - (tuningState.current.verificationCheckTime - (tunerSettings.verificationWaitSeconds * 1000));
      const MAX_VERIFICATION_AGE = 120000; // 2 minutes max

      // Verify if time has arrived OR if verification is too old (clock skew protection)
      if (now >= tuningState.current.verificationCheckTime || timeSinceScheduled > MAX_VERIFICATION_AGE) {
        await verifyHashrateChange(info);
      }
    }

    // Emergency temperature thresholds - allow bypassing cooldown for critical temps
    const EMERGENCY_TEMP_THRESHOLD = 75; // °C
    const EMERGENCY_VR_TEMP_THRESHOLD = 85; // °C
    const isEmergency = info.temp > EMERGENCY_TEMP_THRESHOLD || (info.vrTemp != null && info.vrTemp > EMERGENCY_VR_TEMP_THRESHOLD);

    if (!isEmergency && now - tuningState.current.lastAdjustmentTime < 60000) { // 60 seconds
        return;
    }

    // Low voltage safety check - if input voltage drops below 4.9V, reset to safe defaults
    const LOW_VOLTAGE_THRESHOLD = 4900; // mV
    const SAFE_FREQUENCY = 525; // MHz
    const SAFE_CORE_VOLTAGE = 1150; // mV

    if (info.voltage != null && info.voltage < LOW_VOLTAGE_THRESHOLD) {
        if (info.frequency !== SAFE_FREQUENCY || info.coreVoltage !== SAFE_CORE_VOLTAGE) {
            try {
                // Store current state before emergency reset
                tuningState.current.previousFrequency = info.frequency;
                tuningState.current.previousVoltage = info.coreVoltage;
                tuningState.current.hashrateBeforeChange = info.hashRate;

                await setMinerSettings(minerConfig.ip, SAFE_FREQUENCY, SAFE_CORE_VOLTAGE);
                tuningState.current.lastAdjustmentTime = Date.now();

                // Schedule verification check
                tuningState.current.verificationCheckScheduled = true;
                tuningState.current.verificationCheckTime = Date.now() + (tunerSettings.verificationWaitSeconds * 1000);

                toast({
                    variant: "destructive",
                    title: `Low Voltage Protection: ${minerConfig.name || minerConfig.ip}`,
                    description: `Input voltage ${(info.voltage / 1000).toFixed(1)}V below threshold. Reset to safe settings (F: ${SAFE_FREQUENCY}MHz, V: ${SAFE_CORE_VOLTAGE}mV)`,
                });
                // Reset tuning state
                tuningState.current = {
                    ...tuningState.current,
                    voltageStuckCycles: 0,
                    frequencyBoostActive: false,
                    lastAdjustmentTime: Date.now(),
                    verificationCheckScheduled: true,
                    verificationCheckTime: Date.now() + (tunerSettings.verificationWaitSeconds * 1000),
                    hashrateBeforeChange: info.hashRate,
                    previousFrequency: info.frequency,
                    previousVoltage: info.coreVoltage
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                toast({
                    variant: 'destructive',
                    title: `Low Voltage Protection Error: ${minerConfig.name || minerConfig.ip}`,
                    description: `Failed to apply safe settings: ${message}`,
                });
            }
            return; // Stop further tuning this cycle
        }
        return; // Already at safe settings, don't tune further
    }

    // Error spike detection - revert if ASIC errors increased significantly
    const ERROR_SPIKE_THRESHOLD = 50; // Errors per cycle
    const currentErrorCount = info.hashrateMonitor?.asics[0]?.errorCount || 0;
    const errorDelta = currentErrorCount - tuningState.current.previousErrorCount;

    if (tuningState.current.previousErrorCount > 0 && errorDelta > ERROR_SPIKE_THRESHOLD) {
        try {
            // Store current state before reverting
            const prevFreq = tuningState.current.previousFrequency || info.frequency;
            const prevVolt = tuningState.current.previousVoltage || info.coreVoltage;

            await setMinerSettings(minerConfig.ip, prevFreq, prevVolt);
            tuningState.current.lastAdjustmentTime = Date.now();

            toast({
                variant: "destructive",
                title: `Error Spike Detected: ${minerConfig.name || minerConfig.ip}`,
                description: `ASIC errors increased by ${errorDelta}. Reverted to F:${prevFreq}MHz, V:${prevVolt}mV`,
            });

            // Reset tuning state
            tuningState.current = {
                ...tuningState.current,
                voltageStuckCycles: 0,
                frequencyBoostActive: false,
                lastAdjustmentTime: Date.now(),
                previousErrorCount: currentErrorCount
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast({
                variant: 'destructive',
                title: `Error Spike Revert Failed: ${minerConfig.name || minerConfig.ip}`,
                description: `Failed to revert settings: ${message}`,
            });
        }
        return; // Stop further tuning this cycle
    }

    // Update error count tracking
    tuningState.current.previousErrorCount = currentErrorCount;

    const currentHashrateGHS = info.hashRate;

    tuningState.current.cycleCount++;

    const {
        targetTemp, vrTargetTemp, minFreq, maxFreq, minVolt, maxVolt,
        tempFreqStepDown, tempVoltStepDown, tempFreqStepUp, tempVoltStepUp,
        vrTempFreqStepDown, vrTempVoltStepDown,
        flatlineDetectionEnabled, flatlineHashrateRepeatCount,
        autoOptimizeEnabled, autoOptimizeTriggerCycles
    } = tunerSettings;

    const lastTemp = tuningState.current.lastTemp;
    tuningState.current.lastTemp = info.temp;

    // Check if tuner should unpause (temp moved outside ideal range or ambient spike detected)
    if (tuningState.current.tunerPaused) {
        const tempDiff = Math.abs(info.temp - targetTemp);
        const now = Date.now();

        // Ambient temperature spike detection while paused
        // Check every 5 minutes (20 cycles at 15s each) if temp has risen significantly since pause
        const AMBIENT_CHECK_INTERVAL = 300000; // 5 minutes in ms
        const AMBIENT_SPIKE_THRESHOLD = 3; // °C rise from pause temperature triggers unpause

        const timeSincePause = now - tuningState.current.pauseTime;
        const tempRiseSincePause = info.temp - tuningState.current.tempAtPause;

        if (tempDiff >= 2) {
            // Standard unpause: temp moved outside ideal range
            tuningState.current.tunerPaused = false;
        } else if (timeSincePause >= AMBIENT_CHECK_INTERVAL && tempRiseSincePause >= AMBIENT_SPIKE_THRESHOLD) {
            // Ambient spike detected: temp has risen significantly since we paused
            // This catches gradual ambient temp increases that push the miner hotter
            tuningState.current.tunerPaused = false;
            toast({
                title: `Auto-Tuner: ${minerConfig.name || minerConfig.ip}`,
                description: `Ambient temp rise detected (+${tempRiseSincePause.toFixed(1)}°C since pause). Resuming tuning.`,
            });
        }
        // Note: We no longer return early here - safety checks and auto-optimization
        // continue to run even when paused. Only temperature adjustments are skipped.
    }

    const VOLTAGE_STUCK_CHECK_CYCLES = 3;
    const HASHRATE_INCREASE_TOLERANCE_GHS = 0.1;

    // --- 1. Flatline Detection (Enhanced with Variance Check) ---
    // This safety check runs even when tuner is paused
    if (flatlineDetectionEnabled && history.length >= flatlineHashrateRepeatCount) {
        const lastNHashrates = history.slice(-flatlineHashrateRepeatCount).map(p => p.hashrate);
        const avg = lastNHashrates.reduce((sum, h) => sum + h, 0) / lastNHashrates.length;

        // Calculate standard deviation to detect low variance (stuck/oscillating hashrate)
        const variance = lastNHashrates.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / lastNHashrates.length;
        const stdDev = Math.sqrt(variance);

        // Trigger if hashrate is non-zero but has very low variation (<1 GH/s std dev)
        const FLATLINE_VARIANCE_THRESHOLD = 1.0; // GH/s

        if (avg > 0 && stdDev < FLATLINE_VARIANCE_THRESHOLD) {
            try {
                toast({
                    variant: "destructive",
                    title: `Auto-Tuner: Flatline Detected on ${minerConfig.name || minerConfig.ip}`,
                    description: `Hashrate stuck at ~${avg.toFixed(2)} GH/s (σ=${stdDev.toFixed(2)}). Restarting miner.`,
                });
                await restartMiner(minerConfig.ip);
                tuningState.current = { ...tuningState.current, cycleCount: 0, voltageStuckCycles: 0, frequencyBoostActive: false };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to restart miner';
                toast({ variant: 'destructive', title: `Restart Failed: ${minerConfig.name || minerConfig.ip}`, description: message });
            }
            return; // Stop further tuning this cycle
        }
    }

    // --- 2. Auto-Optimization ---
    // This runs even when tuner is paused to periodically optimize settings
    if (autoOptimizeEnabled && tuningState.current.cycleCount > 0 && tuningState.current.cycleCount % autoOptimizeTriggerCycles === 0) {
        const { settings: optimalSettings, reason } = analyzeAndDetermineBestSettings(history);
        if (optimalSettings && (optimalSettings.frequency !== info.frequency || optimalSettings.coreVoltage !== info.coreVoltage)) {
            try {
                // Store current state before optimization
                tuningState.current.previousFrequency = info.frequency;
                tuningState.current.previousVoltage = info.coreVoltage;
                tuningState.current.hashrateBeforeChange = currentHashrateGHS;

                await setMinerSettings(minerConfig.ip, optimalSettings.frequency, optimalSettings.coreVoltage);

                // Schedule verification check
                tuningState.current.verificationCheckScheduled = true;
                tuningState.current.verificationCheckTime = Date.now() + (tunerSettings.verificationWaitSeconds * 1000);

                toast({
                    title: `Auto-Optimizer: ${minerConfig.name || minerConfig.ip}`,
                    description: `(${reason}) Freq: ${optimalSettings.frequency}MHz, Volt: ${optimalSettings.coreVoltage}mV`,
                });
                // Reset state after optimization
                tuningState.current = {
                    ...tuningState.current,
                    voltageStuckCycles: 0,
                    frequencyBoostActive: false,
                    verificationCheckScheduled: true,
                    verificationCheckTime: Date.now() + (tunerSettings.verificationWaitSeconds * 1000),
                    hashrateBeforeChange: currentHashrateGHS,
                    previousFrequency: info.frequency,
                    previousVoltage: info.coreVoltage
                };
                return; // Stop further tuning this cycle
            } catch(error) {
                const message = error instanceof Error ? error.message : 'Optimization failed';
                toast({ variant: 'destructive', title: `Optimizer Error: ${minerConfig.name || minerConfig.ip}`, description: message });
            }
        } else if (reason) {
            console.log(`[Auto-Optimizer: ${minerConfig.name || minerConfig.ip}] ${reason}`);
        }
    }


    let new_freq = info.frequency;
    let new_volt = info.coreVoltage;
    let reason = "No action needed";

    const handleCoolOrIdeal = () => {
        let proposedChanges: {frequency?: number, voltage?: number} = {};
        tuningState.current.lastActionWasVoltIncrease = false;

        if (tuningState.current.frequencyBoostActive) {
            if (new_freq + tempFreqStepUp <= maxFreq) {
                proposedChanges.frequency = new_freq + tempFreqStepUp;
                reason = "Freq Boost Active, pushing freq";
            } else {
                reason = "Freq Boost Active, but at Max Freq";
            }
            if (currentHashrateGHS > (tuningState.current.lastHashrateBeforeFreqBoost + HASHRATE_INCREASE_TOLERANCE_GHS)) {
                tuningState.current.frequencyBoostActive = false;
                tuningState.current.voltageStuckCycles = 0;
                tuningState.current.lastHashrateBeforeFreqBoost = 0;
                reason += " - Resetting Freq Boost (Hashrate Increased)";
            }
            return proposedChanges;
        }
        
        if (tuningState.current.voltageStuckCycles >= VOLTAGE_STUCK_CHECK_CYCLES) {
            tuningState.current.frequencyBoostActive = true;
            tuningState.current.lastHashrateBeforeFreqBoost = currentHashrateGHS;
            if (new_freq + tempFreqStepUp <= maxFreq) {
                proposedChanges.frequency = new_freq + tempFreqStepUp;
                reason = "Voltage Stuck, initiating Freq Boost";
            } else {
                reason = "Voltage Stuck, but at Max Freq";
            }
            return proposedChanges;
        }

        if (new_freq + tempFreqStepUp <= maxFreq) {
            proposedChanges.frequency = new_freq + tempFreqStepUp;
            reason = "Increasing Freq";
            if (new_volt + tempVoltStepUp <= maxVolt) {
                proposedChanges.voltage = new_volt + tempVoltStepUp;
                reason += " and Volt";
            }
        } else if (new_volt + tempVoltStepUp <= maxVolt) {
            proposedChanges.voltage = new_volt + tempVoltStepUp;
            tuningState.current.lastActionWasVoltIncrease = true;
            reason = "Increasing Volt (Freq at Max)";
        } else {
            reason = "At Max Freq/Volt, no change";
        }
        
        return proposedChanges;
    };
    
    let proposedChanges: {frequency?: number, voltage?: number} = {};

    // --- 3. Temperature-Based Adjustments ---
    // Skip temperature adjustments if tuner is paused (but safety checks above still ran)
    if (tuningState.current.tunerPaused) {
        // Update hashrate tracking even when paused
        tuningState.current.lastHashrate = currentHashrateGHS;
        return; // Skip temperature-based adjustments while paused
    }

    if (info.vrTemp != null && info.vrTemp > vrTargetTemp) { // VRM HOT
        reason = `VRM Hot (${info.vrTemp.toFixed(1)}°C > ${vrTargetTemp.toFixed(1)}°C)`;
        // Reduce both frequency and voltage for faster cooling
        if (new_freq - vrTempFreqStepDown >= minFreq) {
            proposedChanges.frequency = new_freq - vrTempFreqStepDown;
        }
        if (new_volt - vrTempVoltStepDown >= minVolt) {
            proposedChanges.voltage = new_volt - vrTempVoltStepDown;
        }
    } else if (info.temp > targetTemp) { // CORE HOT
        reason = `Core Hot (${info.temp.toFixed(1)}°C > ${targetTemp.toFixed(1)}°C)`;
        // Reduce both frequency and voltage for faster cooling
        if (new_freq - tempFreqStepDown >= minFreq) {
            proposedChanges.frequency = new_freq - tempFreqStepDown;
        }
        if (new_volt - tempVoltStepDown >= minVolt) {
            proposedChanges.voltage = new_volt - tempVoltStepDown;
        }
    } else if (info.temp < targetTemp - 2) { // CORE COOL
        reason = `Core Cool (${info.temp.toFixed(1)}°C < ${(targetTemp-2).toFixed(1)}°C)`;

        // If benchmark profile is active and we have targets, move towards them
        if (tunerSettings.useBenchmarkProfile &&
            tuningState.current.targetFrequency !== null &&
            tuningState.current.targetVoltage !== null) {

          const targetFreq = tuningState.current.targetFrequency;
          const targetVolt = tuningState.current.targetVoltage;

          // Check if we're already at target
          if (info.frequency === targetFreq && info.coreVoltage === targetVolt) {
            reason = `At benchmark target (${targetFreq}MHz @ ${targetVolt}mV)`;
            proposedChanges = {}; // At target, no changes
          } else {
            // Move towards target settings
            if (info.frequency < targetFreq && new_freq + tempFreqStepUp <= maxFreq) {
              proposedChanges.frequency = Math.min(new_freq + tempFreqStepUp, targetFreq);
            } else if (info.frequency > targetFreq && new_freq - tempFreqStepDown >= minFreq) {
              proposedChanges.frequency = Math.max(new_freq - tempFreqStepDown, targetFreq);
            }

            if (info.coreVoltage < targetVolt && new_volt + tempVoltStepUp <= maxVolt) {
              proposedChanges.voltage = Math.min(new_volt + tempVoltStepUp, targetVolt);
            } else if (info.coreVoltage > targetVolt && new_volt - tempVoltStepDown >= minVolt) {
              proposedChanges.voltage = Math.max(new_volt - tempVoltStepDown, targetVolt);
            }

            reason = `Moving to benchmark target: ${targetFreq}MHz @ ${targetVolt}mV`;
          }
        } else {
          // Normal cool/idle behavior
          proposedChanges = handleCoolOrIdeal();
        }

        tuningState.current.tunerPaused = false;
    } else { // CORE IDEAL
        reason = `Core Ideal (${info.temp.toFixed(1)}°C), pausing tuner.`;
        // Only record pause temp/time when first entering paused state
        if (!tuningState.current.tunerPaused) {
            tuningState.current.tempAtPause = info.temp;
            tuningState.current.pauseTime = Date.now();
        }
        tuningState.current.tunerPaused = true;
        proposedChanges = {}; // No changes
    }

    if (tuningState.current.lastActionWasVoltIncrease) {
        if (Math.abs(currentHashrateGHS - tuningState.current.lastHashrate) < HASHRATE_INCREASE_TOLERANCE_GHS) {
            tuningState.current.voltageStuckCycles += 1;
            reason += ` (HR stuck: ${tuningState.current.voltageStuckCycles}/${VOLTAGE_STUCK_CHECK_CYCLES})`;
        } else {
            tuningState.current.voltageStuckCycles = 0;
        }
    } else {
        tuningState.current.voltageStuckCycles = 0;
    }
    tuningState.current.lastHashrate = currentHashrateGHS;


    const final_freq = proposedChanges.frequency !== undefined ? Math.max(minFreq, Math.min(maxFreq, proposedChanges.frequency)) : info.frequency;
    const final_volt = proposedChanges.voltage !== undefined ? Math.max(minVolt, Math.min(maxVolt, proposedChanges.voltage)) : info.coreVoltage;

    if (final_freq !== info.frequency || final_volt !== info.coreVoltage) {
        try {
            // Store current state before making changes
            tuningState.current.previousFrequency = info.frequency;
            tuningState.current.previousVoltage = info.coreVoltage;
            tuningState.current.hashrateBeforeChange = currentHashrateGHS;

            await setMinerSettings(minerConfig.ip, final_freq, final_volt);
            tuningState.current.lastAdjustmentTime = Date.now();

            // Schedule hashrate verification check
            tuningState.current.verificationCheckScheduled = true;
            tuningState.current.verificationCheckTime = Date.now() + (tunerSettings.verificationWaitSeconds * 1000);

            toast({
                title: `Auto-Tuner: ${minerConfig.name || minerConfig.ip}`,
                description: `(${reason}) Freq: ${final_freq.toFixed(0)}MHz, Volt: ${final_volt.toFixed(0)}mV`,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to apply settings';
            toast({
                variant: 'destructive',
                title: `Auto-Tuner Error: ${minerConfig.name || minerConfig.ip}`,
                description: `Failed to apply new settings: ${message}`,
            });
        }
    }
  }, [tunerSettings, minerConfig.ip, minerConfig.name, toast, analyzeAndDetermineBestSettings, verifyHashrateChange]);
  
  useEffect(() => {
    setIsMounted(true);
    // Reset tuning state if component unmounts/remounts or miner changes
    tuningState.current = {
        voltageStuckCycles: 0,
        frequencyBoostActive: false,
        lastHashrate: state.info?.hashRate || 0,
        lastActionWasVoltIncrease: false,
        lastHashrateBeforeFreqBoost: 0,
        cycleCount: 0,
        lastAdjustmentTime: 0,
        tunerPaused: false,
        lastTemp: 0,
        verificationCheckScheduled: false,
        verificationCheckTime: 0,
        hashrateBeforeChange: 0,
        previousFrequency: 0,
        previousVoltage: 0,
        previousErrorCount: state.info?.hashrateMonitor?.asics[0]?.errorCount || 0,
        tempAtPause: 0,
        pauseTime: 0,
        benchmarkActive: false,
        benchmarkProfileLoaded: false,
        targetFrequency: null,
        targetVoltage: null,
        targetHashrate: null,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minerConfig.ip]);

  // Listen for benchmark events to pause/resume auto-tuner
  useEffect(() => {
    let unlistenStart: (() => void) | undefined;
    let unlistenStop: (() => void) | undefined;

    const setup = async () => {
      try {
        unlistenStart = await listen<{ minerIp: string }>('benchmark-started', (event) => {
          if (event.payload.minerIp === minerConfig.ip) {
            console.log('[MinerCard] Benchmark started for', minerConfig.ip, '- pausing auto-tuner');
            tuningState.current.benchmarkActive = true;
          }
        });

        unlistenStop = await listen<{ minerIp: string }>('benchmark-stopped', (event) => {
          if (event.payload.minerIp === minerConfig.ip) {
            console.log('[MinerCard] Benchmark stopped for', minerConfig.ip, '- resuming auto-tuner');
            tuningState.current.benchmarkActive = false;
          }
        });
      } catch (error) {
        console.log('[MinerCard] Not running in Tauri environment');
      }
    };

    setup();

    return () => {
      unlistenStart?.();
      unlistenStop?.();
    };
  }, [minerConfig.ip]);
  
  useEffect(() => {
    if (state.info && state.history) {
        tuneMiner(state.info, state.history);
    }
  }, [state.info, state.history, tuneMiner]);

  const hashrateInGhs = state.info?.hashRate || 0;
  
  const hashrateDisplay = useMemo(() => {
    if (hashrateInGhs >= 1000) {
      // Convert to TH/s for high-power miners
      const valueInThs = hashrateInGhs / 1000;
      // Dynamic max scaling for different miner tiers:
      // - Standard BitAxe: up to 1.5 TH/s
      // - NerdAxeQ++, Magic Miner BG01/BG02: up to 7 TH/s
      // - Canaan Nano S and larger: up to 10+ TH/s
      let max: number;
      if (valueInThs <= 1.5) {
        max = 2;        // Small TH/s miners (standard BitAxe overclocked)
      } else if (valueInThs <= 3) {
        max = 4;        // Mid-range TH/s miners
      } else if (valueInThs <= 5) {
        max = 6;        // Higher-end miners like some Magic Miner models
      } else if (valueInThs <= 7) {
        max = 8;        // NerdAxeQ++, Magic Miner BG01/BG02
      } else if (valueInThs <= 10) {
        max = 12;       // Canaan Nano S range
      } else if (valueInThs <= 20) {
        max = 25;       // Larger miners
      } else {
        // For very high hashrates, round up to next 10 TH/s
        max = Math.ceil(valueInThs / 10) * 10 + 5;
      }
      return { value: valueInThs, unit: 'TH/s', isFloat: true, max };
    }
    // GH/s mode - also make max dynamic for better gauge utilization
    let max: number;
    if (hashrateInGhs <= 500) {
      max = 600;        // Low-power miners
    } else if (hashrateInGhs <= 800) {
      max = 1000;       // Standard BitAxe range
    } else {
      max = 1200;       // High-end GH/s range (approaching TH/s)
    }
    return { value: hashrateInGhs, unit: 'GH/s', isFloat: false, max };
  }, [hashrateInGhs]);

  const freq = state.info?.frequency ?? 0;
  const cardTitle = minerConfig.name || state.info?.hostname || minerConfig.ip;
  const cardDescription = minerConfig.name ? minerConfig.ip : (state.info?.hostname ? `v${state.info.boardVersion}` : '');

  // Calculate efficiency percentage (actual vs expected hashrate)
  // Uses device-reported expectedHashrate if available, otherwise falls back to estimated value
  const efficiencyData = useMemo(() => {
    if (!state.info?.hashRate) return null;

    // Prefer device-reported expectedHashrate, fall back to estimated
    const expectedHashrate = state.info.expectedHashrate || state.info.estimatedExpectedHashrate;
    const isEstimated = !state.info.expectedHashrate && !!state.info.estimatedExpectedHashrate;

    if (expectedHashrate && expectedHashrate > 0) {
      return {
        percent: ((state.info.hashRate / expectedHashrate) * 100).toFixed(1),
        isEstimated
      };
    }
    return null;
  }, [state.info?.hashRate, state.info?.expectedHashrate, state.info?.estimatedExpectedHashrate]);

  const efficiencyPercent = efficiencyData?.percent ?? null;

  // Calculate daily power cost
  const dailyPowerCost = useMemo(() => {
    if (!powerSettings?.showPowerCost || !state.info?.power) return null;
    // Power in W, convert to kW, multiply by 24 hours, multiply by rate
    const kWh = (state.info.power / 1000) * 24;
    return (kWh * powerSettings.electricityRate).toFixed(2);
  }, [state.info?.power, powerSettings?.showPowerCost, powerSettings?.electricityRate]);

  // Calculate efficiency in J/TH (Joules per Terahash)
  const joulesPerTH = useMemo(() => {
    if (!powerSettings?.showEfficiency || !state.info?.power || !state.info?.hashRate) return null;
    // Power in W (J/s), hashrate in GH/s
    // J/TH = (W * 1000) / (GH/s) = W / (TH/s)
    const hashrateInTH = state.info.hashRate / 1000;
    if (hashrateInTH <= 0) return null;
    return (state.info.power / hashrateInTH).toFixed(1);
  }, [state.info?.power, state.info?.hashRate, powerSettings?.showEfficiency]);

  const StatusBadge = useMemo(() => {
    if (state.loading && !state.info) {
      return <Badge variant="secondary">Connecting...</Badge>;
    }
    if (state.error) {
      return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Offline</Badge>;
    }
    return <Badge style={{ backgroundColor: `${minerConfig.accentColor}40`, color: minerConfig.accentColor }}><CheckCircle2 className="mr-1 h-3 w-3" />Online</Badge>;
  }, [state.loading, state.error, state.info, minerConfig.accentColor]);

  const isLoading = state.loading && !state.info;

  const animationClass = isMounted
    ? isRemoving ? 'animate-power-off' : 'animate-power-on'
    : '';
    
  const handleTunerSettingChange = (key: keyof AutoTunerSettings, value: string | boolean) => {
    const newTunerSettings = { ...tunerSettings, [key]: typeof value === 'string' ? parseFloat(value) : value };
    updateMiner({ ip: minerConfig.ip, tunerSettings: newTunerSettings });
  };

  return (
    <>
      <Card 
        className={cn(
          "flex flex-col shadow-inner shadow-black/20"
        )}
        style={{
          borderColor: minerConfig.accentColor,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground)/.1) 2px, hsl(var(--foreground)/.1) 4px)',
        }}>
        <Collapsible open={isCardOpen} onOpenChange={setIsCardOpen}>
          <CardHeader className="relative">
              <div className="flex items-start justify-between">
                  <div className='flex-1 flex items-center gap-4 relative'>
                      <div>
                          <CardTitle className="text-xl">
                              <GlitchText probability={0.1}>{cardTitle}</GlitchText>
                          </CardTitle>
                          <CardDescription>{cardDescription}</CardDescription>
                      </div>
                      <div className="share-animation-wrapper flex items-center min-h-[32px] min-w-[120px]" style={{ marginLeft: '4rem' }}>
                        {!isDetailsOpen && isCardOpen && <ShareAnimation trigger={animateShare} type={shareType} />}
                      </div>
                      {!isCardOpen && !isLoading && state.info && (
                          <div className="flex flex-col items-center">
                              <Badge variant="outline" className="flex items-center gap-1.5 whitespace-nowrap">
                                  <Zap className="h-3 w-3" style={{color: minerConfig.accentColor}}/>
                                  {hashrateDisplay.isFloat ? hashrateDisplay.value.toFixed(2) : hashrateDisplay.value.toFixed(0)} {hashrateDisplay.unit}
                              </Badge>
                              
                          </div>
                      )}
                  </div>
                  <div className="flex items-center gap-2 relative">
                      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Remove miner</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Miner?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove <strong>{minerConfig.name || minerConfig.ip}</strong>?
                              This will delete all saved settings including auto-tuner configuration. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                              onRemove(minerConfig.ip);
                              setIsRemoveDialogOpen(false);
                            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                  </div>
              </div>
              <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      {StatusBadge}
                      {group && (
                        <Badge
                          variant="outline"
                          className="text-xs gap-1"
                          style={{ borderColor: group.color, color: group.color }}
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                          {group.name}
                        </Badge>
                      )}
                      {efficiencyPercent && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                          title={efficiencyData?.isEstimated
                            ? `Estimated efficiency based on typical ${state.info?.ASICModel} specs`
                            : 'Efficiency based on device-reported expected hashrate'}
                        >
                          {efficiencyPercent}% eff{efficiencyData?.isEstimated && '~'}
                        </Badge>
                      )}
                      {(state.info?.blockFound === 1 || blockFoundCelebration) && (
                        <Badge className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black font-bold animate-pulse shadow-lg">
                          <Trophy className="h-3 w-3 mr-1 animate-bounce" />
                          BLOCK FOUND!
                        </Badge>
                      )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                      {/* Warning badge for closed/limited firmware */}
                      {deviceTuningInfo.warning && tunerSettings.enabled && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-yellow-500 hover:text-yellow-400">
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 text-sm">
                            <div className="space-y-2">
                              <p className="font-semibold text-yellow-500">Tuning Warning</p>
                              <p className="text-muted-foreground">{deviceTuningInfo.warning}</p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                      <Switch
                          id={`autotune-${minerConfig.ip}`}
                          checked={tunerSettings.enabled}
                          onCheckedChange={(checked) => handleTunerSettingChange('enabled', checked)}
                          disabled={deviceTuningInfo.capability === 'closed'}
                          />
                      <Label
                        htmlFor={`autotune-${minerConfig.ip}`}
                        className={cn("text-sm", deviceTuningInfo.capability === 'closed' && "text-muted-foreground")}
                      >
                        Auto-Tuner
                      </Label>
                          <Dialog open={isTunerSettingsOpen} onOpenChange={setIsTunerSettingsOpen}>
                              <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <Settings className={cn("h-4 w-4", tunerSettings.enabled && "animate-spin-slow")}/>
                                  </Button>
                              </DialogTrigger>
                              <DialogContent
                                  className="w-full max-w-[95vw] sm:max-w-lg md:max-w-2xl lg:max-w-4xl"
                                  style={{
                                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground)/.1) 2px, hsl(var(--foreground)/.1) 4px)',
                                  }}
                              >
                                  <DialogHeader>
                                      <DialogTitle>Auto-Tuner Settings</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                  {/* Device Profile Info */}
                                  <div className="rounded-lg border p-3 bg-muted/30">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-sm font-medium">Device Profile</p>
                                          <p className="text-xs text-muted-foreground">
                                            {deviceTuningInfo.profileName || 'Unknown Device'}
                                            {state.info?.ASICModel && ` (${state.info.ASICModel})`}
                                          </p>
                                        </div>
                                        <Badge
                                          variant={deviceTuningInfo.capability === 'full' ? 'default' :
                                                   deviceTuningInfo.capability === 'limited' ? 'secondary' :
                                                   deviceTuningInfo.capability === 'closed' ? 'destructive' : 'outline'}
                                        >
                                          {deviceTuningInfo.capability === 'full' ? 'Full Tuning' :
                                           deviceTuningInfo.capability === 'limited' ? 'Limited' :
                                           deviceTuningInfo.capability === 'closed' ? 'No Tuning' : 'Unknown'}
                                        </Badge>
                                      </div>
                                      {deviceTuningInfo.warning && (
                                        <p className="text-xs text-yellow-500 mt-2 flex items-center gap-1">
                                          <AlertTriangle className="h-3 w-3" />
                                          {deviceTuningInfo.warning}
                                        </p>
                                      )}
                                  </div>
                                  <div>
                                      <p className="text-sm text-muted-foreground">
                                      Fine-tune the automatic tuning algorithm. Settings are optimized for your {deviceTuningInfo.profileName || 'device'}.
                                      </p>
                                  </div>
                                  <ScrollArea className="h-[60vh] rounded-md border p-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                                  {Object.entries(tunerSettings).map(([key, value]) => {
                                      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                      const isSwitch = typeof value === 'boolean';

                                      // Special handling for benchmarkProfileMode dropdown
                                      if (key === 'benchmarkProfileMode') {
                                        const modeLabels: Record<string, string> = {
                                          'hashrate': 'Max Hashrate',
                                          'efficiency': 'Best Efficiency (J/TH)',
                                          'overclock': 'Overclock (Safe Temps)',
                                        };
                                        return (
                                          <div key={key} className="space-y-1">
                                            <Label htmlFor={`${key}-${minerConfig.ip}`} className="text-xs">{label}</Label>
                                            <Select
                                              value={value as string}
                                              onValueChange={(newValue) => handleTunerSettingChange(key as keyof AutoTunerSettings, newValue)}
                                              disabled={!tunerSettings.useBenchmarkProfile}
                                            >
                                              <SelectTrigger id={`${key}-${minerConfig.ip}`} className="h-8 text-sm">
                                                <SelectValue>
                                                  {modeLabels[value as string] || 'Select mode...'}
                                                </SelectValue>
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="hashrate">Max Hashrate</SelectItem>
                                                <SelectItem value="efficiency">Best Efficiency (J/TH)</SelectItem>
                                                <SelectItem value="overclock">Overclock (Safe Temps)</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        );
                                      }

                                      if (isSwitch) {
                                        return (
                                          <div key={key} className="flex items-center justify-between col-span-2 space-y-1">
                                              <Label htmlFor={`${key}-${minerConfig.ip}`} className="text-xs">{label}</Label>
                                              <Switch
                                                  id={`${key}-${minerConfig.ip}`}
                                                  checked={value}
                                                  onCheckedChange={(checked) => handleTunerSettingChange(key as keyof AutoTunerSettings, checked)}
                                                  />
                                          </div>
                                        )
                                      }
                                      return (
                                      <div key={key} className="space-y-1">
                                          <Label htmlFor={`${key}-${minerConfig.ip}`} className="text-xs">{label}</Label>
                                          <Input
                                          id={`${key}-${minerConfig.ip}`}
                                          type="number"
                                          value={typeof value === 'number' && !isNaN(value) ? value : ''}
                                          onChange={(e) => handleTunerSettingChange(key as keyof AutoTunerSettings, e.target.value)}
                                          className="h-8 text-sm"
                                          />
                                      </div>
                                      );
                                  })}
                                  </div>
                                  </ScrollArea>
                                  <DialogFooter>
                                      <Button onClick={() => setIsTunerSettingsOpen(false)}>Done</Button>
                                  </DialogFooter>
                                  </div>
                              </DialogContent>
                          </Dialog>
                          {/* Tools/Benchmark Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => openToolsWindow()}
                            title="Open Tools & Benchmark"
                          >
                            <Activity className="h-4 w-4" />
                          </Button>

                  </div>
              </div>
              <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background hover:bg-muted border">
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                </CollapsibleTrigger>
              </div>
          </CardHeader>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:h-0">
            {isCardOpen && (
              <CardContent className="pt-0">
                {/* Compact mode: smaller layout with key stats only */}
                {cardSize === 'compact' ? (
                  <div className="pt-4 pb-2">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold" style={{ color: minerConfig.accentColor }}>
                          {hashrateDisplay.isFloat ? hashrateDisplay.value.toFixed(2) : hashrateDisplay.value.toFixed(0)}
                        </p>
                        <p className="text-xs text-muted-foreground">{hashrateDisplay.unit}</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{state.info?.temp?.toFixed(0) ?? '--'}</p>
                        <p className="text-xs text-muted-foreground">°C</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{state.info?.power?.toFixed(0) ?? '--'}</p>
                        <p className="text-xs text-muted-foreground">W</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{freq}</p>
                        <p className="text-xs text-muted-foreground">MHz</p>
                      </div>
                    </div>
                    {state.error && !state.info && (
                      <div className="text-center text-muted-foreground pt-2">
                        <p className="text-sm">{state.error}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Normal/Expanded mode: full stat circles and details */}
                    <div className="grid grid-cols-2 gap-4 place-items-stretch pt-6">
                        <StatCircle value={hashrateDisplay.value} max={hashrateDisplay.max} label="Hashrate" unit={hashrateDisplay.unit} icon={Zap} accentColor={minerConfig.accentColor} formatAsFloat={hashrateDisplay.isFloat} />
                        <StatCircle value={freq} max={1000} label="Frequency" unit="MHz" icon={Gauge} accentColor={minerConfig.accentColor} />

                    {state.error && !state.info && (
                        <div className="col-span-2 text-center text-muted-foreground pt-4">
                            <p>{state.error}</p>
                        </div>
                    )}
                    </div>
                    <div className="px-6 pt-4 pb-4 flex flex-col items-center gap-y-4">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-4 w-full">
                            <StatItem icon={HeartPulse} label="Power" value={state.info?.power?.toFixed(2)} unit="W" loading={isLoading} />
                            {dailyPowerCost && (
                                <StatItem icon={Zap} label="Daily Cost" value={dailyPowerCost} unit={`${powerSettings?.currency || '$'}/day`} loading={isLoading} />
                            )}
                            {joulesPerTH && (
                                <StatItem icon={Gauge} label="Efficiency" value={joulesPerTH} unit="J/TH" loading={isLoading} />
                            )}
                            <StatItem icon={Zap} label="Input Voltage" value={state.info?.voltage ? (state.info.voltage / 1000).toFixed(1) : undefined} unit="V" loading={isLoading} />
                            <StatItem
                                icon={Zap}
                                label="Core Voltage"
                                value={state.info?.coreVoltageActual ? `${state.info.coreVoltageActual}/${state.info.coreVoltage}` : state.info?.coreVoltage}
                                unit="mV"
                                loading={isLoading}
                            />
                            <StatItem icon={Thermometer} label="Core Temp" value={state.info?.temp?.toFixed(1)} unit="°C" loading={isLoading} />
                            <StatItem icon={Thermometer} label="VRM Temp" value={state.info?.vrTemp?.toFixed(1)} unit="°C" loading={isLoading} />
                            {state.info?.hashrateMonitor?.asics[0]?.errorCount != null && (
                                <StatItem
                                    icon={AlertTriangle}
                                    label="ASIC Errors"
                                    value={state.info.hashrateMonitor.asics[0].errorCount.toString()}
                                    unit=""
                                    loading={isLoading}
                                />
                            )}
                        </div>
                    </div>
                  </>
                )}
                <div className="flex-grow" />
                {/* Show footer only in normal/expanded mode */}
                {cardSize !== 'compact' && (
                <CardFooter className="flex-col items-stretch p-0">
                <Separator />
                    <div className="flex justify-center items-center p-1">
                    <Button variant="ghost" className="w-full group text-muted-foreground" onClick={() => setIsDetailsOpen(!isDetailsOpen)}>
                        View Details
                        <ChevronDown className="h-4 w-4 ml-2 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </Button>
                    {state.history && state.history.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 mr-2" onClick={() => setIsChartDialogOpen(true)}>
                            <Expand className="h-4 w-4" />
                        </Button>
                    )}
                    </div>
                {isDetailsOpen && (
                    <div className="bg-muted/30 border-t p-4 text-sm space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold mb-2">Device Info</h4>
                            <div className="flex items-center gap-2"><Cpu className="h-4 w-4 text-muted-foreground" /><p>ASIC: {state.info?.ASICModel ?? 'N/A'}</p></div>
                            <div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-muted-foreground" /><p>AxeOS: {state.info?.axeOSVersion ?? 'N/A'}</p></div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Mining Stats</h4>
                            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /><p>Accepted: {state.info?.sharesAccepted ?? 'N/A'}</p></div>
                            <div className="flex items-center gap-2"><X className="h-4 w-4 text-red-500" /><p>Rejected: {state.info?.sharesRejected ?? 'N/A'}</p></div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Pool Info</h4>
                            <div className="flex items-center gap-2"><Server className="h-4 w-4 text-muted-foreground" /><p>Difficulty: {state.info?.poolDifficulty ?? 'N/A'}</p></div>
                            <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" /><p>Best Diff: {state.info?.bestDiff ?? 'N/A'}</p></div>
                            <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" /><p>Session Best: {state.info?.bestSessionDiff ?? 'N/A'}</p></div>
                        </div>
                        <div className="relative flex items-center justify-center min-h-[80px] share-animation-wrapper">
                            {isDetailsOpen && <ShareAnimation trigger={animateShare} type={shareType} />}
                        </div>
                        {state.info?.hashrateMonitor?.asics[0] && (
                          <div className="col-span-2">
                            <h4 className="font-semibold mb-2">ASIC Performance</h4>
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              {state.info.hashrateMonitor.asics[0].domains.map((domain, idx) => (
                                <div key={idx} className="bg-background/50 p-2 rounded">
                                  <p className="text-muted-foreground">Core {idx + 1}</p>
                                  <p className="font-mono">{domain.toFixed(1)} GH/s</p>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              Total Errors: {state.info.hashrateMonitor.asics[0].errorCount}
                            </div>
                          </div>
                        )}
                        </div>

                        {state.history && state.history.length > 1 ? (
                            <div className="p-4 bg-background/50 rounded-lg">
                                <MinerChart history={state.history} />
                            </div>
                        ) : (
                            <div className="p-10 text-center text-sm text-muted-foreground">
                                <p>{isLoading ? 'Awaiting more data for chart...' : 'Not enough data to display chart.'}</p>
                            </div>
                        )}
                    </div>
                )}
            </CardFooter>
                )}
            </CardContent>
            )}
          </CollapsibleContent>
      </Collapsible>
      </Card>
      <Dialog open={isChartDialogOpen} onOpenChange={setIsChartDialogOpen}>
          <DialogContent className="w-full max-w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-6xl" aria-describedby="chart-dialog-description">
              <DialogHeader>
                  <DialogTitle>Performance Chart: {cardTitle}</DialogTitle>
              </DialogHeader>
              <p id="chart-dialog-description" className="sr-only">This chart displays the miner's hashrate and temperature over time.</p>
              <div className="h-full w-full">
                <MinerChart history={state.history || []} />
              </div>
          </DialogContent>
      </Dialog>
    </>
  );
}

interface PowerSettings {
  electricityRate: number;
  currency: string;
  showPowerCost: boolean;
  showEfficiency: boolean;
}

interface MinerCardProps {
  minerConfig: MinerConfig;
  onRemove: (ip: string) => void;
  isRemoving: boolean;
  state: MinerState;
  updateMiner: (miner: Partial<MinerConfig> & { ip: string }) => void;
  powerSettings?: PowerSettings;
  cardSize?: 'compact' | 'normal' | 'expanded';
  group?: { id: string; name: string; color: string };
}
