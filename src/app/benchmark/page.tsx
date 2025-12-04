'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { listen, emit } from '@tauri-apps/api/event';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play,
  Square,
  Activity,
  Thermometer,
  Zap,
  Clock,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Settings2,
  BarChart3,
  Save,
  FileCheck,
  History,
} from 'lucide-react';
import Link from 'next/link';
import type { MinerConfig, MinerState, MinerInfo } from '@/lib/types';
import { getMinerData } from '@/lib/tauri-api';
import {
  MinerBenchmark,
  BENCHMARK_CONFIG,
  formatDuration,
  formatEfficiency,
  getStopReasonMessage,
  initBenchmarkEvents,
  type BenchmarkMode,
  type BenchmarkProgress,
  type BenchmarkSample,
  type BenchmarkResult,
  type BenchmarkSummary,
} from '@/lib/benchmark';
import { getDeviceProfile } from '@/lib/asic-presets';
import {
  saveBenchmarkProfile,
  getBenchmarkProfile,
  createProfileFromSummary,
  formatProfileSummary,
} from '@/lib/benchmark-profiles';
import { addBenchmarkToHistory, getMinerBenchmarkHistory } from '@/lib/benchmark-history';
import { BenchmarkHistoryDialog } from '@/components/benchmark-history-dialog';
import type { BenchmarkProfile, BenchmarkHistoryEntry } from '@/lib/types';

interface ToolsData {
  miners: MinerConfig[];
  minerStates: Record<string, MinerState>;
}

export default function BenchmarkPage() {
  // Data from main window
  const [data, setData] = useState<ToolsData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Benchmark configuration
  const [selectedMiner, setSelectedMiner] = useState<string>('');
  const [preselectedMiner, setPreselectedMiner] = useState<string | null>(null); // Miner passed from miner card
  const [benchmarkMode, setBenchmarkMode] = useState<BenchmarkMode>('optimize');
  const [initialVoltage, setInitialVoltage] = useState(BENCHMARK_CONFIG.defaultVoltage);
  const [initialFrequency, setInitialFrequency] = useState(BENCHMARK_CONFIG.defaultFrequency);

  // Benchmark state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BenchmarkProgress | null>(null);
  const [samples, setSamples] = useState<BenchmarkSample[]>([]);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile state
  const [existingProfile, setExistingProfile] = useState<BenchmarkProfile | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);

  // Direct miner info for preselected miners (when event system doesn't work)
  const [directMinerInfo, setDirectMinerInfo] = useState<MinerInfo | null>(null);

  // Benchmark instance ref
  const benchmarkRef = useRef<MinerBenchmark | null>(null);

  // Check for miner query parameter on mount and fetch miner data directly
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const minerIp = params.get('miner');
      if (minerIp) {
        setPreselectedMiner(minerIp);
        setSelectedMiner(minerIp);

        // Fetch miner data directly since event system between windows may not work
        getMinerData(minerIp)
          .then((info) => {
            setDirectMinerInfo(info);
            setIsConnected(true);
            // Set initial values from direct fetch
            if (info.coreVoltage) setInitialVoltage(info.coreVoltage);
            if (info.frequency) setInitialFrequency(info.frequency);
          })
          .catch((err) => {
            console.error('Failed to fetch miner data directly:', err);
          });
      }
    }
  }, []);

  // Request data from main window
  const requestData = useCallback(async () => {
    try {
      await emit('tools-request-data');
    } catch (error) {
      console.error('Failed to request data:', error);
    }
  }, []);

  // Listen for data from main window and select-miner events
  useEffect(() => {
    let unlistenData: (() => void) | undefined;
    let unlistenSelectMiner: (() => void) | undefined;

    const setup = async () => {
      // Initialize benchmark events for auto-tuner communication
      await initBenchmarkEvents();

      unlistenData = await listen<ToolsData>('tools-data-update', (event) => {
        setData(event.payload);
        setIsConnected(true);
      });

      // Listen for select-miner event (when clicking benchmark on another miner card while window is open)
      unlistenSelectMiner = await listen<string>('select-miner', (event) => {
        const minerIp = event.payload;
        if (minerIp && !isRunning) {
          setPreselectedMiner(minerIp);
          setSelectedMiner(minerIp);
        }
      });

      // Request initial data
      await requestData();
    };

    setup();

    return () => {
      unlistenData?.();
      unlistenSelectMiner?.();
    };
  }, [requestData, isRunning]);

  // Get available miners
  const availableMiners = data?.miners.filter(m => {
    const state = data.minerStates[m.ip];
    return state?.info && !state.error;
  }) ?? [];

  // Auto-select first miner if none selected (only if not preselected from miner card)
  useEffect(() => {
    if (!selectedMiner && !preselectedMiner && availableMiners.length > 0) {
      setSelectedMiner(availableMiners[0].ip);
    }
  }, [availableMiners, selectedMiner, preselectedMiner]);

  // Update initial values and load existing profile when miner is selected
  useEffect(() => {
    if (selectedMiner && data) {
      const state = data.minerStates[selectedMiner];
      if (state?.info) {
        setInitialVoltage(state.info.coreVoltage ?? BENCHMARK_CONFIG.defaultVoltage);
        setInitialFrequency(state.info.frequency ?? BENCHMARK_CONFIG.defaultFrequency);
      }

      // Load existing profile for this miner
      getBenchmarkProfile(selectedMiner).then(profile => {
        setExistingProfile(profile);
        setProfileSaved(false);
      });

      // Load history count
      getMinerBenchmarkHistory(selectedMiner).then(entries => {
        setHistoryCount(entries.length);
      });
    }
  }, [selectedMiner, data]);

  // Start benchmark
  const handleStart = async () => {
    if (!selectedMiner) return;

    // When preselected from miner card, we may not have full data yet
    // Use the IP directly in that case
    const miner = data?.miners.find(m => m.ip === selectedMiner);
    const minerName = miner?.name || selectedMinerConfig?.name || selectedMiner;

    setIsRunning(true);
    setError(null);
    setSamples([]);
    setResults([]);
    setSummary(null);
    setProgress(null);

    const benchmark = new MinerBenchmark(
      selectedMiner,
      minerName,
      benchmarkMode,
      {
        onProgress: (p) => setProgress(p),
        onSample: (s) => setSamples(prev => [...prev, s]),
        onIterationComplete: (r) => setResults(prev => [...prev, r]),
        onComplete: (s) => {
          setSummary(s);
          setIsRunning(false);
        },
        onError: (e) => {
          setError(e);
          setIsRunning(false);
        },
      }
    );

    benchmarkRef.current = benchmark;

    try {
      await benchmark.start(initialVoltage, initialFrequency);
    } catch (err) {
      console.error('[Benchmark] Start error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Failed to start benchmark - check miner connection');
      setIsRunning(false);
    }
  };

  // Stop benchmark
  const handleStop = () => {
    benchmarkRef.current?.stop();
  };

  // Save benchmark profile (saves to both current profile and history)
  const handleSaveProfile = async () => {
    if (!summary || !selectedMinerInfo) return;

    const profile = createProfileFromSummary(summary, {
      hostname: selectedMinerInfo.hostname,
      ASICModel: selectedMinerInfo.ASICModel,
    });

    // Save as current profile for auto-tuner
    await saveBenchmarkProfile(profile);
    setExistingProfile(profile);

    // Also save to history
    await addBenchmarkToHistory(profile);
    setHistoryCount(prev => prev + 1);

    setProfileSaved(true);
  };

  // Get selected miner info - use direct fetch as fallback for preselected miners
  const selectedMinerInfo = (selectedMiner && data ? data.minerStates[selectedMiner]?.info : null) || directMinerInfo;
  const selectedMinerConfig = selectedMiner && data ? data.miners.find(m => m.ip === selectedMiner) : null;

  // Detect if selected miner is a multi-chip 12V device
  const deviceProfile = selectedMinerInfo
    ? getDeviceProfile(selectedMinerInfo.hostname, selectedMinerInfo.ASICModel)
    : null;
  const isMultiChip = (deviceProfile?.chipCount ?? 1) > 1;
  const effectiveMaxPower = isMultiChip ? BENCHMARK_CONFIG.maxPower12V : BENCHMARK_CONFIG.maxPower;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/tools">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Hashrate Benchmark</h1>
              <p className="text-sm text-muted-foreground">
                Find optimal voltage and frequency settings for your miner
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

        {/* Disclaimer */}
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-500">Disclaimer</p>
                <p className="text-muted-foreground mt-1">
                  This tool will stress test your miner at various voltages and frequencies.
                  While safety limits are in place, running hardware outside standard parameters carries risks.
                  Use at your own risk. Ambient temperature affects results - re-run if conditions change.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Configuration
              </CardTitle>
              <CardDescription>
                Select miner and benchmark settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Miner Selection */}
              <div className="space-y-2">
                <Label>Select Miner</Label>
                <Select
                  value={selectedMiner}
                  onValueChange={setSelectedMiner}
                  disabled={isRunning || !!preselectedMiner}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a miner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* When preselected, only show the preselected miner */}
                    {preselectedMiner ? (
                      <SelectItem value={preselectedMiner}>
                        {selectedMinerConfig?.name || preselectedMiner}
                      </SelectItem>
                    ) : (
                      availableMiners.map(miner => (
                        <SelectItem key={miner.ip} value={miner.ip}>
                          {miner.name || miner.ip}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {preselectedMiner && (
                  <p className="text-xs text-muted-foreground">
                    Miner selected from dashboard. Close window to select a different miner.
                  </p>
                )}
                {selectedMinerInfo && (
                  <p className="text-xs text-muted-foreground">
                    Current: {selectedMinerInfo.frequency}MHz @ {selectedMinerInfo.coreVoltage}mV
                    {selectedMinerInfo.hashRate && ` • ${selectedMinerInfo.hashRate.toFixed(0)} GH/s`}
                  </p>
                )}
                {existingProfile && (
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                    <FileCheck className="h-3 w-3" />
                    <span>Saved profile: {formatProfileSummary(existingProfile)}</span>
                  </div>
                )}
                {/* History Button */}
                {selectedMiner && historyCount > 0 && (
                  <BenchmarkHistoryDialog
                    minerIp={selectedMiner}
                    minerName={selectedMinerConfig?.name || selectedMiner}
                    trigger={
                      <Button variant="outline" size="sm" className="w-full mt-2" disabled={isRunning}>
                        <History className="h-4 w-4 mr-2" />
                        View History ({historyCount} runs)
                      </Button>
                    }
                  />
                )}
              </div>

              {/* Benchmark Mode */}
              <div className="space-y-2">
                <Label>Benchmark Mode</Label>
                <Select
                  value={benchmarkMode}
                  onValueChange={(v) => setBenchmarkMode(v as BenchmarkMode)}
                  disabled={isRunning}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">Quick Test (current settings)</SelectItem>
                    <SelectItem value="overclock">Overclock (max stable within safe temps)</SelectItem>
                    <SelectItem value="optimize">Full Optimization (max hashrate)</SelectItem>
                    <SelectItem value="efficiency">Efficiency Mode (best J/TH)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {benchmarkMode === 'quick' && 'Test stability of current settings (~10 min)'}
                  {benchmarkMode === 'overclock' && 'Find maximum stable overclock within safe temps (~15-30 min)'}
                  {benchmarkMode === 'optimize' && 'Find maximum hashrate settings (may take 30+ min)'}
                  {benchmarkMode === 'efficiency' && 'Find most efficient settings (may take 30+ min)'}
                </p>
              </div>

              {/* Starting Values */}
              {benchmarkMode !== 'quick' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Voltage (mV)</Label>
                    <Input
                      type="number"
                      value={initialVoltage}
                      onChange={(e) => setInitialVoltage(parseInt(e.target.value) || BENCHMARK_CONFIG.defaultVoltage)}
                      min={BENCHMARK_CONFIG.minVoltage}
                      max={BENCHMARK_CONFIG.maxVoltage}
                      step={BENCHMARK_CONFIG.voltageIncrement}
                      disabled={isRunning}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Frequency (MHz)</Label>
                    <Input
                      type="number"
                      value={initialFrequency}
                      onChange={(e) => setInitialFrequency(parseInt(e.target.value) || BENCHMARK_CONFIG.defaultFrequency)}
                      min={BENCHMARK_CONFIG.minFrequency}
                      max={BENCHMARK_CONFIG.maxFrequency}
                      step={BENCHMARK_CONFIG.frequencyIncrement}
                      disabled={isRunning}
                    />
                  </div>
                </div>
              )}

              {/* Safety Limits Display */}
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-xs font-medium mb-2">
                  {benchmarkMode === 'overclock' ? 'Overclock Limits' : 'Safety Limits'}
                  {isMultiChip && <span className="ml-2 text-primary">(12V Multi-chip)</span>}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {benchmarkMode === 'overclock' ? (
                    <>
                      <span>Target Chip Temp:</span>
                      <span>{BENCHMARK_CONFIG.targetChipTemp}°C</span>
                      <span>Target VR Temp:</span>
                      <span>{BENCHMARK_CONFIG.targetVrTemp}°C</span>
                      <span>Max Power:</span>
                      <span>{effectiveMaxPower}W</span>
                      <span>Test Duration:</span>
                      <span>{BENCHMARK_CONFIG.overclockTestDuration / 60} min/test</span>
                    </>
                  ) : (
                    <>
                      <span>Max Chip Temp:</span>
                      <span>{BENCHMARK_CONFIG.maxChipTemp}°C</span>
                      <span>Max VR Temp:</span>
                      <span>{BENCHMARK_CONFIG.maxVrTemp}°C</span>
                      <span>Max Power:</span>
                      <span>{effectiveMaxPower}W</span>
                      <span>Test Duration:</span>
                      <span>{BENCHMARK_CONFIG.benchmarkDuration / 60} min/test</span>
                    </>
                  )}
                </div>
              </div>

              {/* Start/Stop Button */}
              <div className="pt-2">
                {!isRunning ? (
                  <Button
                    className="w-full"
                    onClick={handleStart}
                    disabled={!selectedMiner || (!preselectedMiner && availableMiners.length === 0)}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Benchmark
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={handleStop}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Stop Benchmark
                  </Button>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Progress
              </CardTitle>
              <CardDescription>
                {progress?.message || 'Waiting to start...'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress?.percentComplete.toFixed(0) ?? 0}%</span>
                </div>
                <Progress value={progress?.percentComplete ?? 0} />
              </div>

              {/* Current Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{progress?.currentHashrate.toFixed(0) ?? '--'}</p>
                  <p className="text-xs text-muted-foreground">GH/s</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Thermometer className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                  <p className="text-lg font-bold">{progress?.currentTemp.toFixed(0) ?? '--'}</p>
                  <p className="text-xs text-muted-foreground">°C</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Zap className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                  <p className="text-lg font-bold">{progress?.currentPower.toFixed(1) ?? '--'}</p>
                  <p className="text-xs text-muted-foreground">W</p>
                </div>
              </div>

              {/* Current Settings */}
              {progress && (
                <div className="flex justify-center gap-4">
                  <Badge variant="outline">
                    {progress.currentFrequency} MHz
                  </Badge>
                  <Badge variant="outline">
                    {progress.currentVoltage} mV
                  </Badge>
                </div>
              )}

              {/* Sample Count */}
              {progress && (
                <div className="text-center text-sm text-muted-foreground">
                  Sample {progress.currentSample} of {progress.totalSamples}
                  {progress.currentIteration > 0 && ` • Iteration ${progress.currentIteration}`}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {(results.length > 0 || summary) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Results
              </CardTitle>
              {summary && (
                <CardDescription className="flex items-center gap-2">
                  {summary.stopReason === 'completed' || summary.stopReason === 'max_frequency_reached' || summary.stopReason === 'max_voltage_reached' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                  {getStopReasonMessage(summary.stopReason)}
                  {' • '}
                  Duration: {formatDuration(summary.duration)}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="top">
                <TabsList className="mb-4">
                  <TabsTrigger value="top">Top Hashrate</TabsTrigger>
                  <TabsTrigger value="efficient">Most Efficient</TabsTrigger>
                  <TabsTrigger value="all">All Results</TabsTrigger>
                </TabsList>

                <TabsContent value="top">
                  <ResultsTable
                    results={summary?.topPerformers ?? results.slice().sort((a, b) => b.averageHashrate - a.averageHashrate).slice(0, 5)}
                    highlight="hashrate"
                  />
                </TabsContent>

                <TabsContent value="efficient">
                  <ResultsTable
                    results={summary?.mostEfficient ?? results.slice().sort((a, b) => a.efficiencyJTH - b.efficiencyJTH).slice(0, 5)}
                    highlight="efficiency"
                  />
                </TabsContent>

                <TabsContent value="all">
                  <ScrollArea className="h-[300px]">
                    <ResultsTable results={results} />
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              {/* Applied Settings */}
              {summary?.appliedSettings && (
                <div className="mt-4 p-4 rounded-lg border border-green-500/50 bg-green-500/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Settings Applied</p>
                      <p className="text-sm text-muted-foreground">
                        {summary.appliedSettings.frequency} MHz @ {summary.appliedSettings.voltage} mV
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Profile Button */}
              {summary && results.length > 0 && (
                <div className="mt-4">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={profileSaved}
                    className="w-full"
                    variant={profileSaved ? "outline" : "default"}
                  >
                    {profileSaved ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                        Profile Saved for Auto-Tuner
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Profile for Auto-Tuner
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {profileSaved
                      ? "Enable 'Use Benchmark Profile' in Auto-Tuner settings to apply these optimal settings"
                      : "Save benchmark results to use with the auto-tuner for this miner"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Results Table Component
function ResultsTable({
  results,
  highlight,
}: {
  results: BenchmarkResult[];
  highlight?: 'hashrate' | 'efficiency';
}) {
  if (results.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No results yet
      </p>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">#</th>
            <th className="px-4 py-2 text-left font-medium">Frequency</th>
            <th className="px-4 py-2 text-left font-medium">Voltage</th>
            <th className="px-4 py-2 text-left font-medium">Hashrate</th>
            <th className="px-4 py-2 text-left font-medium">Temp</th>
            <th className="px-4 py-2 text-left font-medium">Efficiency</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <tr
              key={`${result.frequency}-${result.coreVoltage}-${index}`}
              className={`border-t ${index === 0 && highlight ? 'bg-primary/5' : ''}`}
            >
              <td className="px-4 py-2">
                {index === 0 && highlight ? (
                  <Award className="h-4 w-4 text-primary" />
                ) : (
                  index + 1
                )}
              </td>
              <td className="px-4 py-2">{result.frequency} MHz</td>
              <td className="px-4 py-2">{result.coreVoltage} mV</td>
              <td className="px-4 py-2 font-medium">
                {result.averageHashrate.toFixed(1)} GH/s
              </td>
              <td className="px-4 py-2">
                {result.averageChipTemp.toFixed(1)}°C
                {result.averageVrTemp && (
                  <span className="text-muted-foreground"> / {result.averageVrTemp.toFixed(1)}°C</span>
                )}
              </td>
              <td className="px-4 py-2">
                {formatEfficiency(result.efficiencyJTH)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
