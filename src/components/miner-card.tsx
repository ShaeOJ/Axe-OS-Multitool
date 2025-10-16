

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
import { Zap, Thermometer, Gauge, HeartPulse, Trash2, ChevronDown, AlertCircle, CheckCircle2, Cpu, Hash, Check, X, Server, GitBranch, Settings, Power, Expand } from 'lucide-react';
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
import { ShareAnimation } from './share-animation';
import { getMinerData, restartMiner as restartMinerTauri, updateMinerSettings } from '@/lib/tauri-api';


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

export function MinerCard({ minerConfig, onRemove, isRemoving, state, updateMiner }: MinerCardProps) {
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
  const prevAcceptedSharesRef = useRef<number>();
  const prevRejectedSharesRef = useRef<number>();

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

    prevAcceptedSharesRef.current = currentAcceptedShares;
    prevRejectedSharesRef.current = currentRejectedShares;
  }, [state.info?.sharesAccepted, state.info?.sharesRejected]);

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

    const tempTolerance = 2.0; // Use a small tolerance for finding points in the ideal temp range
    const validPoints = history.filter(p => 
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
    const HASHRATE_DROP_THRESHOLD = 100; // GH/s
    const HASHRATE_INCREASE_MIN = 1; // GH/s

    const currentHashrate = info.hashRate || 0;
    const hashrateDiff = currentHashrate - tuningState.current.hashrateBeforeChange;

    // If hashrate dropped significantly, revert to previous settings
    if (hashrateDiff < -HASHRATE_DROP_THRESHOLD) {
      try {
        await setMinerSettings(
          minerConfig.ip,
          tuningState.current.previousFrequency,
          tuningState.current.previousVoltage
        );
        toast({
          variant: "destructive",
          title: `Auto-Tuner: Reverted ${minerConfig.name || minerConfig.ip}`,
          description: `Hashrate dropped ${Math.abs(hashrateDiff).toFixed(1)} GH/s. Reverted to F:${tuningState.current.previousFrequency}MHz, V:${tuningState.current.previousVoltage}mV`,
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
    if (!tunerSettings.enabled || info.temp == null || info.vrTemp == null || info.frequency == null || info.coreVoltage == null || info.hashRate == null) {
        return;
    }

    const now = Date.now();

    // Check if we need to verify a previous adjustment
    if (tuningState.current.verificationCheckScheduled && now >= tuningState.current.verificationCheckTime) {
      await verifyHashrateChange(info);
    }
    if (now - tuningState.current.lastAdjustmentTime < 60000) { // 60 seconds
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

    if (tuningState.current.tunerPaused) {
        // Unpause if temp moves outside the ideal range (either hotter or cooler)
        const tempDiff = Math.abs(info.temp - targetTemp);
        if (tempDiff >= 2) {
            tuningState.current.tunerPaused = false;
        } else {
            return; // Still in ideal range, stay paused
        }
    }
    
    const VOLTAGE_STUCK_CHECK_CYCLES = 3;
    const HASHRATE_INCREASE_TOLERANCE_GHS = 0.1;

    // --- 1. Flatline Detection ---
    if (flatlineDetectionEnabled && history.length >= flatlineHashrateRepeatCount) {
        const lastNHashrates = history.slice(-flatlineHashrateRepeatCount).map(p => p.hashrate);
        const firstHashrate = lastNHashrates[0];
        if (firstHashrate > 0 && lastNHashrates.every(h => h === firstHashrate)) {
            try {
                toast({
                    variant: "destructive",
                    title: `Auto-Tuner: Flatline Detected on ${minerConfig.name || minerConfig.ip}`,
                    description: `Hashrate stuck at ${firstHashrate.toFixed(2)} GH/s. Restarting miner.`,
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

    if (info.vrTemp > vrTargetTemp) { // VRM HOT
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
        proposedChanges = handleCoolOrIdeal();
        tuningState.current.tunerPaused = false;
    } else { // CORE IDEAL
        reason = `Core Ideal (${info.temp.toFixed(1)}°C), pausing tuner.`;
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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minerConfig.ip]);
  
  useEffect(() => {
    if (state.info && state.history) {
        tuneMiner(state.info, state.history);
    }
  }, [state.info, state.history, tuneMiner]);

  const hashrateInGhs = state.info?.hashRate || 0;
  
  const hashrateDisplay = useMemo(() => {
    if (hashrateInGhs >= 1000) {
      return { value: hashrateInGhs / 1000, unit: 'TH/s', isFloat: true, max: 3 };
    }
    return { value: hashrateInGhs, unit: 'GH/s', isFloat: false, max: 3000 };
  }, [hashrateInGhs]);

  const freq = state.info?.frequency ?? 0;
  const cardTitle = minerConfig.name || state.info?.hostname || minerConfig.ip;
  const cardDescription = minerConfig.name ? minerConfig.ip : (state.info?.hostname ? `v${state.info.boardVersion}` : '');


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
                  </div>
                  
                  <div className="flex items-center gap-2">
                      <Switch 
                          id={`autotune-${minerConfig.ip}`} 
                          checked={tunerSettings.enabled}
                          onCheckedChange={(checked) => handleTunerSettingChange('enabled', checked)}
                          />
                      <Label htmlFor={`autotune-${minerConfig.ip}`} className="text-sm">Auto-Tuner</Label>
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
                                  <div>
                                      <p className="text-sm text-muted-foreground">
                                      Fine-tune the automatic tuning algorithm.
                                      </p>
                                  </div>
                                  <ScrollArea className="h-[60vh] rounded-md border p-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                                  {Object.entries(tunerSettings).map(([key, value]) => {
                                      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                      const isSwitch = typeof value === 'boolean';
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
                        <StatItem icon={Zap} label="Input Voltage" value={state.info?.voltage ? (state.info.voltage / 1000).toFixed(1) : undefined} unit="V" loading={isLoading} />
                        <StatItem icon={Zap} label="Core Voltage" value={state.info?.coreVoltage} unit="mV" loading={isLoading} />
                        <StatItem icon={Thermometer} label="Core Temp" value={state.info?.temp?.toFixed(1)} unit="°C" loading={isLoading} />
                        <StatItem icon={Thermometer} label="VRM Temp" value={state.info?.vrTemp?.toFixed(1)} unit="°C" loading={isLoading} />
                    </div>
                </div>
                <div className="flex-grow" />
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

interface MinerCardProps {
  minerConfig: MinerConfig;
  onRemove: (ip: string) => void;
  isRemoving: boolean;
  state: MinerState;
  updateMiner: (miner: Partial<MinerConfig> & { ip: string }) => void;
}
